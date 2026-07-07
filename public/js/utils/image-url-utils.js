const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|gif|avif|bmp)(\?.*)?$/i;

const KNOWN_DIRECT_IMAGE_HOSTS = new Set([
    'res.cloudinary.com'
]);

export const MAX_PRODUCT_IMAGES = 5;

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
            error: `${label}: use a Cloudinary secure_url or a direct https image link ending in .jpg, .png, or .webp.`
        };
    }

    return { ok: true, url: clean };
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