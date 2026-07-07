import { auth } from './firebase-config.js';
import { isAdminEmail } from './admin-config.js';
import { getAuthErrorMessage } from './auth-error-messages.js';
import { signInWithGoogle, resolveGoogleRedirectResult, getAuthenticatedUser } from './google-auth.js';
import {
    bindTapButton,
    installIOSAdminLoginFixes,
    markAdminLoginReady,
    showAdminBootError
} from './ios-vendor-login-fix.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

window.__jbShowAdminBootError = showAdminBootError;

const passwordSection = document.getElementById('password-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('login-btn');
const adminLoginError = document.getElementById('admin-login-error');

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

async function handleSignedInUser(user) {
    if (!user) {
        return false;
    }

    if (!isAdminUser(user)) {
        await signOut(auth);
        showLoginError('This Google account is not authorized for admin access.');
        return false;
    }

    unlockAdmin();
    return true;
}

let adminRedirectPending = false;

async function signInAsAdmin() {
    if (!loginBtn) {
        return;
    }

    loginBtn.disabled = true;
    showLoginError('');

    try {
        const result = await signInWithGoogle();
        if (!result) {
            adminRedirectPending = true;
            showLoginError('Redirecting to Google sign-in...');
            return;
        }

        showLoginError('');
        await handleSignedInUser(result.user);
    } catch (error) {
        showLoginError(getAuthErrorMessage(error));
    } finally {
        if (!adminRedirectPending && loginBtn) {
            loginBtn.disabled = false;
        }
    }
}

async function initAdminAuth() {
    try {
        const result = await resolveGoogleRedirectResult();
        const redirectUser = result?.user;
        const currentUser = redirectUser || await getAuthenticatedUser();

        if (currentUser) {
            adminRedirectPending = false;
            await handleSignedInUser(currentUser);
            return;
        }

        showLoginError('');
    } catch (error) {
        adminRedirectPending = false;
        showLoginError(error.message || getAuthErrorMessage(error));
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
        }
    }
}

window.__jbAdminLock = lockAdmin;
window.__jbAdminUnlock = unlockAdmin;
window.__jbAdminIsUser = isAdminUser;

installIOSAdminLoginFixes();
bindTapButton(loginBtn, signInAsAdmin);
window.__jbAdminSignIn = signInAsAdmin;

initAdminAuth().finally(() => {
    markAdminLoginReady();
});