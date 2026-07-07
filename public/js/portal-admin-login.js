import { auth } from './firebase-config.js?v=20260707l';
import { isAdminEmail } from './admin-config.js?v=20260707l';
import { getAuthErrorMessage } from './auth-error-messages.js?v=20260707l';
import { signInWithGoogle, resolveGoogleRedirectResult, getAuthenticatedUser } from './google-auth.js?v=20260707l';
import {
    installIOSAdminLoginFixes,
    markAdminLoginReady,
    showAdminBootError
} from './ios-vendor-login-fix.js?v=20260707l';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

window.__jbShowAdminBootError = showAdminBootError;

const passwordSection = document.getElementById('password-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('login-btn');
const adminLoginError = document.getElementById('admin-login-error');

let signInInFlight = false;

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

function isAdminUser(user) {
    return isAdminEmail(user?.email);
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
        await auth.authStateReady();

        const existing = auth.currentUser;
        if (existing && !isAdminUser(existing)) {
            await signOut(auth);
        }

        await signInWithGoogle({ forceRedirect: true });
    } catch (error) {
        console.error('Admin Google sign-in failed:', error);
        signInInFlight = false;
        setLoginButtonDisabled(false);
        showLoginError(getAuthErrorMessage(error));
    }
}

async function restoreAdminSession() {
    try {
        const redirectResult = await resolveGoogleRedirectResult();
        if (redirectResult?.user) {
            signInInFlight = false;
            return handleSignedInUser(redirectResult.user);
        }

        const currentUser = await getAuthenticatedUser();
        if (currentUser) {
            return handleSignedInUser(currentUser, { showErrors: false });
        }

        lockAdmin();
        showLoginError('');
        return false;
    } catch (error) {
        console.error('Admin session restore failed:', error);
        lockAdmin();
        showLoginError('');
        return false;
    } finally {
        signInInFlight = false;
        setLoginButtonDisabled(false);
    }
}

function bindLoginButton() {
    if (!loginBtn || loginBtn.dataset.jbAdminBound === '1') {
        return;
    }

    loginBtn.dataset.jbAdminBound = '1';
    loginBtn.addEventListener('click', (event) => {
        event.preventDefault();
        signInAsAdmin();
    });
}

window.__jbAdminLock = lockAdmin;
window.__jbAdminUnlock = unlockAdmin;
window.__jbAdminIsUser = isAdminUser;

installIOSAdminLoginFixes();
bindLoginButton();
window.__jbAdminSignIn = signInAsAdmin;
markAdminLoginReady();

restoreAdminSession();

onAuthStateChanged(auth, (user) => {
    void handleSignedInUser(user, { showErrors: false });
});

window.addEventListener('pageshow', () => {
    restoreAdminSession();
});