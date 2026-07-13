/**
 * Instagram in-app browser notices.
 * - Red strip: always shown on every page load inside Instagram only.
 * - Popup card: shown until user dismisses / taps "I Opened It" (localStorage).
 * Never shown in Chrome, Safari, Firefox, Edge, etc.
 */

const STORAGE_KEY = 'jb_ig_inapp_banner_dismissed';
const POPUP_ID = 'jb-ig-browser-banner';
const RED_NOTICE_ID = 'jb-ig-red-notice';
const STYLE_ID = 'jb-ig-browser-banner-styles';

export function isInstagramInAppBrowser() {
    const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
    return /Instagram/i.test(ua);
}

function wasPopupDismissed() {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function rememberPopupDismissal() {
    try {
        window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
        // Ignore private-mode / storage failures.
    }
}

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        /* Always-visible red notice (Instagram only). Fixed = no document layout shift. */
        #${RED_NOTICE_ID} {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 99991;
            padding: calc(0.4rem + env(safe-area-inset-top, 0px)) 0.65rem 0.4rem;
            background: rgba(255, 255, 255, 0.96);
            border-bottom: 1px solid rgba(220, 38, 38, 0.25);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            pointer-events: none;
        }
        #${RED_NOTICE_ID} p {
            margin: 0 auto;
            max-width: 36rem;
            font-size: 11px;
            line-height: 1.4;
            color: #dc2626;
            font-weight: 500;
        }

        /* Dismissible popup (bottom card) */
        #${POPUP_ID} {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 99990;
            pointer-events: none;
            padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        }
        #${POPUP_ID} .jb-ig-banner-card {
            pointer-events: auto;
            max-width: 28rem;
            margin: 0 auto;
            background: #fff;
            color: #2A2A2A;
            border: 1px solid rgba(155, 126, 75, 0.35);
            border-radius: 1rem;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
            padding: 0.9rem 1rem 1rem;
            position: relative;
        }
        #${POPUP_ID} .jb-ig-banner-close {
            position: absolute;
            top: 0.35rem;
            right: 0.45rem;
            width: 2rem;
            height: 2rem;
            border: 0;
            background: transparent;
            color: #6b7280;
            font-size: 1.35rem;
            line-height: 1;
            border-radius: 9999px;
            cursor: pointer;
        }
        #${POPUP_ID} .jb-ig-banner-close:hover,
        #${POPUP_ID} .jb-ig-banner-close:focus-visible {
            color: #4A0E17;
            background: rgba(74, 14, 23, 0.06);
            outline: none;
        }
        #${POPUP_ID} .jb-ig-banner-title {
            margin: 0 1.75rem 0.45rem 0;
            font-size: 0.875rem;
            font-weight: 700;
            color: #4A0E17;
            line-height: 1.35;
        }
        #${POPUP_ID} .jb-ig-banner-body {
            margin: 0 0 0.85rem;
            font-size: 0.75rem;
            line-height: 1.45;
            color: #4b5563;
        }
        #${POPUP_ID} .jb-ig-banner-body strong {
            color: #2A2A2A;
            font-weight: 600;
        }
        #${POPUP_ID} .jb-ig-banner-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        #${POPUP_ID} .jb-ig-banner-primary {
            flex: 1 1 auto;
            min-height: 2.5rem;
            border: 0;
            border-radius: 9999px;
            background: #4A0E17;
            color: #fff;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            padding: 0.55rem 1rem;
            cursor: pointer;
        }
        #${POPUP_ID} .jb-ig-banner-primary:hover,
        #${POPUP_ID} .jb-ig-banner-primary:focus-visible {
            background: #3A0A12;
            outline: none;
        }
        #${POPUP_ID}[hidden] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

function buildRedNotice() {
    const root = document.createElement('div');
    root.id = RED_NOTICE_ID;
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-label', 'Instagram browser tip');
    root.innerHTML = `
        <p>Tap the ⋮ (three dots) in the top-right corner of Instagram and select Open in Chrome or Open in External Browser.</p>
    `;
    return root;
}

function hidePopup(root) {
    if (!root) return;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
        root.remove();
    }, 0);
}

function buildPopup() {
    const root = document.createElement('div');
    root.id = POPUP_ID;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Open in external browser');
    root.setAttribute('aria-live', 'polite');

    root.innerHTML = `
        <div class="jb-ig-banner-card">
            <button type="button" class="jb-ig-banner-close" data-ig-banner-dismiss aria-label="Dismiss">×</button>
            <p class="jb-ig-banner-title">For the best experience, please open this page in your browser.</p>
            <p class="jb-ig-banner-body">
                Tap the <strong>⋮ (three dots)</strong> in the top-right corner and select
                <strong>Open in Chrome</strong> or <strong>Open in External Browser</strong>.
            </p>
            <div class="jb-ig-banner-actions">
                <button type="button" class="jb-ig-banner-primary" data-ig-banner-opened>I Opened It</button>
            </div>
        </div>
    `;

    const dismiss = () => {
        rememberPopupDismissal();
        hidePopup(root);
    };

    root.querySelector('[data-ig-banner-dismiss]')?.addEventListener('click', dismiss);
    root.querySelector('[data-ig-banner-opened]')?.addEventListener('click', dismiss);

    return root;
}

function mountNotices() {
    if (!document.body) return;

    // Red notice: every Instagram visit, every page load (not stored / not dismissible).
    if (!document.getElementById(RED_NOTICE_ID)) {
        document.body.appendChild(buildRedNotice());
    }

    // Popup: only if user has not dismissed it yet.
    if (!document.getElementById(POPUP_ID) && !wasPopupDismissed()) {
        document.body.appendChild(buildPopup());
    }
}

/**
 * Instagram-only notices. Safe to call multiple times (idempotent).
 * No-op for Chrome, Safari, Firefox, Edge, and all non-Instagram browsers.
 */
export function initInstagramBrowserBanner() {
    if (typeof document === 'undefined') return;
    if (!isInstagramInAppBrowser()) return;

    injectStyles();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountNotices, { once: true });
    } else {
        mountNotices();
    }
}
