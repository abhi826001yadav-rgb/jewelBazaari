function isIOSDevice() {
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
        active.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const loginBtn = document.getElementById('vendor-login-btn');
        if (loginBtn) {
            loginBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    });
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