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

export function installVendorBootGuards({
    scriptPattern = /portal-vendor-login|vendor-service|firebase-config|google-auth/i,
    timeoutMessage = 'Login did not load. Hard-refresh the page and try again.'
} = {}) {
    window.__jbShowVendorBootError = showVendorBootError;

    window.addEventListener('error', (event) => {
        if (!scriptPattern.test(event.filename || '')) {
            return;
        }
        showVendorBootError(event.message || 'Vendor login failed to load.');
    });

    window.addEventListener('unhandledrejection', (event) => {
        const message = event.reason?.message || '';
        if (!message || !/auth|firebase|google|module|vendor/i.test(message)) {
            return;
        }
        showVendorBootError(message);
    });

    window.setTimeout(() => {
        if (!window.__jbVendorLoginReady) {
            showVendorBootError(timeoutMessage);
        }
    }, 5000);
}