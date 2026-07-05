const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|gif|avif|bmp)(\?.*)?$/i;

const KNOWN_DIRECT_IMAGE_HOSTS = new Set([
    'i.postimg.cc',
    'res.cloudinary.com'
]);

const BLOCKED_VIEWER_HOSTS = new Set([
    'postimg.cc',
    'www.postimg.cc',
    'postimages.org',
    'www.postimages.org'
]);

export function normalizeImageUrl(url) {
    return String(url || '').trim();
}

export function validateDirectImageUrl(url, { required = false, label = 'Image URL' } = {}) {
    const clean = normalizeImageUrl(url);

    if (!clean) {
        if (required) {
            return { ok: false, error: `${label} is required.` };
        }
        return { ok: true, url: '' };
    }

    let parsed;
    try {
        parsed = new URL(clean);
    } catch {
        return { ok: false, error: `${label} must be a valid link.` };
    }

    if (parsed.protocol !== 'https:') {
        return { ok: false, error: `${label} must use https://` };
    }

    const host = parsed.hostname.toLowerCase();

    if (BLOCKED_VIEWER_HOSTS.has(host)) {
        return {
            ok: false,
            error: `${label}: use the PostImages Direct link (https://i.postimg.cc/...), not the viewer page.`
        };
    }

    const isKnownHost = KNOWN_DIRECT_IMAGE_HOSTS.has(host);
    const hasImageExtension = IMAGE_EXTENSION_PATTERN.test(parsed.pathname);

    if (!isKnownHost && !hasImageExtension) {
        return {
            ok: false,
            error: `${label}: paste a Direct link ending in .jpg, .png, or .webp, or use https://i.postimg.cc/...`
        };
    }

    return { ok: true, url: clean };
}

export function validateProductImageUrls({ imageUrl, imageUrl2, imageUrl3 } = {}) {
    const primary = validateDirectImageUrl(imageUrl, { required: true, label: 'Image URL 1' });
    if (!primary.ok) {
        throw new Error(primary.error);
    }

    const second = validateDirectImageUrl(imageUrl2, { label: 'Image URL 2' });
    if (!second.ok) {
        throw new Error(second.error);
    }

    const third = validateDirectImageUrl(imageUrl3, { label: 'Image URL 3' });
    if (!third.ok) {
        throw new Error(third.error);
    }

    return {
        imageUrl: primary.url,
        imageUrl2: second.url,
        imageUrl3: third.url
    };
}