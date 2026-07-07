export function isIOSDevice() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isMobileAuthEnvironment() {
    if (isIOSDevice()) {
        return true;
    }

    const ua = navigator.userAgent || '';
    if (/Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        return true;
    }

    return window.matchMedia('(max-width: 768px)').matches && navigator.maxTouchPoints > 0;
}