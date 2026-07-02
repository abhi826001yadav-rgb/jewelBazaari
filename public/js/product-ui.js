import { getCoverImage, getProductImages } from './product-images.js';

export function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function formatPrice(price) {
    const amount = Number(price);
    if (!amount) {
        return 'Price on request';
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatLabel(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

let galleryInitialized = false;
let galleryImages = [];
let galleryIndex = 0;

function ensureProductGalleryModal() {
    if (document.getElementById('product-gallery-modal')) return;

    document.body.insertAdjacentHTML('beforeend', `
        <div id="product-gallery-modal" class="hidden fixed inset-0 bg-black/70 z-[250] flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
                <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 id="product-gallery-title" class="font-semibold text-[#4A0E17] text-sm sm:text-base line-clamp-1"></h3>
                    <button type="button" id="product-gallery-close" class="text-2xl leading-none text-gray-500 hover:text-[#4A0E17]">&times;</button>
                </div>
                <div class="relative bg-[#FAF7F2]">
                    <img id="product-gallery-main" src="" alt="" class="w-full aspect-square object-cover">
                    <button type="button" id="product-gallery-prev" class="hidden absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-gray-200 text-[#4A0E17] hover:bg-white">&#8249;</button>
                    <button type="button" id="product-gallery-next" class="hidden absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-gray-200 text-[#4A0E17] hover:bg-white">&#8250;</button>
                </div>
                <div id="product-gallery-thumbs" class="hidden flex gap-2 p-4 justify-center bg-white border-t border-gray-100"></div>
            </div>
        </div>
    `);
}

function renderGalleryView() {
    const mainImage = document.getElementById('product-gallery-main');
    const prevBtn = document.getElementById('product-gallery-prev');
    const nextBtn = document.getElementById('product-gallery-next');
    const thumbsEl = document.getElementById('product-gallery-thumbs');

    if (!mainImage || !galleryImages.length) return;

    mainImage.src = galleryImages[galleryIndex];
    const hasMultiple = galleryImages.length > 1;

    if (prevBtn) prevBtn.classList.toggle('hidden', !hasMultiple);
    if (nextBtn) nextBtn.classList.toggle('hidden', !hasMultiple);

    if (!thumbsEl) return;

    if (!hasMultiple) {
        thumbsEl.classList.add('hidden');
        thumbsEl.innerHTML = '';
        return;
    }

    thumbsEl.classList.remove('hidden');
    thumbsEl.innerHTML = galleryImages.map((url, index) => `
        <button type="button" data-gallery-thumb="${index}"
            class="w-16 h-16 rounded-lg overflow-hidden border-2 ${index === galleryIndex ? 'border-[#9B7E4B]' : 'border-gray-200'}">
            <img src="${escapeHtml(url)}" alt="Thumbnail ${index + 1}" class="w-full h-full object-cover">
        </button>
    `).join('');
}

export function openProductGallery(product) {
    galleryImages = getProductImages(product);
    if (!galleryImages.length) return;

    ensureProductGalleryModal();
    galleryIndex = 0;

    const titleEl = document.getElementById('product-gallery-title');
    if (titleEl) titleEl.textContent = product.name || 'Product Images';

    renderGalleryView();
    document.getElementById('product-gallery-modal')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

export function closeProductGallery() {
    document.getElementById('product-gallery-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
}

export function initProductGalleryUI() {
    if (galleryInitialized) return;
    galleryInitialized = true;
    ensureProductGalleryModal();

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-product-gallery]');
        if (trigger) {
            event.preventDefault();
            event.stopPropagation();

            try {
                const images = JSON.parse(trigger.getAttribute('data-product-gallery') || '[]');
                openProductGallery({
                    name: trigger.getAttribute('data-product-name') || 'Product',
                    images
                });
            } catch (error) {
                console.error('Failed to open product gallery:', error);
            }
            return;
        }

        if (event.target.id === 'product-gallery-close' || event.target.id === 'product-gallery-modal') {
            closeProductGallery();
            return;
        }

        if (event.target.id === 'product-gallery-prev') {
            galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
            renderGalleryView();
            return;
        }

        if (event.target.id === 'product-gallery-next') {
            galleryIndex = (galleryIndex + 1) % galleryImages.length;
            renderGalleryView();
            return;
        }

        const thumbIndex = event.target.closest('[data-gallery-thumb]')?.getAttribute('data-gallery-thumb');
        if (thumbIndex !== undefined && thumbIndex !== null) {
            galleryIndex = Number(thumbIndex);
            renderGalleryView();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductGalleryUI);
} else {
    initProductGalleryUI();
}

export async function loadPageLayout() {
    const { loadPageComponents } = await import('./load-components.js');
    const announcementEl = document.getElementById('announcement-placeholder');
    const headerEl = document.getElementById('header-placeholder');
    const categoryEl = document.getElementById('category-placeholder');

    if (announcementEl) announcementEl.setAttribute('data-include', 'components/announcement.html');
    if (headerEl) headerEl.setAttribute('data-include', 'components/header.html');
    if (categoryEl) categoryEl.setAttribute('data-include', 'components/category-bar.html');

    await loadPageComponents('#announcement-placeholder, #header-placeholder, #category-placeholder');

    if (window.lucide) {
        window.lucide.createIcons();
    }

    const { initCategoryNav } = await import('./category-nav.js');
    initCategoryNav();

    const { updateCartBadge } = await import('./cart-ui.js');
    const { updateWishlistBadge } = await import('./wishlist-ui.js');
    updateCartBadge();
    updateWishlistBadge();
}

export async function renderProducts(products, gridId = 'products-grid', countId = 'product-count', emptyId = 'no-products') {
    const grid = document.getElementById(gridId);
    const countEl = document.getElementById(countId);
    const emptyEl = document.getElementById(emptyId);

    if (!grid) return;

    grid.innerHTML = '';

    if (countEl) {
        countEl.textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;
    }

    if (!products.length) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');

    const { buildWishlistHeartButton } = await import('./wishlist-ui.js');

    products.forEach((product) => {
        const card = document.createElement('article');
        card.className = 'luxury-card bg-white border border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 min-w-0';

        const images = getProductImages(product);
        const imageSrc = getCoverImage(product);
        const tags = [product.category, product.metalType, product.stoneType]
            .filter(Boolean)
            .map(formatLabel)
            .join(' • ');

        card.innerHTML = `
            <div class="aspect-square bg-gray-100 relative overflow-hidden">
                <button type="button"
                    class="product-gallery-trigger block w-full h-full"
                    data-product-gallery="${escapeHtml(JSON.stringify(images))}"
                    data-product-name="${escapeHtml(product.name || 'Product')}"
                    aria-label="View product images">
                    <img src="${escapeHtml(imageSrc)}" class="w-full h-full object-cover" alt="${escapeHtml(product.name)}" loading="lazy">
                </button>
                ${buildWishlistHeartButton({ ...product, imageUrl: imageSrc })}
                <div class="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-xs font-medium capitalize">
                    ${escapeHtml(formatLabel(product.category) || 'Jewellery')}
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-semibold text-lg text-[#2A2A2A] line-clamp-1">${escapeHtml(product.name || 'Beautiful Piece')}</h3>
                ${product.description ? `<p class="text-sm text-gray-500 mt-1 line-clamp-2">${escapeHtml(product.description)}</p>` : ''}
                ${tags ? `<p class="text-xs text-[#9B7E4B] mt-2 capitalize">${escapeHtml(tags)}</p>` : ''}
                <div class="flex items-center justify-between mt-3 gap-2">
                    <span class="text-xl font-bold text-[#4A0E17]">${formatPrice(product.price)}</span>
                    <button type="button" data-add-cart="${escapeHtml(product.id)}" data-add-name="${escapeHtml(product.name)}" data-add-price="${escapeHtml(product.price || 0)}" data-add-image="${escapeHtml(imageSrc)}"
                        class="px-4 py-1.5 text-xs font-medium bg-[#4A0E17] text-white rounded-full hover:bg-[#3A0A12] shrink-0">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    import('./cart-ui.js').then(({ syncCartButtonStates }) => syncCartButtonStates());
    import('./wishlist-ui.js').then(({ syncWishlistHeartStates }) => syncWishlistHeartStates());
}

export function showLoading(gridId = 'products-grid') {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400">Loading collection...</div>';
}

export function showError(gridId = 'products-grid', message = 'Failed to load products. Please refresh the page.') {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">${escapeHtml(message)}</div>`;
}

export function setupSearch(allProducts, onFilter) {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (!searchTerm) {
            onFilter(allProducts);
            return;
        }

        const filtered = allProducts.filter((product) =>
            (product.name && product.name.toLowerCase().includes(searchTerm)) ||
            (product.category && product.category.toLowerCase().includes(searchTerm)) ||
            (product.metalType && product.metalType.toLowerCase().includes(searchTerm)) ||
            (product.stoneType && product.stoneType.toLowerCase().includes(searchTerm)) ||
            (product.vendor && product.vendor.toLowerCase().includes(searchTerm))
        );

        onFilter(filtered);
    });
}