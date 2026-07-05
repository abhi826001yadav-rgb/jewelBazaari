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
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path.includes(' ') ? path : (path || 'index.html');
}

export function absoluteUrl(path = '/') {
    if (/^https?:\/\//i.test(path)) return path;
    const clean = String(path || '/').startsWith('/') ? path : `/${path}`;
    return `${SITE_URL}${clean}`;
}