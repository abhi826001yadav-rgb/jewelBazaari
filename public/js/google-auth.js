import { auth } from './firebase-config.js?v=20260707c';
import { getAuthErrorMessage } from './auth-error-messages.js?v=20260707c';
import { isMobileAuthEnvironment } from './device-utils.js?v=20260707c';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

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

    return signInWithPopup(auth, provider);
}

export async function resolveGoogleRedirectResult() {
    await auth.authStateReady();

    try {
        return await getRedirectResult(auth);
    } catch (error) {
        throw new Error(getAuthErrorMessage(error));
    }
}

export async function getAuthenticatedUser() {
    await auth.authStateReady();
    return auth.currentUser;
}