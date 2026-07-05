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

export function buildResponsiveImageMarkup({
    src,
    webpSrc = '',
    alt = '',
    className = '',
    width = '',
    height = '',
    loading = 'lazy',
    fetchPriority = '',
    sizes = ''
}) {
    const attrs = [
        `alt="${alt.replace(/"/g, '&quot;')}"`,
        className ? `class="${className}"` : '',
        width ? `width="${width}"` : '',
        height ? `height="${height}"` : '',
        `loading="${loading}"`,
        'decoding="async"',
        fetchPriority ? `fetchpriority="${fetchPriority}"` : '',
        sizes ? `sizes="${sizes}"` : ''
    ].filter(Boolean).join(' ');

    if (webpSrc) {
        return `<picture><source srcset="${webpSrc}" type="image/webp"><img src="${src}" ${attrs}></picture>`;
    }

    return `<img src="${src}" ${attrs}>`;
}