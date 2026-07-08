import {
    auth,
    signInWithGoogle,
    getAuthenticatedUser,
    consumeRedirectResult,
    hasAuthRedirectState
} from './google-auth.js';
import { shouldUseRedirectAuth, isIOSDevice } from './device-utils.js';
import { isAdminEmail } from './admin-config.js';
import { getAuthErrorMessage } from './auth-error-messages.js';
import {
    installPortalIOSFixes,
    markAdminLoginReady,
    installAdminBootGuards,
    bindAdminLoginButton
} from './vendor-login-fix.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const passwordSection = document.getElementById('password-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('login-btn');
const adminLoginError = document.getElementById('admin-login-error');

let signInInFlight = false;
let signInRedirectPending = false;
let sessionRestoreComplete = false;
let redirectRestoreInFlight = false;
let adminSessionActive = false;
let authNullLockTimer = null;

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

function clearAuthNullLockTimer() {
    if (authNullLockTimer) {
        window.clearTimeout(authNullLockTimer);
        authNullLockTimer = null;
    }
}

function scheduleLockOnAuthNull() {
    if (!isIOSDevice()) {
        adminSessionActive = false;
        lockAdmin();
        return;
    }

    if (adminSessionActive) {
        return;
    }

    clearAuthNullLockTimer();
    authNullLockTimer = window.setTimeout(async () => {
        authNullLockTimer = null;
        await auth.authStateReady();
        if (auth.currentUser && isAdminUser(auth.currentUser)) {
            await handleSignedInUser(auth.currentUser, { showErrors: false });
            return;
        }
        if (!auth.currentUser) {
            adminSessionActive = false;
            lockAdmin();
        }
    }, 1500);
}

async function handleSignedInUser(user, { showErrors = true } = {}) {
    if (!user) {
        scheduleLockOnAuthNull();
        return false;
    }

    clearAuthNullLockTimer();

    if (!isAdminUser(user)) {
        adminSessionActive = false;
        const email = getUserEmail(user);
        await signOut(auth);
        lockAdmin();
        showLoginError(showErrors
            ? `This Google account (${email || 'unknown'}) is not authorized for admin access.`
            : '');
        return false;
    }

    unlockAdmin();
    adminSessionActive = true;
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
    signInRedirectPending = false;
    if (loginBtn) {
        loginBtn.disabled = true;
    }
    showLoginError('Opening Google sign-in...');

    try {
        const useRedirect = shouldUseRedirectAuth();
        await clearNonAdminSession(useRedirect);

        const result = await signInWithGoogle();
        if (result?.redirectInitiated) {
            signInRedirectPending = true;
            return;
        }
        if (result?.user) {
            await handleSignedInUser(result.user);
        }
    } catch (error) {
        console.error('Admin Google sign-in failed:', error);
        showLoginError(getAuthErrorMessage(error));
    } finally {
        if (signInRedirectPending) {
            return;
        }
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
            return handleSignedInUser(redirectResult.user, { showErrors: true });
        }

        const useRedirect = shouldUseRedirectAuth();
        const currentUser = await getAuthenticatedUser({
            maxAttempts: useRedirect ? (isIOSDevice() ? 40 : 15) : 8,
            delayMs: useRedirect ? (isIOSDevice() ? 200 : 175) : 150
        });
        if (currentUser) {
            return handleSignedInUser(currentUser, { showErrors: false });
        }

        if (!adminSessionActive) {
            lockAdmin();
            if (hasAuthRedirectState()) {
                showLoginError('Sign-in could not finish. Open /admin (not /admin.html), disable Private Browsing, then try Google sign-in again.');
            } else {
                showLoginError('');
            }
        }
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

    if (user) {
        void handleSignedInUser(user, { showErrors: false });
        return;
    }

    scheduleLockOnAuthNull();
});

window.addEventListener('pageshow', () => {
    if (adminSessionActive) {
        return;
    }
    void restoreAdminSession();
});

window.addEventListener('focus', () => {
    if (!isIOSDevice() || adminSessionActive || signInInFlight || redirectRestoreInFlight) {
        return;
    }

    void restoreAdminSession();
});