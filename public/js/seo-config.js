import seoPages from './seo-pages.json' with { type: 'json' };

export const SITE_URL = 'https://jewelbazaari.com';
export const SITE_NAME = 'jewelBazaari';
export const SITE_TAGLINE = "India's premium multi-vendor jewellery marketplace";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/photo1.jpg`;
export const ORGANIZATION_LOGO = `${SITE_URL}/images/logo.png`;

export const PAGE_SEO = seoPages;

export function getPageSeo(pageKey = '') {
    const key = String(pageKey || '').trim() || getCurrentPageKey();
    return PAGE_SEO[key] || PAGE_SEO['index.html'];
}

export function getCurrentPageKey() {
    let path = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
    if (path.includes(' ')) return path;
    // Cloudflare Pages clean URLs (/gold) must map back to SEO keys (gold.html)
    if (path && !path.endsWith('.html') && !path.includes('.')) {
        path = `${path}.html`;
    }
    return path || 'index.html';
}

export function absoluteUrl(path = '/') {
    if (/^https?:\/\//i.test(path)) return path;
    const clean = String(path || '/').startsWith('/') ? path : `/${path}`;
    return `${SITE_URL}${clean}`;
}