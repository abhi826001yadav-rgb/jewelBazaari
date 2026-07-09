import {
    installPortalIOSFixes,
    markAdminLoginReady,
    installAdminBootGuards,
    bindAdminLoginButton
} from './vendor-login-fix.js';
import { auth } from './firebase-config.js';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

/** Only these Google accounts may access the admin dashboard. */
const ADMIN_EMAILS = new Set([
    'abhishekyadav98.official@gmail.com',
    'priankasureshupsc@gmail.com'
]);

const SESSION_KEY = 'jb_admin_authenticated';

const passwordSection = document.getElementById('password-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('login-btn');
const adminLoginError = document.getElementById('admin-login-error');

let adminUnlocked = false;
let rejectingUnauthorized = false;

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

function isAllowedAdminEmail(email) {
    return ADMIN_EMAILS.has(String(email || '').trim().toLowerCase());
}

function setSessionActive(active) {
    try {
        if (active) {
            sessionStorage.setItem(SESSION_KEY, '1');
        } else {
            sessionStorage.removeItem(SESSION_KEY);
        }
    } catch {
        // Ignore storage errors (private browsing, etc.).
    }
}

function unlockAdmin() {
    if (adminUnlocked) {
        return;
    }

    adminUnlocked = true;
    setSessionActive(true);
    document.body.classList.remove('admin-locked');
    passwordSection?.classList.add('is-hidden');
    passwordSection?.setAttribute('aria-hidden', 'true');
    adminSection?.classList.add('is-visible');
    showLoginError('');
    window.dispatchEvent(new CustomEvent('jb:admin-authenticated'));
}

function applyLockedUi() {
    adminUnlocked = false;
    setSessionActive(false);
    document.body.classList.add('admin-locked');
    passwordSection?.classList.remove('is-hidden');
    passwordSection?.setAttribute('aria-hidden', 'false');
    adminSection?.classList.remove('is-visible');
}

async function lockAdmin() {
    applyLockedUi();
    try {
        if (auth.currentUser) {
            await signOut(auth);
        }
    } catch {
        // Ignore sign-out failures; UI is already locked.
    }
}

function createGoogleProvider() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    provider.addScope('email');
    provider.addScope('profile');
    return provider;
}

function mapAuthError(error) {
    const code = error?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return '';
    }
    if (code === 'auth/popup-blocked') {
        return 'Pop-up blocked. Allow pop-ups for this site and try again.';
    }
    if (code === 'auth/network-request-failed') {
        return 'Network error. Check your connection and try again.';
    }
    if (code === 'auth/unauthorized-domain') {
        return 'This domain is not authorized for Google sign-in. Add it in Firebase Console.';
    }
    return error?.message || 'Google sign-in failed. Please try again.';
}

async function rejectUnauthorizedUser() {
    if (rejectingUnauthorized) {
        return;
    }

    rejectingUnauthorized = true;
    applyLockedUi();
    showLoginError('This Google account is not authorized for admin access.');
    try {
        if (auth.currentUser) {
            await signOut(auth);
        }
    } catch {
        // Ignore.
    } finally {
        rejectingUnauthorized = false;
    }
}

async function signInAsAdmin() {
    if (loginBtn?.disabled) {
        return;
    }

    showLoginError('');

    if (loginBtn) {
        loginBtn.disabled = true;
    }

    try {
        // Prefer popup; fall back to redirect when the browser blocks pop-ups (common on mobile).
        try {
            await signInWithPopup(auth, createGoogleProvider());
            // onAuthStateChanged handles allowlist + unlock.
        } catch (popupError) {
            const code = popupError?.code || '';
            if (
                code === 'auth/popup-blocked' ||
                code === 'auth/operation-not-supported-in-this-environment'
            ) {
                await signInWithRedirect(auth, createGoogleProvider());
                return;
            }
            throw popupError;
        }
    } catch (error) {
        const message = mapAuthError(error);
        if (message) {
            showLoginError(message);
        }
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
        }
    }
}

installPortalIOSFixes();
installAdminBootGuards();
window.__jbAdminSignIn = signInAsAdmin;
window.__jbAdminLock = lockAdmin;
bindAdminLoginButton(signInAsAdmin);
markAdminLoginReady();

// Clear any legacy password-based session; require a live Google admin session.
applyLockedUi();

void (async () => {
    try {
        await getRedirectResult(auth);
        // Allowlist is enforced in onAuthStateChanged.
    } catch (error) {
        const message = mapAuthError(error);
        if (message) {
            showLoginError(message);
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            if (!rejectingUnauthorized) {
                applyLockedUi();
            }
            return;
        }

        if (isAllowedAdminEmail(user.email)) {
            unlockAdmin();
            return;
        }

        await rejectUnauthorizedUser();
    });
})();
