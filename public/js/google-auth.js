import { auth } from './firebase-config.js';
import { shouldUseRedirectAuth, isIOSDevice } from './device-utils.js';
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

export function normalizeAuthRedirectPath() {
    if (typeof window === 'undefined') {
        return;
    }

    const { pathname, search, hash } = window.location;
    if (!/\.html$/i.test(pathname)) {
        return;
    }

    const normalizedPath = pathname.replace(/\.html$/i, '');
    window.history.replaceState(null, '', `${normalizedPath}${search}${hash}`);
}

export function hasAuthRedirectState() {
    if (typeof window === 'undefined') {
        return false;
    }

    const search = window.location.search || '';
    const hash = window.location.hash || '';
    return /(?:^|[?&#])(?:state|code|apiKey)=/i.test(`${search}${hash}`);
}

async function waitForRedirectUser(maxAttempts = 20, delayMs = 150) {
    if (isIOSDevice()) {
        maxAttempts = Math.max(maxAttempts, 45);
        delayMs = Math.max(delayMs, 200);
    }
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (auth.currentUser) {
            return auth.currentUser;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return auth.currentUser;
}

async function resolveRedirectResultInternal() {
    normalizeAuthRedirectPath();
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

    if (result?.user) {
        return result;
    }

    if (auth.currentUser) {
        return { user: auth.currentUser, providerId: 'google.com' };
    }

    if (!hasAuthRedirectState()) {
        return null;
    }

    const user = await waitForRedirectUser();
    if (!user) {
        return null;
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
        normalizeAuthRedirectPath();
        await signInWithRedirect(auth, provider);
        return { redirectInitiated: true };
    }

    await ensureAuthPersistence();
    await auth.authStateReady();

    try {
        return await signInWithPopup(auth, provider);
    } catch (error) {
        if (POPUP_FALLBACK_CODES.has(error?.code)) {
            normalizeAuthRedirectPath();
            await signInWithRedirect(auth, provider);
            return { redirectInitiated: true };
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