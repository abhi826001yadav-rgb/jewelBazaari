import { auth } from './firebase-config.js';
import { getAuthErrorMessage } from './auth-error-messages.js';
import { isMobileAuthEnvironment } from './device-utils.js';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export function createGoogleProvider(options = {}) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: options.prompt || 'select_account' });
    return provider;
}

export async function signInWithGoogle(options = {}) {
    const provider = createGoogleProvider(options);

    if (isMobileAuthEnvironment()) {
        await signInWithRedirect(auth, provider);
        return null;
    }

    return signInWithPopup(auth, provider);
}

export async function resolveGoogleRedirectResult() {
    try {
        return await getRedirectResult(auth);
    } catch (error) {
        throw new Error(getAuthErrorMessage(error));
    }
}