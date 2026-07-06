const LUCIDE_READY_EVENT = 'jewelbazaari:lucide-ready';

export function scheduleIdleTask(task, timeout = 2000) {
    if (typeof task !== 'function') return;

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => task(), { timeout });
        return;
    }

    window.setTimeout(task, 0);
}

export function initLucideIcons(root = document) {
    const run = () => {
        if (!window.lucide?.createIcons) return;
        window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } }, root);
        window.dispatchEvent(new CustomEvent(LUCIDE_READY_EVENT));
    };

    if (window.lucide?.createIcons) {
        run();
        return;
    }

    window.addEventListener('load', run, { once: true });
}

export function scheduleStorefrontUiInit() {
    import('./build-version.js').then(({ BUILD_VERSION }) => {
        import(`./header-search.js?v=${BUILD_VERSION}`);
        import(`./home-search-rotator.js?v=${BUILD_VERSION}`).then(({ initHomeSearchRotator }) => initHomeSearchRotator());
    });
    import('./accessibility.js').then(() => {
        window.jbA11y?.ensureSkipLink?.();
    });
    import('./mobile-perf.js').then(({ initMobilePerfHints }) => initMobilePerfHints());
    scheduleIdleTask(() => {
        import('./cart-ui.js').then(({ initCartUI }) => initCartUI());
        import('./wishlist-ui.js').then(({ initWishlistUI }) => initWishlistUI());
    });
}

export function initLinkPrefetch() {
    const prefetched = new Set();

    const prefetch = (href) => {
        const clean = String(href || '').trim();
        if (!clean || prefetched.has(clean) || !clean.endsWith('.html')) return;

        try {
            const url = new URL(clean, window.location.href);
            if (url.origin !== window.location.origin) return;
        } catch {
            return;
        }

        prefetched.add(clean);
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = clean;
        link.as = 'document';
        document.head.appendChild(link);
    };

    document.addEventListener('mouseover', (event) => {
        const anchor = event.target.closest('a[href]');
        if (!anchor) return;
        prefetch(anchor.getAttribute('href'));
    }, { passive: true });

    document.addEventListener('focusin', (event) => {
        const anchor = event.target.closest('a[href]');
        if (!anchor) return;
        prefetch(anchor.getAttribute('href'));
    });
}

