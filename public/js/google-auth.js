import { auth } from './firebase-config.js?v=20260707k';
import { getAuthErrorMessage } from './auth-error-messages.js?v=20260707k';
import { isMobileAuthEnvironment } from './device-utils.js?v=20260707k';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const POPUP_FALLBACK_CODES = new Set([
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request'
]);

async function ensureAuthPersistence() {
    await auth.authStateReady();

    if (!isMobileAuthEnvironment()) {
        return;
    }

    try {
        await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
        try {
            await setPersistence(auth, browserSessionPersistence);
        } catch {
            // Firebase will fall back automatically.
        }
    }
}

export function createGoogleProvider(options = {}) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: options.prompt || 'select_account' });
    return provider;
}

export async function signInWithGoogle(options = {}) {
    const forceRedirect = options.forceRedirect === true;
    const provider = createGoogleProvider(options);
    await ensureAuthPersistence();

    if (forceRedirect || isMobileAuthEnvironment()) {
        await signInWithRedirect(auth, provider);
        return null;
    }

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

export async function resolveGoogleRedirectResult() {
    await auth.authStateReady();

    try {
        return await getRedirectResult(auth);
    } catch (error) {
        console.warn('Google redirect result could not be restored:', error);
        return null;
    }
}

export async function getAuthenticatedUser() {
    await auth.authStateReady();
    return auth.currentUser;
}