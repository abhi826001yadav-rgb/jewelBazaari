const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|gif|avif|bmp)(\?.*)?$/i;

const KNOWN_DIRECT_IMAGE_HOSTS = new Set([
    'res.cloudinary.com'
]);

export const MAX_PRODUCT_IMAGES = 3;

/** Cloudinary delivery transforms for adaptive format + quality (site speed). */
export const CLOUDINARY_AUTO_TRANSFORMS = 'f_auto,q_auto';

export function normalizeImageUrl(url) {
    return String(url || '').trim();
}

export function isCloudinaryImageUrl(url) {
    try {
        const parsed = new URL(String(url || '').trim());
        return parsed.hostname.toLowerCase() === 'res.cloudinary.com';
    } catch {
        return false;
    }
}

/**
 * Inject f_auto,q_auto into a Cloudinary delivery URL when missing.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function withCloudinaryAutoOptimization(url) {
    const clean = normalizeImageUrl(url);
    if (!clean || !isCloudinaryImageUrl(clean)) {
        return clean;
    }

    // Already has both auto transforms somewhere in the URL.
    if (clean.includes('f_auto') && clean.includes('q_auto')) {
        return clean;
    }

    const marker = '/image/upload/';
    const markerIndex = clean.indexOf(marker);
    if (markerIndex === -1) {
        return clean;
    }

    const prefix = clean.slice(0, markerIndex + marker.length);
    const rest = clean.slice(markerIndex + marker.length);

    // Avoid double-prefix if a partial auto transform is already first.
    if (rest.startsWith(`${CLOUDINARY_AUTO_TRANSFORMS}/`) || rest === CLOUDINARY_AUTO_TRANSFORMS) {
        return clean;
    }

    return `${prefix}${CLOUDINARY_AUTO_TRANSFORMS}/${rest}`;
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
    const isKnownHost = KNOWN_DIRECT_IMAGE_HOSTS.has(host);
    const isCloudinaryHost = host === 'res.cloudinary.com';
    const hasImageExtension = IMAGE_EXTENSION_PATTERN.test(parsed.pathname);

    if (!isKnownHost && !isCloudinaryHost && !hasImageExtension) {
        return {
            ok: false,
            error: `${label}: use a Cloudinary secure_url or a direct https image link ending in .jpg or .png.`
        };
    }

    return { ok: true, url: withCloudinaryAutoOptimization(clean) };
}

export function validateProductImageUrls({
    imageUrl,
    imageUrl2,
    imageUrl3,
    imageUrl4,
    imageUrl5
} = {}) {
    const fields = [
        { value: imageUrl, label: 'Image 1', required: true },
        { value: imageUrl2, label: 'Image 2', required: false },
        { value: imageUrl3, label: 'Image 3', required: false },
        { value: imageUrl4, label: 'Image 4', required: false },
        { value: imageUrl5, label: 'Image 5', required: false }
    ];

    const validated = {};

    for (const field of fields) {
        const result = validateDirectImageUrl(field.value, {
            required: field.required,
            label: field.label
        });

        if (!result.ok) {
            throw new Error(result.error);
        }

        if (result.url) {
            const key = field.label === 'Image 1'
                ? 'imageUrl'
                : `imageUrl${field.label.split(' ')[1]}`;
            validated[key] = result.url;
        }
    }

    return validated;
}