const WISHLIST_STORAGE_KEY = 'jewelbazaari_wishlist';

function readWishlist() {
    try {
        const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Failed to read wishlist:', error);
        return [];
    }
}

function writeWishlist(wishlist) {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    window.dispatchEvent(new CustomEvent('jewelbazaari:wishlist-updated', { detail: { wishlist } }));
}

export function getWishlist() {
    return readWishlist();
}

export function getWishlistCount() {
    return readWishlist().length;
}

export function isInWishlist(id) {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) return false;
    return readWishlist().some((item) => item.id === normalizedId);
}

export function addToWishlist(product) {
    const id = String(product.id || '').trim();
    if (!id) return readWishlist();

    const wishlist = readWishlist();
    if (wishlist.some((item) => item.id === id)) {
        return wishlist;
    }

    wishlist.push({
        id,
        name: product.name || 'Product',
        price: Number(product.price) || 0,
        imageUrl: product.imageUrl || '',
        vendor: product.vendor || 'Verified Vendor'
    });

    writeWishlist(wishlist);
    return wishlist;
}

export function removeFromWishlist(id) {
    const normalizedId = String(id || '').trim();
    const wishlist = readWishlist().filter((item) => item.id !== normalizedId);
    writeWishlist(wishlist);
    return wishlist;
}

export function toggleWishlist(product) {
    const id = String(product.id || '').trim();
    if (!id) return readWishlist();

    if (isInWishlist(id)) {
        return removeFromWishlist(id);
    }
    return addToWishlist(product);
}