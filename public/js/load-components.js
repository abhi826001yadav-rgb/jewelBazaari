import { getEmbeddedComponent } from './layout-components.js';

export function resolveIncludePath(path) {
    const clean = String(path || '').trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        return clean;
    }
    return new URL(clean.replace(/^\//, ''), window.location.href).href;
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
        if (!url || tried.has(url)) continue;
        tried.add(url);

        try {
            const response = await fetch(url);
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
}