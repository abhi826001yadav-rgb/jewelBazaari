import { auth } from './firebase-config.js?v=20260707j';
import { getAuthErrorMessage } from './auth-error-messages.js?v=20260707j';
import { isMobileAuthEnvironment } from './device-utils.js?v=20260707j';
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

function clearStaleRedirectState() {
    try {
        Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith('firebase:') && /redirect/i.test(key)) {
                sessionStorage.removeItem(key);
            }
        });
    } catch {
        // Ignore storage errors (private browsing, etc.).
    }
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

export function createGoogleProvider(options = {}) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: options.prompt || 'select_account' });
    return provider;
}

export async function signInWithGoogle(options = {}) {
    const provider = createGoogleProvider(options);
    await ensureAuthPersistence();

    if (isMobileAuthEnvironment()) {
        await signInWithRedirect(auth, provider);
        return null;
    }

    clearStaleRedirectState();

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
        clearStaleRedirectState();
        console.warn('Google redirect result could not be restored:', error);
        return null;
    }
}

export async function getAuthenticatedUser() {
    await auth.authStateReady();
    return auth.currentUser;
}