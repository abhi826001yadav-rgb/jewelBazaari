export function isIOSDevice() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * True Safari (WebKit), excluding Chromium/Firefox/Edge shells on iOS and desktop Chrome.
 */
export function isSafariBrowser() {
    const ua = navigator.userAgent || '';

    if (/CriOS|FxiOS|EdgiOS|OPiOS|SamsungBrowser/i.test(ua)) {
        return false;
    }

    if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) {
        return false;
    }

    return /Safari/i.test(ua);
}

/**
 * OAuth redirect is required on iOS and Safari (ITP, popup blocking, gesture timing).
 * Desktop Chrome/Edge and Android Chrome keep the faster popup flow.
 */
export function shouldUseRedirectAuth() {
    return isIOSDevice() || isSafariBrowser();
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