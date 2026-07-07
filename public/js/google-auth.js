import { auth } from './firebase-config.js?v=20260707g';
import { getAuthErrorMessage } from './auth-error-messages.js?v=20260707g';
import { isMobileAuthEnvironment } from './device-utils.js?v=20260707g';
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

const REDIRECT_BENIGN_CODES = new Set([
    'auth/redirect-cancelled-by-user',
    'auth/cancelled-popup-request'
]);

export function createGoogleProvider(options = {}) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: options.prompt || 'select_account' });
    return provider;
}

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

export async function signInWithGoogle(options = {}) {
    const provider = createGoogleProvider(options);
    await ensureAuthPersistence();

    if (isMobileAuthEnvironment()) {
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
        if (REDIRECT_BENIGN_CODES.has(error?.code)) {
            return null;
        }
        throw new Error(getAuthErrorMessage(error));
    }
}

export async function getAuthenticatedUser() {
    await auth.authStateReady();
    return auth.currentUser;
}