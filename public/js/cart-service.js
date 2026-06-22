const CART_STORAGE_KEY = 'jewelbazaari_cart';

function readCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Failed to read cart:', error);
        return [];
    }
}

function writeCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('jewelbazaari:cart-updated', { detail: { cart } }));
}

export function getCart() {
    return readCart();
}

export function getTotalItems() {
    return readCart().reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export function getTotalAmount() {
    return readCart().reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 0), 0);
}

export function addToCart(product) {
    const cart = readCart();
    const id = String(product.id || '').trim();
    if (!id) return cart;

    const existing = cart.find((item) => item.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id,
            name: product.name || 'Product',
            price: Number(product.price) || 0,
            imageUrl: product.imageUrl || '',
            quantity: 1
        });
    }

    writeCart(cart);
    return cart;
}

export function removeFromCart(id) {
    const cart = readCart().filter((item) => item.id !== id);
    writeCart(cart);
    return cart;
}

export function updateQuantity(id, quantity) {
    const cart = readCart();
    const item = cart.find((entry) => entry.id === id);
    if (!item) return cart;

    if (quantity <= 0) {
        return removeFromCart(id);
    }

    item.quantity = quantity;
    writeCart(cart);
    return cart;
}

export function changeQuantity(id, delta) {
    const cart = readCart();
    const item = cart.find((entry) => entry.id === id);
    if (!item) return cart;
    return updateQuantity(id, (item.quantity || 1) + delta);
}

export function clearCart() {
    writeCart([]);
    return [];
}