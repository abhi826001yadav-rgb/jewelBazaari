import { auth } from './firebase-config.js';
import { shouldUseRedirectAuth } from './device-utils.js';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export { auth };

const POPUP_FALLBACK_CODES = new Set([
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/operation-not-supported-in-this-environment'
]);

let persistenceConfigured = false;
let persistencePromise = null;

/**
 * Configure persistence only after redirect result is consumed.
 * Calling setPersistence before getRedirectResult breaks Safari/iOS redirect completion.
 */
export function ensureAuthPersistence() {
    if (persistenceConfigured) {
        return persistencePromise || Promise.resolve();
    }

    persistencePromise = (async () => {
        try {
            await setPersistence(auth, browserLocalPersistence);
        } catch {
            try {
                await setPersistence(auth, browserSessionPersistence);
            } catch {
                // initializeAuth() in firebase-config.js already selects the best fallback.
            }
        } finally {
            persistenceConfigured = true;
        }
    })();

    return persistencePromise;
}

async function waitForRedirectUser(maxAttempts = 20, delayMs = 150) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (auth.currentUser) {
            return auth.currentUser;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return auth.currentUser;
}

async function resolveRedirectResultInternal() {
    let result = null;

    // CRITICAL (Safari/iOS): getRedirectResult must be the first auth operation on page load.
    // Do not call authStateReady() or setPersistence() before this.
    try {
        result = await getRedirectResult(auth);
    } catch (error) {
        console.warn('Google redirect result could not be restored:', error);
    }

    await ensureAuthPersistence();
    await auth.authStateReady();

    const user = result?.user || await waitForRedirectUser();
    if (!user) {
        return null;
    }

    if (result?.user) {
        return result;
    }

    return { user, providerId: 'google.com' };
}

const redirectResultPromise = resolveRedirectResultInternal();

export function createGoogleProvider(options = {}) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: options.prompt || 'select_account' });
    return provider;
}

export async function signInWithGoogle(options = {}) {
    const forceRedirect = options.forceRedirect === true;
    const provider = createGoogleProvider(options);
    const useRedirect = forceRedirect || shouldUseRedirectAuth();

    if (useRedirect) {
        // Safari/iOS: no async work before redirect — preserves the user gesture.
        await signInWithRedirect(auth, provider);
        return null;
    }

    await ensureAuthPersistence();
    await auth.authStateReady();

    try {
        return await signInWithPopup(auth, provider);
    } catch (error) {
        if (POPUP_FALLBACK_CODES.has(error?.code)) {
            await signInWithRedirect(auth, provider);
            return null;
        }
        throw error;
    }
}

export function consumeRedirectResult() {
    return redirectResultPromise;
}

export async function resolveGoogleRedirectResult() {
    return consumeRedirectResult();
}

export async function getAuthenticatedUser(options = {}) {
    const maxAttempts = Number(options.maxAttempts || 1);
    const delayMs = Number(options.delayMs || 150);

    await consumeRedirectResult();
    await auth.authStateReady();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (auth.currentUser) {
            return auth.currentUser;
        }

        if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
    }

    return auth.currentUser;
}