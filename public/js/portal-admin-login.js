import { auth } from './firebase-config.js?v=20260707j';
import { isAdminEmail } from './admin-config.js?v=20260707j';
import { getAuthErrorMessage } from './auth-error-messages.js?v=20260707j';
import { signInWithGoogle, resolveGoogleRedirectResult, getAuthenticatedUser } from './google-auth.js?v=20260707j';
import {
    installIOSAdminLoginFixes,
    markAdminLoginReady,
    showAdminBootError
} from './ios-vendor-login-fix.js?v=20260707j';
import {
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

window.__jbShowAdminBootError = showAdminBootError;

const passwordSection = document.getElementById('password-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('login-btn');
const adminLoginError = document.getElementById('admin-login-error');

let authListenerReady = false;
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

async function handleSignedInUser(user) {
    if (!user) {
        lockAdmin();
        return false;
    }

    if (!isAdminUser(user)) {
        await signOut(auth);
        lockAdmin();
        showLoginError('This Google account is not authorized for admin access.');
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
    showLoginError('');

    try {
        const result = await signInWithGoogle();
        if (!result) {
            showLoginError('Redirecting to Google sign-in...');
            return;
        }

        await handleSignedInUser(result.user);
    } catch (error) {
        console.error('Admin Google sign-in failed:', error);
        showLoginError(getAuthErrorMessage(error));
    } finally {
        signInInFlight = false;
        setLoginButtonDisabled(false);
    }
}

async function restoreAdminSession() {
    const redirectResult = await resolveGoogleRedirectResult();
    if (redirectResult?.user) {
        return handleSignedInUser(redirectResult.user);
    }

    const currentUser = await getAuthenticatedUser();
    if (currentUser) {
        return handleSignedInUser(currentUser);
    }

    lockAdmin();
    showLoginError('');
    return false;
}

function attachAdminAuthListener() {
    if (authListenerReady) {
        return;
    }

    authListenerReady = true;

    onAuthStateChanged(auth, async (user) => {
        if (!window.__jbAdminLoginReady) {
            return;
        }

        if (!user) {
            lockAdmin();
            return;
        }

        if (isAdminUser(user)) {
            unlockAdmin();
            return;
        }

        await signOut(auth);
        lockAdmin();
        if (!signInInFlight) {
            showLoginError('This Google account is not authorized for admin access.');
        }
    });
}

window.__jbAdminLock = lockAdmin;
window.__jbAdminUnlock = unlockAdmin;
window.__jbAdminIsUser = isAdminUser;

installIOSAdminLoginFixes();
window.__jbAdminSignIn = signInAsAdmin;
markAdminLoginReady();
attachAdminAuthListener();

restoreAdminSession().finally(() => {
    setLoginButtonDisabled(false);
});

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        restoreAdminSession().finally(() => {
            setLoginButtonDisabled(false);
        });
    }
});