function getUserAgent() {
    return navigator.userAgent || '';
}

/**
 * iPhone, iPad, iPod, and iPadOS (desktop UA with touch).
 */
export function isIOSDevice() {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const uaData = navigator.userAgentData;
    if (uaData?.mobile) {
        const platform = String(uaData.platform || '').toLowerCase();
        if (platform.includes('ios') || platform.includes('ipad')) {
            return true;
        }
    }

    const ua = getUserAgent();
    if (/iPhone|iPad|iPod/i.test(ua)) {
        return true;
    }

    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/**
 * True Safari (WebKit), excluding Chromium/Firefox/Edge shells on iOS and desktop Chrome.
 */
export function isSafariBrowser() {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const ua = getUserAgent();

    if (/CriOS|FxiOS|EdgiOS|OPiOS|SamsungBrowser/i.test(ua)) {
        return false;
    }

    if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) {
        return false;
    }

    if (/Safari/i.test(ua) && /AppleWebKit/i.test(ua)) {
        return true;
    }

    if (typeof window !== 'undefined' && window.safari?.pushNotification) {
        return true;
    }

    return false;
}

/**
 * Android Chrome handles OAuth popups reliably; redirect there risks double-tap races.
 */
export function isAndroidChrome() {
    const ua = getUserAgent();
    return /Android/i.test(ua) &&
        /Chrome/i.test(ua) &&
        !/Edg|OPR|SamsungBrowser|Firefox|FxiOS/i.test(ua);
}

/**
 * OAuth redirect is required on iOS and other small-touch mobile (ITP, popup blocking).
 * Desktop and Android Chrome use popup with automatic redirect fallback.
 */
export function shouldUseRedirectAuth() {
    if (isIOSDevice()) {
        return true;
    }
    if (isAndroidChrome()) {
        return false;
    }
    return isMobileAuthEnvironment();
}

export function isMobileAuthEnvironment() {
    if (isIOSDevice()) {
        return true;
    }

    const ua = getUserAgent();
    if (/Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        return true;
    }

    return window.matchMedia('(max-width: 768px)').matches && navigator.maxTouchPoints > 0;
}