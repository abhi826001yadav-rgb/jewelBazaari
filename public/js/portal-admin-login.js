import {
    auth,
    signInWithGoogle,
    getAuthenticatedUser,
    consumeRedirectResult
} from './google-auth.js';
import { shouldUseRedirectAuth } from './device-utils.js';
import { isAdminEmail } from './admin-config.js';
import { getAuthErrorMessage } from './auth-error-messages.js';
import {
    installPortalIOSFixes,
    markAdminLoginReady,
    installAdminBootGuards,
    bindAdminLoginButton
} from './ios-vendor-login-fix.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

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
    if (!user?.email) {
        return user?.providerData?.find((provider) => provider.email)?.email || '';
    }

    return user.email;
}

function isAdminUser(user) {
    return isAdminEmail(getUserEmail(user));
}

function unlockAdmin() {
    document.body.classList.remove('admin-locked');
    passwordSection?.classList.add('is-hidden');
    passwordSection?.setAttribute('aria-hidden', 'true');
    adminSection?.classList.add('is-visible');
    showLoginError('');
    window.dispatchEvent(new CustomEvent('jb:admin-authenticated'));
}

function lockAdmin() {
    document.body.classList.add('admin-locked');
    passwordSection?.classList.remove('is-hidden');
    passwordSection?.setAttribute('aria-hidden', 'false');
    adminSection?.classList.remove('is-visible');
}

async function handleSignedInUser(user, { showErrors = true } = {}) {
    if (!user) {
        lockAdmin();
        return false;
    }

    if (!isAdminUser(user)) {
        await signOut(auth);
        lockAdmin();
        showLoginError(showErrors ? 'This Google account is not authorized for admin access.' : '');
        return false;
    }

    unlockAdmin();
    return true;
}

async function clearNonAdminSession(useRedirect) {
    const existing = auth.currentUser;
    if (!existing || isAdminUser(existing)) {
        return;
    }

    // Redirect flow: never await before signInWithRedirect (breaks iOS gesture chain).
    if (useRedirect) {
        void signOut(auth);
        return;
    }

    await signOut(auth);
}

async function signInAsAdmin() {
    if (signInInFlight) {
        return;
    }

    signInInFlight = true;
    if (loginBtn) {
        loginBtn.disabled = true;
    }
    showLoginError('Opening Google sign-in...');

    try {
        const useRedirect = shouldUseRedirectAuth();
        await clearNonAdminSession(useRedirect);

        const result = await signInWithGoogle();
        if (result?.user) {
            await handleSignedInUser(result.user);
        }
    } catch (error) {
        console.error('Admin Google sign-in failed:', error);
        showLoginError(getAuthErrorMessage(error));
    } finally {
        signInInFlight = false;
        if (loginBtn) {
            loginBtn.disabled = false;
        }
    }
}

async function restoreAdminSession() {
    redirectRestoreInFlight = true;

    try {
        const redirectResult = await consumeRedirectResult();
        if (redirectResult?.user) {
            return handleSignedInUser(redirectResult.user);
        }

        const useRedirect = shouldUseRedirectAuth();
        const currentUser = await getAuthenticatedUser({
            maxAttempts: useRedirect ? 15 : 8,
            delayMs: useRedirect ? 175 : 150
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

installPortalIOSFixes();
installAdminBootGuards();
window.__jbAdminSignIn = signInAsAdmin;
window.__jbAdminLock = lockAdmin;
bindAdminLoginButton(signInAsAdmin);
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