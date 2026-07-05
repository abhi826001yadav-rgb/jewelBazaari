import {
    addToCart,
    removeFromCart,
    changeQuantity,
    clearCart,
    getCart,
    getTotalItems,
    getTotalAmount
} from './cart-service.js';

function formatPrice(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function ensureCartDrawer() {
    if (document.getElementById('cart-drawer')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="cart-drawer-overlay" class="hidden fixed inset-0 bg-black/50 z-[200]"></div>
        <aside id="cart-drawer" class="hidden fixed top-0 right-0 h-full w-full max-w-md bg-[#FAF7F2] shadow-2xl z-[201] flex flex-col border-l border-[#9B7E4B]/30">
            <div class="bg-[#4A0E17] text-white px-5 py-4 flex items-center justify-between">
                <a href="index.html" aria-label="Home" class="flex items-center gap-2 text-white/90 hover:text-[#9B7E4B] transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                    <span class="text-sm font-medium"> Back to homepage </span>
                </a>
                <button type="button" id="cart-drawer-close" class="text-2xl leading-none text-white/80 hover:text-white">&times;</button>
            </div>
            <div id="cart-drawer-items" class="flex-1 overflow-y-auto p-4 space-y-4"></div>
            <div class="border-t border-gray-200 p-4 bg-white">
                <div class="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Total Items</span>
                    <span id="cart-total-items">0</span>
                </div>
                <div class="flex justify-between text-lg font-bold text-[#4A0E17] mb-4">
                    <span>Total Amount</span>
                    <span id="cart-total-amount">₹0</span>
                </div>
                <button type="button" id="cart-clear-btn" class="w-full py-2 mb-2 border border-[#9B7E4B] text-[#4A0E17] rounded-full text-sm font-medium hover:bg-[#FAF7F2]">
                    Clear Cart
                </button>
            </div>
        </aside>
    `);
}

export function updateCartBadge() {
    const count = getTotalItems();
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
        badge.textContent = String(count);
        badge.classList.toggle('hidden', count === 0);
    });
}

function renderCartDrawer() {
    const itemsEl = document.getElementById('cart-drawer-items');
    const totalItemsEl = document.getElementById('cart-total-items');
    const totalAmountEl = document.getElementById('cart-total-amount');
    if (!itemsEl) return;

    const cart = getCart();

    if (!cart.length) {
        itemsEl.innerHTML = '<p class="text-center text-gray-500 py-10">Your cart is empty.</p>';
    } else {
        itemsEl.innerHTML = cart.map((item) => `
            <div class="flex gap-3 bg-white border border-gray-200 rounded-xl p-3" data-cart-item="${escapeHtml(item.id)}">
                <img src="${escapeHtml(item.imageUrl || 'https://picsum.photos/id/1015/100/100')}" alt="${escapeHtml(item.name)}" class="w-16 h-16 object-cover rounded-lg bg-gray-100 shrink-0">
                <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-sm text-[#2A2A2A] line-clamp-2">${escapeHtml(item.name)}</h3>
                    <p class="text-sm font-bold text-[#4A0E17] mt-1">${formatPrice(item.price)}</p>
                    <div class="flex items-center gap-2 mt-2">
                        <button type="button" data-cart-decrease="${escapeHtml(item.id)}" class="w-7 h-7 rounded-full border border-gray-300 text-sm leading-none">-</button>
                        <span class="text-sm font-medium w-6 text-center">${item.quantity}</span>
                        <button type="button" data-cart-increase="${escapeHtml(item.id)}" class="w-7 h-7 rounded-full border border-gray-300 text-sm leading-none">+</button>
                        <button type="button" data-cart-remove="${escapeHtml(item.id)}" class="ml-auto text-xs text-red-600 hover:underline">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (totalItemsEl) totalItemsEl.textContent = String(getTotalItems());
    if (totalAmountEl) totalAmountEl.textContent = formatPrice(getTotalAmount());
}

export function openCartDrawer() {
    ensureCartDrawer();
    renderCartDrawer();
    document.getElementById('cart-drawer-overlay')?.classList.remove('hidden');
    document.getElementById('cart-drawer')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

export function closeCartDrawer() {
    document.getElementById('cart-drawer-overlay')?.classList.add('hidden');
    document.getElementById('cart-drawer')?.classList.add('hidden');
    document.body.style.overflow = '';
}

function rememberButtonDefault(button) {
    if (!button.dataset.cartDefaultClass) {
        button.dataset.cartDefaultClass = button.className;
        button.dataset.cartDefaultText = button.textContent.trim();
    }
}

export function applyAddedButtonState(button) {
    rememberButtonDefault(button);
    button.textContent = '✓ Added';

    if (button.className.includes('4A0E17') || button.classList.contains('rounded-full')) {
        button.className = 'px-4 py-1.5 text-xs font-medium bg-green-600 text-white rounded-full hover:bg-green-600 shrink-0';
        return;
    }

    button.className = 'text-xs uppercase font-semibold tracking-wider text-white bg-green-600 hover:bg-green-600 transition px-3 py-1 rounded-full';
}

function restoreDefaultButtonState(button) {
    if (!button.dataset.cartDefaultClass) return;
    button.className = button.dataset.cartDefaultClass;
    button.textContent = button.dataset.cartDefaultText;
}

export function syncCartButtonStates() {
    const cartIds = new Set(getCart().map((item) => item.id));

    document.querySelectorAll('[data-add-cart]').forEach((button) => {
        const id = button.getAttribute('data-add-cart');
        if (cartIds.has(id)) {
            applyAddedButtonState(button);
        } else {
            restoreDefaultButtonState(button);
        }
    });
}

function showCartSuccessNotification() {
    let toast = document.getElementById('cart-success-toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cart-success-toast';
        toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg opacity-0 transition-opacity duration-300 pointer-events-none';
        document.body.appendChild(toast);
    }

    toast.textContent = '✅ Added to Cart Successfully';
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
    }, 2000);
}

async function trackAddToCartCount(productId) {
    try {
        const { incrementAddToCartCount } = await import('./firebase-product-service.js');
        await incrementAddToCartCount(productId);
        window.dispatchEvent(new CustomEvent('jewelbazaari:add-to-cart-count-updated'));
    } catch (error) {
        console.warn('Could not update addToCartCount:', error);
    }
}

async function handleAddToCartButton(button) {
    const product = {
        id: button.getAttribute('data-add-cart'),
        name: button.getAttribute('data-add-name') || 'Product',
        price: button.getAttribute('data-add-price') || 0,
        imageUrl: button.getAttribute('data-add-image') || ''
    };

    if (!product.id) return;

    addToCart(product);
    updateCartBadge();
    applyAddedButtonState(button);
    showCartSuccessNotification();
    trackAddToCartCount(product.id);
}

let initialized = false;

export function initCartUI() {
    if (initialized) {
        updateCartBadge();
        return;
    }
    initialized = true;

    ensureCartDrawer();
    updateCartBadge();
    syncCartButtonStates();

    document.addEventListener('click', (event) => {
        const cartIcon = event.target.closest('#cart-icon-btn, [data-cart-icon]');
        if (cartIcon) {
            event.preventDefault();
            openCartDrawer();
            return;
        }

        const addButton = event.target.closest('[data-add-cart]');
        if (addButton) {
            event.preventDefault();
            event.stopPropagation();
            handleAddToCartButton(addButton);
            return;
        }

        if (event.target.id === 'cart-drawer-close' || event.target.id === 'cart-drawer-overlay') {
            closeCartDrawer();
            return;
        }

        const increaseId = event.target.getAttribute('data-cart-increase');
        if (increaseId) {
            changeQuantity(increaseId, 1);
            renderCartDrawer();
            updateCartBadge();
            trackAddToCartCount(increaseId);
            return;
        }

        const decreaseId = event.target.getAttribute('data-cart-decrease');
        if (decreaseId) {
            changeQuantity(decreaseId, -1);
            renderCartDrawer();
            updateCartBadge();
            return;
        }

        const removeId = event.target.getAttribute('data-cart-remove');
        if (removeId) {
            removeFromCart(removeId);
            renderCartDrawer();
            updateCartBadge();
            return;
        }

        if (event.target.id === 'cart-clear-btn') {
            clearCart();
            renderCartDrawer();
            updateCartBadge();
        }
    });

    window.addEventListener('jewelbazaari:cart-updated', () => {
        updateCartBadge();
        syncCartButtonStates();
        if (!document.getElementById('cart-drawer')?.classList.contains('hidden')) {
            renderCartDrawer();
        }
    });
}

