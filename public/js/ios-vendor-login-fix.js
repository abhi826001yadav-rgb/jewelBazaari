export function isIOSDevice() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function scrollActiveFieldIntoView() {
    const active = document.activeElement;
    if (!active || !active.closest('#auth-section')) {
        return;
    }

    window.requestAnimationFrame(() => {
        active.scrollIntoView({ block: 'center', behavior: 'auto' });
        const loginBtn = document.getElementById('vendor-login-btn');
        if (loginBtn) {
            loginBtn.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
    });
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

export function installIOSVendorLoginFixes() {
    if (!isIOSDevice()) {
        return;
    }

    document.documentElement.classList.add('jb-ios-device');

    const authSection = document.getElementById('auth-section');
    if (!authSection) {
        return;
    }

    authSection.addEventListener('focusin', scrollActiveFieldIntoView);

    if (window.visualViewport) {
        const onViewportChange = () => {
            if (document.body.classList.contains('vendor-locked')) {
                scrollActiveFieldIntoView();
            }
        };

        window.visualViewport.addEventListener('resize', onViewportChange);
        window.visualViewport.addEventListener('scroll', onViewportChange);
    }
}

export function markVendorLoginReady() {
    window.__jbVendorLoginReady = true;
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