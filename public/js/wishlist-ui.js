import {
    getWishlist,
    getWishlistCount,
    isInWishlist,
    toggleWishlist,
    removeFromWishlist
} from './wishlist-service.js';
import { addToCart } from './cart-service.js';
import { announce, openAccessibleDialog, closeAccessibleDialog } from './accessibility.js';
import { escapeHtml, sanitizeImageUrl } from './security-utils.js';
import { formatProductPrice } from './format-utils.js';

const WISHLIST_PINK = '#E75480';

function heartSvg(filled = false) {
    if (filled) {
        return `<svg class="w-4 h-4 transition-all duration-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${WISHLIST_PINK}" stroke="${WISHLIST_PINK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
    }
    return `<svg class="w-4 h-4 transition-all duration-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
}

export function buildWishlistHeartButton(product, positionClass = 'absolute top-3 right-3') {
    const id = String(product.id || '').trim();
    if (!id) return '';

    const imageSrc = sanitizeImageUrl(product.imageUrl, 'https://picsum.photos/id/1015/400/400');
    const liked = isInWishlist(id);
    const activeClass = liked
        ? 'border-[#E75480]/40 text-[#E75480] bg-white'
        : 'border-gray-200 text-gray-400 bg-white/90 hover:text-[#E75480] hover:border-[#E75480]/40';

    return `
        <button type="button"
            data-wishlist-toggle
            data-wishlist-id="${escapeHtml(id)}"
            data-wishlist-name="${escapeHtml(product.name || 'Product')}"
            data-wishlist-price="${escapeHtml(product.price || 0)}"
            data-wishlist-image="${escapeHtml(imageSrc)}"
            data-wishlist-vendor="${escapeHtml(product.vendor || 'Verified Vendor')}"
            class="wishlist-heart-btn ${positionClass} z-10 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-110 ${activeClass}"
            aria-label="${liked ? 'Remove from wishlist' : 'Add to wishlist'}">
            ${heartSvg(liked)}
        </button>
    `;
}

function ensureWishlistDrawer() {
    if (document.getElementById('wishlist-drawer')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="wishlist-drawer-overlay" class="hidden fixed inset-0 bg-black/50 z-[200]" aria-hidden="true"></div>
        <aside id="wishlist-drawer" class="hidden fixed top-0 right-0 h-full w-full max-w-md bg-[#FAF7F2] shadow-2xl z-[202] flex flex-col border-l border-[#9B7E4B]/30" aria-labelledby="wishlist-drawer-title">
            <div class="bg-[#4A0E17] text-white px-5 py-4 flex items-center justify-between">
                <h2 id="wishlist-drawer-title" class="text-lg font-semibold">Your Wishlist</h2>
                <button type="button" id="wishlist-drawer-close" class="text-2xl leading-none text-white/80 hover:text-white" aria-label="Close wishlist">&times;</button>
            </div>
            <div id="wishlist-drawer-items" class="flex-1 overflow-y-auto p-4 space-y-4"></div>
        </aside>
    `);
}

export function updateWishlistBadge() {
    const count = getWishlistCount();
    const hasItems = count > 0;

    document.querySelectorAll('#wishlist-icon-btn, [data-wishlist-icon]').forEach((button) => {
        button.setAttribute('aria-label', hasItems ? `Wishlist, ${count} item${count === 1 ? '' : 's'}` : 'Wishlist');
    });

    document.querySelectorAll('[data-wishlist-header-heart]').forEach((heart) => {
        if (hasItems) {
            heart.textContent = '❤️';
            heart.style.color = WISHLIST_PINK;
            heart.classList.remove('opacity-60', 'opacity-80');
        } else {
            heart.textContent = '🤍';
            heart.style.color = '';
            heart.classList.remove('opacity-60');
            heart.classList.add('opacity-80');
        }
    });
}

export function syncWishlistHeartStates() {
    document.querySelectorAll('[data-wishlist-toggle]').forEach((button) => {
        const id = button.getAttribute('data-wishlist-id');
        const liked = isInWishlist(id);

        button.classList.remove('border-[#E75480]/40', 'text-[#E75480]', 'border-gray-200', 'text-gray-400', 'bg-white/90', 'bg-white');
        if (liked) {
            button.classList.add('border-[#E75480]/40', 'text-[#E75480]', 'bg-white');
        } else {
            button.classList.add('border-gray-200', 'text-gray-400', 'bg-white/90');
        }

        button.setAttribute('aria-label', liked ? 'Remove from wishlist' : 'Add to wishlist');
        button.innerHTML = heartSvg(liked);
    });
}

function renderWishlistDrawer() {
    const itemsEl = document.getElementById('wishlist-drawer-items');
    if (!itemsEl) return;

    const wishlist = getWishlist();

    if (!wishlist.length) {
        itemsEl.innerHTML = '<p class="text-center text-gray-500 py-10">Your wishlist is empty.</p>';
        return;
    }

    itemsEl.innerHTML = wishlist.map((item) => `
        <div class="bg-white border border-gray-200 rounded-xl p-3" data-wishlist-item="${escapeHtml(item.id)}">
            <div class="flex gap-3">
                <a href="product.html?id=${encodeURIComponent(item.id)}" class="shrink-0" aria-label="View ${escapeHtml(item.name)} details">
                    <img src="${escapeHtml(sanitizeImageUrl(item.imageUrl, 'https://picsum.photos/id/1015/100/100'))}" alt="${escapeHtml(item.name)}" class="w-20 h-20 object-cover rounded-lg bg-gray-100" width="80" height="80" loading="lazy" decoding="async">
                </a>
                <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-sm text-[#2A2A2A] line-clamp-2">
                        <a href="product.html?id=${encodeURIComponent(item.id)}" class="hover:text-[#4A0E17] transition">${escapeHtml(item.name)}</a>
                    </h3>
                    <p class="text-[10px] uppercase text-[#9B7E4B] font-semibold tracking-wider mt-1">${escapeHtml(item.vendor || 'Verified Vendor')}</p>
                    <p class="jb-price text-sm font-bold text-[#4A0E17] mt-1">${formatProductPrice(item.price)}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button type="button"
                    data-wishlist-add-cart="${escapeHtml(item.id)}"
                    data-wishlist-add-name="${escapeHtml(item.name)}"
                    data-wishlist-add-price="${escapeHtml(item.price || 0)}"
                    data-wishlist-add-image="${escapeHtml(item.imageUrl || '')}"
                    class="flex-1 py-2 text-xs font-medium bg-[#4A0E17] text-white rounded-full hover:bg-[#3A0A12]">
                    Add to Cart
                </button>
                <button type="button" data-wishlist-remove="${escapeHtml(item.id)}"
                    class="px-4 py-2 text-xs font-medium border border-red-200 text-red-600 rounded-full hover:bg-red-50">
                    Remove
                </button>
            </div>
        </div>
    `).join('');
}

let wishlistDrawerTrigger = null;

export function openWishlistDrawer(trigger = document.activeElement) {
    ensureWishlistDrawer();
    renderWishlistDrawer();
    wishlistDrawerTrigger = trigger;
    openAccessibleDialog({
        panel: document.getElementById('wishlist-drawer'),
        overlay: document.getElementById('wishlist-drawer-overlay'),
        trigger,
        labelledBy: 'wishlist-drawer-title',
        initialFocus: document.getElementById('wishlist-drawer-close')
    });
    const count = getWishlistCount();
    announce(`Wishlist opened. ${count} item${count === 1 ? '' : 's'}.`);
}

export function closeWishlistDrawer() {
    closeAccessibleDialog({
        panel: document.getElementById('wishlist-drawer'),
        overlay: document.getElementById('wishlist-drawer-overlay')
    });
    wishlistDrawerTrigger = null;
}

function handleWishlistToggle(button) {
    const product = {
        id: button.getAttribute('data-wishlist-id'),
        name: button.getAttribute('data-wishlist-name') || 'Product',
        price: button.getAttribute('data-wishlist-price') || 0,
        imageUrl: button.getAttribute('data-wishlist-image') || '',
        vendor: button.getAttribute('data-wishlist-vendor') || 'Verified Vendor'
    };

    toggleWishlist(product);
    updateWishlistBadge();
    syncWishlistHeartStates();

    if (!document.getElementById('wishlist-drawer')?.classList.contains('hidden')) {
        renderWishlistDrawer();
    }
}

let initialized = false;

export function initWishlistUI() {
    if (initialized) {
        updateWishlistBadge();
        syncWishlistHeartStates();
        return;
    }
    initialized = true;

    ensureWishlistDrawer();
    updateWishlistBadge();
    syncWishlistHeartStates();

    document.addEventListener('click', (event) => {
        const wishlistIcon = event.target.closest('#wishlist-icon-btn, [data-wishlist-icon]');
        if (wishlistIcon) {
            event.preventDefault();
            openWishlistDrawer(wishlistIcon);
            return;
        }

        const heartButton = event.target.closest('[data-wishlist-toggle]');
        if (heartButton) {
            event.preventDefault();
            event.stopPropagation();
            handleWishlistToggle(heartButton);
            return;
        }

        if (event.target.id === 'wishlist-drawer-close' || event.target.id === 'wishlist-drawer-overlay') {
            closeWishlistDrawer();
            return;
        }

        const removeId = event.target.getAttribute('data-wishlist-remove');
        if (removeId) {
            removeFromWishlist(removeId);
            updateWishlistBadge();
            syncWishlistHeartStates();
            renderWishlistDrawer();
            return;
        }

        const addCartId = event.target.getAttribute('data-wishlist-add-cart');
        if (addCartId) {
            addToCart({
                id: addCartId,
                name: event.target.getAttribute('data-wishlist-add-name') || 'Product',
                price: event.target.getAttribute('data-wishlist-add-price') || 0,
                imageUrl: event.target.getAttribute('data-wishlist-add-image') || ''
            });
            import('./cart-ui.js').then(({ updateCartBadge, syncCartButtonStates }) => {
                updateCartBadge();
                syncCartButtonStates();
            });
            return;
        }
    });

    window.addEventListener('jewelbazaari:wishlist-updated', () => {
        updateWishlistBadge();
        syncWishlistHeartStates();
        if (!document.getElementById('wishlist-drawer')?.classList.contains('hidden')) {
            renderWishlistDrawer();
        }
    });
}

