import {
    installPortalIOSFixes,
    markVendorLoginReady,
    installVendorBootGuards,
    bindTapButton
} from './vendor-login-fix.js';

export const VENDOR_PASSWORD = '8917219139';
export const VENDOR_SESSION_KEY = 'jb_vendor_authenticated';

export const DEFAULT_VENDOR = {
    shopName: 'jewelBazaari Vendor',
    vendorId: 'vendor',
    email: ''
};

const authSection = document.getElementById('auth-section');
const portalSection = document.getElementById('upload-section') || document.getElementById('dashboard-section');
const accessBtn = document.getElementById('vendor-access-btn');
const passwordInput = document.getElementById('vendor-password');
const loginStatus = document.getElementById('vendor-login-status');

function showLoginStatus(message, type = 'error') {
    if (!loginStatus) {
        return;
    }

    if (!message) {
        loginStatus.textContent = '';
        loginStatus.classList.add('hidden');
        loginStatus.classList.remove('status-success', 'status-error', 'status-info');
        return;
    }

    loginStatus.textContent = message;
    loginStatus.classList.remove('hidden', 'status-success', 'status-error', 'status-info');
    loginStatus.classList.add(`status-${type}`);
}

function isSessionActive() {
    try {
        return sessionStorage.getItem(VENDOR_SESSION_KEY) === '1';
    } catch {
        return false;
    }
}

function setSessionActive(active) {
    try {
        if (active) {
            sessionStorage.setItem(VENDOR_SESSION_KEY, '1');
        } else {
            sessionStorage.removeItem(VENDOR_SESSION_KEY);
        }
    } catch {
        // Ignore storage errors.
    }
}

function unlockVendor() {
    document.body.classList.remove('vendor-locked');
    authSection?.classList.add('is-hidden');
    authSection?.setAttribute('aria-hidden', 'true');
    portalSection?.classList.add('is-visible');
    showLoginStatus('');
    window.dispatchEvent(new CustomEvent('jb:vendor-authenticated', {
        detail: { vendor: { ...DEFAULT_VENDOR } }
    }));
}

function lockVendor() {
    setSessionActive(false);
    document.body.classList.add('vendor-locked');
    authSection?.classList.remove('is-hidden');
    authSection?.setAttribute('aria-hidden', 'false');
    portalSection?.classList.remove('is-visible');
    if (passwordInput) {
        passwordInput.value = '';
    }
}

function verifyPassword(password) {
    return String(password || '').trim() === VENDOR_PASSWORD;
}

async function signInAsVendor() {
    if (accessBtn?.disabled) {
        return;
    }

    const password = passwordInput?.value || '';
    if (!password) {
        showLoginStatus('Please enter the vendor password.');
        passwordInput?.focus();
        return;
    }

    if (accessBtn) {
        accessBtn.disabled = true;
    }

    if (verifyPassword(password)) {
        setSessionActive(true);
        if (passwordInput) {
            passwordInput.value = '';
        }
        unlockVendor();
    } else {
        showLoginStatus('Incorrect password. Please try again.');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    if (accessBtn) {
        accessBtn.disabled = false;
    }
}

installPortalIOSFixes();
installVendorBootGuards({
    scriptPattern: /portal-vendor-access|vendor-upload|firebase-config/i
});

window.__jbVendorAccess = signInAsVendor;
window.__jbVendorLock = lockVendor;
window.__jbGetVendorSession = () => (isSessionActive() ? { ...DEFAULT_VENDOR } : null);

bindTapButton(accessBtn, signInAsVendor);
markVendorLoginReady();

passwordInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        void signInAsVendor();
    }
});

if (isSessionActive()) {
    unlockVendor();
} else {
    lockVendor();
}