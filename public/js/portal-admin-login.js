import {
    installPortalIOSFixes,
    markAdminLoginReady,
    installAdminBootGuards,
    bindAdminLoginButton
} from './vendor-login-fix.js';

const ADMIN_PASSWORD = '7338917927';
const SESSION_KEY = 'jb_admin_authenticated';

const passwordSection = document.getElementById('password-section');
const adminSection = document.getElementById('admin-section');
const loginBtn = document.getElementById('login-btn');
const passwordInput = document.getElementById('admin-password');
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

function isSessionActive() {
    try {
        return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
        return false;
    }
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
    document.body.classList.remove('admin-locked');
    passwordSection?.classList.add('is-hidden');
    passwordSection?.setAttribute('aria-hidden', 'true');
    adminSection?.classList.add('is-visible');
    showLoginError('');
    window.dispatchEvent(new CustomEvent('jb:admin-authenticated'));
}

function lockAdmin() {
    setSessionActive(false);
    document.body.classList.add('admin-locked');
    passwordSection?.classList.remove('is-hidden');
    passwordSection?.setAttribute('aria-hidden', 'false');
    adminSection?.classList.remove('is-visible');
    if (passwordInput) {
        passwordInput.value = '';
    }
}

function verifyPassword(password) {
    return String(password || '').trim() === ADMIN_PASSWORD;
}

async function signInAsAdmin() {
    if (loginBtn?.disabled) {
        return;
    }

    const password = passwordInput?.value || '';
    if (!password) {
        showLoginError('Please enter the admin password.');
        passwordInput?.focus();
        return;
    }

    if (loginBtn) {
        loginBtn.disabled = true;
    }

    if (verifyPassword(password)) {
        setSessionActive(true);
        if (passwordInput) {
            passwordInput.value = '';
        }
        unlockAdmin();
    } else {
        showLoginError('Incorrect password. Please try again.');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    if (loginBtn) {
        loginBtn.disabled = false;
    }
}

installPortalIOSFixes();
installAdminBootGuards();
window.__jbAdminSignIn = signInAsAdmin;
window.__jbAdminLock = lockAdmin;
bindAdminLoginButton(signInAsAdmin);
markAdminLoginReady();

passwordInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        void signInAsAdmin();
    }
});

if (isSessionActive()) {
    unlockAdmin();
} else {
    lockAdmin();
}