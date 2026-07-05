export function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export const IMAGE_FALLBACK_DATA_URI =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23f3f4f6' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' fill='%239ca3af' text-anchor='middle' dy='.3em'%3ENo image%3C/text%3E%3C/svg%3E";

export function sanitizeImageUrl(url, fallback = IMAGE_FALLBACK_DATA_URI) {
    const clean = String(url || '').trim();
    if (!clean) return fallback;

    if (clean.startsWith('data:image/')) {
        return clean.slice(0, 2048);
    }

    try {
        const parsed = new URL(clean, window.location.origin);
        if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
            return fallback;
        }
        if (parsed.protocol !== 'https:') {
            return fallback;
        }
        return parsed.href;
    } catch {
        return fallback;
    }
}

export function bindImageFallback(img, fallbackSrc = IMAGE_FALLBACK_DATA_URI) {
    if (!img || img.dataset.fallbackBound === 'true') return;
    img.dataset.fallbackBound = 'true';
    img.addEventListener('error', () => {
        if (img.src !== fallbackSrc) {
            img.src = fallbackSrc;
        }
    });
}

export function sanitizeCartItem(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
    }

    const id = String(item.id || '').trim().slice(0, 128);
    if (!id) return null;

    const quantity = Number.parseInt(item.quantity, 10);
    const price = Number(item.price);

    return {
        id,
        name: String(item.name || 'Product').trim().slice(0, 200) || 'Product',
        price: Number.isFinite(price) ? Math.min(Math.max(price, 0), 1e9) : 0,
        imageUrl: String(item.imageUrl || '').trim().slice(0, 2048),
        quantity: Number.isFinite(quantity) ? Math.min(Math.max(quantity, 1), 99) : 1
    };
}

export function sanitizeWishlistItem(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
    }

    const id = String(item.id || '').trim().slice(0, 128);
    if (!id) return null;

    const price = Number(item.price);

    return {
        id,
        name: String(item.name || 'Product').trim().slice(0, 200) || 'Product',
        price: Number.isFinite(price) ? Math.min(Math.max(price, 0), 1e9) : 0,
        imageUrl: String(item.imageUrl || '').trim().slice(0, 2048),
        vendor: String(item.vendor || 'Verified Vendor').trim().slice(0, 120) || 'Verified Vendor'
    };
}

export function sanitizeStoredList(raw, sanitizer) {
    if (!Array.isArray(raw)) return [];
    return raw.map(sanitizer).filter(Boolean);
}