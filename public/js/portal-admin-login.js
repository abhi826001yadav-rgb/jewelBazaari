import {
    auth,
    signInWithGoogle,
    resolveGoogleRedirectResult,
    getAuthenticatedUser,
    consumeRedirectResult
} from './google-auth.js';
import { shouldUseRedirectAuth } from './device-utils.js';
import { isAdminEmail } from './admin-config.js';
import { getAuthErrorMessage } from './auth-error-messages.js';
import {
    installIOSAdminLoginFixes,
    markAdminLoginReady,
    showAdminBootError
} from './ios-vendor-login-fix.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

window.__jbShowAdminBootError = showAdminBootError;

const passwordSection = document.getElementById('password-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('login-btn');
const adminLoginError = document.getElementById('admin-login-error');

let signInInFlight = false;
let sessionRestoreComplete = false;
let redirectRestoreInFlight = false;

function showLoginError(message) {
    if (!adminLoginError) {
        return;
    }

    if (!message) {
        adminLoginError.classList.add('hidden');
        adminLoginError.textContent = '';
        return;
    }

    adminLoginError.textContent = message;
    adminLoginError.classList.remove('hidden');
}

function getUserEmail(user) {
    if (!user) {
        return '';
    }

    if (user.email) {
        return user.email;
    }

    const providerEmail = user.providerData?.find((provider) => provider.email)?.email;
    return providerEmail || '';
}

function isAdminUser(user) {
    return isAdminEmail(getUserEmail(user));
}

function unlockAdmin() {
    document.body.classList.remove('admin-locked');
    if (passwordSection) {
        passwordSection.classList.add('is-hidden');
        passwordSection.setAttribute('aria-hidden', 'true');
    }
    if (adminSection) {
        adminSection.classList.add('is-visible');
    }
    showLoginError('');
    window.dispatchEvent(new CustomEvent('jb:admin-authenticated'));
}

function lockAdmin() {
    document.body.classList.add('admin-locked');
    if (passwordSection) {
        passwordSection.classList.remove('is-hidden');
        passwordSection.setAttribute('aria-hidden', 'false');
    }
    if (adminSection) {
        adminSection.classList.remove('is-visible');
    }
}

async function handleSignedInUser(user, { showErrors = true } = {}) {
    if (!user) {
        lockAdmin();
        return false;
    }

    if (!isAdminUser(user)) {
        await signOut(auth);
        lockAdmin();
        if (showErrors) {
            showLoginError('This Google account is not authorized for admin access.');
        } else {
            showLoginError('');
        }
        return false;
    }

    unlockAdmin();
    return true;
}

function setLoginButtonDisabled(disabled) {
    if (loginBtn) {
        loginBtn.disabled = disabled;
    }
}

async function signInAsAdmin() {
    if (!loginBtn || signInInFlight) {
        return;
    }

    signInInFlight = true;
    setLoginButtonDisabled(true);
    showLoginError('Opening Google sign-in...');

    try {
        const existing = auth.currentUser;
        const useRedirect = shouldUseRedirectAuth();

        // Safari/iOS: any await before signInWithRedirect breaks the tap gesture chain.
        if (existing && !isAdminUser(existing) && !useRedirect) {
            await signOut(auth);
        }

        const result = await signInWithGoogle();
        if (result?.user) {
            await handleSignedInUser(result.user);
        }
    } catch (error) {
        console.error('Admin Google sign-in failed:', error);
        showLoginError(getAuthErrorMessage(error));
    } finally {
        signInInFlight = false;
        setLoginButtonDisabled(false);
    }
}

async function restoreAdminSession() {
    redirectRestoreInFlight = true;

    try {
        await consumeRedirectResult();

        const redirectResult = await resolveGoogleRedirectResult();
        if (redirectResult?.user) {
            return handleSignedInUser(redirectResult.user);
        }

        const safariRestore = shouldUseRedirectAuth();
        const currentUser = await getAuthenticatedUser({
            maxAttempts: safariRestore ? 15 : 8,
            delayMs: safariRestore ? 175 : 150
        });
        if (currentUser) {
            return handleSignedInUser(currentUser, { showErrors: false });
        }

        lockAdmin();
        showLoginError('');
        return false;
    } catch (error) {
        console.error('Admin session restore failed:', error);
        lockAdmin();
        showLoginError(getAuthErrorMessage(error));
        return false;
    } finally {
        redirectRestoreInFlight = false;
    }
}

window.__jbAdminLock = lockAdmin;
window.__jbAdminUnlock = unlockAdmin;
window.__jbAdminIsUser = isAdminUser;

installIOSAdminLoginFixes();
window.__jbAdminSignIn = signInAsAdmin;
markAdminLoginReady();

await restoreAdminSession();
sessionRestoreComplete = true;

onAuthStateChanged(auth, (user) => {
    if (!sessionRestoreComplete || redirectRestoreInFlight || signInInFlight) {
        return;
    }

    void handleSignedInUser(user, { showErrors: false });
});

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        void restoreAdminSession();
    }
});