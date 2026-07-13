/**
 * Instagram in-app browser notice.
 * Shows only when User-Agent contains "Instagram".
 * Dismissal is remembered in localStorage for future Instagram sessions.
 */

const STORAGE_KEY = 'jb_ig_inapp_banner_dismissed';
const BANNER_ID = 'jb-ig-browser-banner';
const STYLE_ID = 'jb-ig-browser-banner-styles';

export function isInstagramInAppBrowser() {
    const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
    return /Instagram/i.test(ua);
}

function wasDismissed() {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function rememberDismissal() {
    try {
        window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
        // Ignore private-mode / storage failures; banner just stays hidden for this page load.
    }
}

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        #${BANNER_ID} {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 99990;
            pointer-events: none;
            padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        }
        #${BANNER_ID} .jb-ig-banner-card {
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
        #${BANNER_ID} .jb-ig-banner-close {
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
        #${BANNER_ID} .jb-ig-banner-close:hover,
        #${BANNER_ID} .jb-ig-banner-close:focus-visible {
            color: #4A0E17;
            background: rgba(74, 14, 23, 0.06);
            outline: none;
        }
        #${BANNER_ID} .jb-ig-banner-title {
            margin: 0 1.75rem 0.45rem 0;
            font-size: 0.875rem;
            font-weight: 700;
            color: #4A0E17;
            line-height: 1.35;
        }
        #${BANNER_ID} .jb-ig-banner-body {
            margin: 0 0 0.85rem;
            font-size: 0.75rem;
            line-height: 1.45;
            color: #4b5563;
        }
        #${BANNER_ID} .jb-ig-banner-body strong {
            color: #2A2A2A;
            font-weight: 600;
        }
        #${BANNER_ID} .jb-ig-banner-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        #${BANNER_ID} .jb-ig-banner-primary {
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
        #${BANNER_ID} .jb-ig-banner-primary:hover,
        #${BANNER_ID} .jb-ig-banner-primary:focus-visible {
            background: #3A0A12;
            outline: none;
        }
        #${BANNER_ID}[hidden] {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

function hideBanner(root) {
    if (!root) return;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    // Remove from DOM so it never affects stacking/focus later.
    window.setTimeout(() => {
        root.remove();
    }, 0);
}

function buildBanner() {
    const root = document.createElement('div');
    root.id = BANNER_ID;
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
        rememberDismissal();
        hideBanner(root);
    };

    root.querySelector('[data-ig-banner-dismiss]')?.addEventListener('click', dismiss);
    root.querySelector('[data-ig-banner-opened]')?.addEventListener('click', dismiss);

    return root;
}

/**
 * Show the Instagram in-app browser banner when appropriate.
 * Safe to call multiple times (idempotent).
 */
export function initInstagramBrowserBanner() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(BANNER_ID)) return;

    // Only Instagram in-app browser (User-Agent contains "Instagram").
    if (!isInstagramInAppBrowser()) return;

    // User already dismissed / confirmed open in a previous Instagram session.
    if (wasDismissed()) return;

    injectStyles();

    const mount = () => {
        if (document.getElementById(BANNER_ID)) return;
        if (!document.body) return;
        document.body.appendChild(buildBanner());
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
        mount();
    }
}

