import { isIOSDevice } from './device-utils.js';

export { isIOSDevice };

function bindActivate(element, handler) {
    if (!element || typeof handler !== 'function' || element.dataset.jbActivateBound === '1') {
        return;
    }

    element.dataset.jbActivateBound = '1';
    let running = false;

    const run = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (running) {
            return;
        }

        running = true;
        try {
            await handler();
        } finally {
            running = false;
        }
    };

    element.addEventListener('click', run);
}

const PORTAL_BRIDGE_BUTTON_IDS = new Set(['vendor-login-btn', 'login-btn']);

export function bindTapButton(button, handler) {
    const element = typeof button === 'string' ? document.getElementById(button) : button;
    if (element?.id && PORTAL_BRIDGE_BUTTON_IDS.has(element.id)) {
        return;
    }
    bindActivate(element, handler);
}

export function bindVendorLoginForm(submitFn) {
    const form = document.getElementById('vendor-login-form');
    if (!form || typeof submitFn !== 'function' || form.dataset.jbSubmitBound === '1') {
        return;
    }

    form.dataset.jbSubmitBound = '1';
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitFn();
    });
}

export function installIOSVendorLoginFixes() {
    if (!isIOSDevice()) {
        return;
    }

    document.documentElement.classList.add('jb-ios-device');
}

/** Alias — same iOS layout fixes apply to admin and vendor portals. */
export const installPortalIOSFixes = installIOSVendorLoginFixes;

export function markVendorLoginReady() {
    window.__jbVendorLoginReady = true;
}

export function markAdminLoginReady() {
    window.__jbAdminLoginReady = true;
}

export function showVendorBootError(message) {
    const status = document.getElementById('vendor-login-status');
    if (!status) {
        return;
    }

    status.textContent = message;
    status.classList.remove('hidden', 'status-success', 'status-info');
    status.classList.add('status-error');
}

export function showAdminBootError(message) {
    const status = document.getElementById('admin-login-error');
    if (!status) {
        return;
    }

    status.textContent = message;
    status.classList.remove('hidden');
}

export function installPortalBootGuards({
    readyGlobal = '__jbVendorLoginReady',
    showBootError = showVendorBootError,
    exposeGlobal = '__jbShowVendorBootError',
    scriptPattern = /portal-vendor-login|vendor-service|firebase-config|google-auth/i,
    rejectionPattern = /auth|firebase|google|module|vendor/i,
    timeoutMessage = 'Login did not load. Hard-refresh the page and try again.',
    bootErrorMessage = 'Login failed to load.',
    timeoutMs = 5000
} = {}) {
    window[exposeGlobal] = showBootError;

    window.addEventListener('error', (event) => {
        if (!scriptPattern.test(event.filename || '')) {
            return;
        }
        showBootError(event.message || bootErrorMessage);
    });

    window.addEventListener('unhandledrejection', (event) => {
        const message = event.reason?.message || '';
        if (!message || !rejectionPattern.test(message)) {
            return;
        }
        showBootError(message);
    });

    window.setTimeout(() => {
        if (!window[readyGlobal]) {
            showBootError(timeoutMessage);
        }
    }, timeoutMs);
}

export function installVendorBootGuards(options = {}) {
    return installPortalBootGuards({
        readyGlobal: '__jbVendorLoginReady',
        showBootError: showVendorBootError,
        exposeGlobal: '__jbShowVendorBootError',
        ...options
    });
}

export function installAdminBootGuards(options = {}) {
    return installPortalBootGuards({
        readyGlobal: '__jbAdminLoginReady',
        showBootError: showAdminBootError,
        exposeGlobal: '__jbShowAdminBootError',
        scriptPattern: /admin-entry|portal-admin-login|google-auth|firebase-config|admin-dashboard/i,
        rejectionPattern: /auth|firebase|google|module/i,
        timeoutMessage: 'Admin login did not load. Hard-refresh the page and try again.',
        bootErrorMessage: 'Admin login failed to load.',
        ...options
    });
}

export function bindAdminLoginButton(handler) {
    const element = document.getElementById('login-btn');
    // portal-tap-bridge.js owns login-btn activation (pointerup on Android, click elsewhere).
    if (element?.id && PORTAL_BRIDGE_BUTTON_IDS.has(element.id)) {
        return;
    }
    bindActivate(element, handler);
}