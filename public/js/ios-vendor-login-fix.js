export function isIOSDevice() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function scrollActiveFieldIntoView(sectionSelector, buttonId) {
    const active = document.activeElement;
    const section = document.querySelector(sectionSelector);
    if (!active || !section || !section.contains(active)) {
        return;
    }

    window.requestAnimationFrame(() => {
        active.scrollIntoView({ block: 'center', behavior: 'auto' });
        const button = buttonId ? document.getElementById(buttonId) : null;
        if (button) {
            button.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
    });
}

export function bindTapButton(button, handler) {
    const element = typeof button === 'string' ? document.getElementById(button) : button;
    if (!element || typeof handler !== 'function') {
        return;
    }

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
    element.addEventListener('touchend', run, { passive: false });
}

export function bindVendorLoginButton(submitFn) {
    const button = document.getElementById('vendor-login-btn');
    const form = document.getElementById('vendor-login-form');
    if (!button || typeof submitFn !== 'function') {
        return;
    }

    let submitting = false;

    const run = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (submitting) {
            return;
        }

        submitting = true;
        try {
            await submitFn();
        } finally {
            submitting = false;
        }
    };

    if (form) {
        form.addEventListener('submit', run);
    }

    button.addEventListener('click', run);
    button.addEventListener('touchend', run, { passive: false });
}

export function installIOSLoginScreenFixes({
    sectionSelector = '#auth-section',
    lockedClass = 'vendor-locked',
    primaryButtonId = 'vendor-login-btn'
} = {}) {
    if (!isIOSDevice()) {
        return;
    }

    document.documentElement.classList.add('jb-ios-device');

    const section = document.querySelector(sectionSelector);
    if (!section) {
        return;
    }

    const onFocus = () => scrollActiveFieldIntoView(sectionSelector, primaryButtonId);
    section.addEventListener('focusin', onFocus);

    if (window.visualViewport) {
        const onViewportChange = () => {
            if (document.body.classList.contains(lockedClass)) {
                onFocus();
            }
        };

        window.visualViewport.addEventListener('resize', onViewportChange);
        window.visualViewport.addEventListener('scroll', onViewportChange);
    }
}

export function installIOSVendorLoginFixes() {
    installIOSLoginScreenFixes({
        sectionSelector: '#auth-section',
        lockedClass: 'vendor-locked',
        primaryButtonId: 'vendor-login-btn'
    });
}

export function installIOSAdminLoginFixes() {
    installIOSLoginScreenFixes({
        sectionSelector: '#password-section',
        lockedClass: 'admin-locked',
        primaryButtonId: 'login-btn'
    });
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