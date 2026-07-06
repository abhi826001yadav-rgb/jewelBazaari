import { getEmbeddedComponent } from './layout-components.v6.js';

function isSameOriginUrl(url) {
    try {
        return new URL(url).origin === window.location.origin;
    } catch {
        return false;
    }
}

export function resolveIncludePath(path) {
    const clean = String(path || '').trim();
    if (!clean) return '';
    if (/^[a-z]+:/i.test(clean)) {
        return '';
    }

    const normalized = clean.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..')) {
        return '';
    }

    return new URL(normalized, `${window.location.origin}/`).href;
}

function normalizeIncludeKey(path) {
    return String(path || '').trim().replace(/^\/+/, '');
}

async function fetchIncludeHtml(path) {
    const embedded = getEmbeddedComponent(path);
    if (embedded) {
        return embedded;
    }

    const candidates = [
        resolveIncludePath(path),
        resolveIncludePath(path.replace(/^\//, '')),
        new URL(path.replace(/^\//, ''), window.location.origin + '/').href
    ];

    const tried = new Set();

    for (const url of candidates) {
        if (!url || tried.has(url) || !isSameOriginUrl(url)) continue;
        tried.add(url);

        try {
            const response = await fetch(url, { credentials: 'same-origin', redirect: 'error' });
            if (!response.ok) continue;
            const html = await response.text();
            if (html && !html.includes('Cannot GET')) {
                return html;
            }
        } catch (error) {
            console.warn('Include fetch attempt failed:', url, error);
        }
    }

    throw new Error(`Failed to load include: ${normalizeIncludeKey(path)}`);
}

function sanitizeSearchBar() {
    document.querySelectorAll('.home-search-bar .heart-icon').forEach((el) => el.remove());
}

function sanitizeHomepageHeader() {
    const nav = document.querySelector('.jb-header-layout .jb-header-nav');
    if (!nav) return;

    nav.querySelectorAll('a[href="admin.html"], a[aria-label="Admin"], a[aria-label="Home"]').forEach((link) => {
        link.remove();
    });
}

function sanitizeAdminLinks() {
    document.querySelectorAll('a[href="admin.html"]').forEach((link) => {
        const inMore = link.closest('.jb-more-submenu, .jb-more-dropdown');
        if (!inMore) {
            link.remove();
        }
    });
}

export async function loadPageComponents(selector = '[data-include]') {
    const elements = [...document.querySelectorAll(selector)];

    await Promise.all(elements.map(async (element) => {
        const includePath = element.getAttribute('data-include');
        if (!includePath) return;

        try {
            const html = await fetchIncludeHtml(includePath);
            element.outerHTML = html;
        } catch (error) {
            console.error('Component load failed:', includePath, error);
        }
    }));

    sanitizeHomepageHeader();
    sanitizeAdminLinks();
    sanitizeSearchBar();
}