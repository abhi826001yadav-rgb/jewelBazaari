import { getProductById } from './firebase-product-service.js';
import { getCoverImage, getProductImages } from './product-images.js';
import {
    loadPageLayout,
    formatLabel
} from './product-ui.js';
import { formatProductPrice } from './format-utils.js';
import { escapeHtml, sanitizeImageUrl, IMAGE_FALLBACK_DATA_URI } from './security-utils.js';
import { buildWishlistHeartButton, syncWishlistHeartStates } from './wishlist-ui.js';
import { syncCartButtonStates } from './cart-ui.js';

function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get('id') || params.get('productId') || '').trim();
}

function setStatus(message, isError = false) {
    const el = document.getElementById('product-detail-status');
    const content = document.getElementById('product-detail-content');
    if (content) content.classList.add('hidden');
    if (!el) return;
    el.classList.remove('hidden');
    el.className = isError
        ? 'text-center py-16 text-red-600'
        : 'text-center py-16 text-gray-500';
    el.innerHTML = message;
}

function updateDocumentMeta(product) {
    const name = product.name || 'Product';
    const title = `${name} | jewelBazaari`;
    document.title = title;

    const description = product.description
        ? String(product.description).slice(0, 160)
        : `Shop ${name} on jewelBazaari — certified jewellery from verified sellers.`;

    const setMeta = (selector, attr, value) => {
        const node = document.querySelector(selector);
        if (node) node.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);

    const cover = sanitizeImageUrl(getCoverImage(product), '');
    if (cover) {
        setMeta('meta[property="og:image"]', 'content', cover);
        setMeta('meta[name="twitter:image"]', 'content', cover);
    }
}

function renderDetail(product) {
    const content = document.getElementById('product-detail-content');
    const status = document.getElementById('product-detail-status');
    if (!content) return;

    if (status) status.classList.add('hidden');
    content.classList.remove('hidden');

    const images = getProductImages(product);
    const cover = sanitizeImageUrl(getCoverImage(product), IMAGE_FALLBACK_DATA_URI);
    const seller = String(product.vendor || '').trim() || 'Verified Seller';
    const tags = [product.category, product.metalType, product.stoneType]
        .filter(Boolean)
        .map(formatLabel);
    const productCode = product.productId || product.productCode || product.id || '';

    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div class="space-y-4">
                <div class="relative aspect-square bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <img id="pd-main-image"
                        src="${escapeHtml(cover)}"
                        alt="${escapeHtml(product.name || 'Product')}"
                        class="w-full h-full object-cover"
                        width="1200" height="1200"
                        decoding="async" fetchpriority="high">
                    ${buildWishlistHeartButton({ ...product, imageUrl: cover }, 'absolute top-4 right-4')}
                </div>
                ${images.length > 1 ? `
                <div id="pd-thumbs" class="flex flex-wrap gap-2 justify-center sm:justify-start" role="tablist" aria-label="Product images">
                    ${images.map((url, index) => `
                        <button type="button"
                            data-pd-thumb="${index}"
                            role="tab"
                            aria-selected="${index === 0 ? 'true' : 'false'}"
                            aria-label="View image ${index + 1}"
                            class="pd-thumb w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 ${index === 0 ? 'border-[#9B7E4B]' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#9B7E4B]/40">
                            <img src="${escapeHtml(sanitizeImageUrl(url, IMAGE_FALLBACK_DATA_URI))}" alt="" class="w-full h-full object-cover" width="80" height="80" loading="lazy" decoding="async" aria-hidden="true">
                        </button>
                    `).join('')}
                </div>` : ''}
            </div>

            <div class="space-y-5">
                <div>
                    <p class="text-xs uppercase tracking-[0.18em] text-[#9B7E4B] font-semibold mb-2">jewelBazaari</p>
                    <h1 id="pd-title" class="text-2xl sm:text-3xl font-bold text-[#4A0E17] leading-tight">${escapeHtml(product.name || 'Beautiful Piece')}</h1>
                    <p class="jb-price text-2xl sm:text-3xl font-bold text-[#4A0E17] mt-3">${formatProductPrice(product.price)}</p>
                </div>

                <div class="rounded-2xl border border-[#9B7E4B]/25 bg-white p-4 sm:p-5 space-y-3">
                    <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <div>
                            <span class="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Seller</span>
                            <span class="font-semibold text-[#2A2A2A]">${escapeHtml(seller)}</span>
                        </div>
                        ${product.category ? `
                        <div>
                            <span class="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Category</span>
                            <span class="font-medium text-[#2A2A2A] capitalize">${escapeHtml(formatLabel(product.category))}</span>
                        </div>` : ''}
                        ${product.metalType ? `
                        <div>
                            <span class="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Metal</span>
                            <span class="font-medium text-[#2A2A2A] capitalize">${escapeHtml(formatLabel(product.metalType))}</span>
                        </div>` : ''}
                        ${product.stoneType ? `
                        <div>
                            <span class="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Stone</span>
                            <span class="font-medium text-[#2A2A2A] capitalize">${escapeHtml(formatLabel(product.stoneType))}</span>
                        </div>` : ''}
                    </div>
                    ${productCode ? `
                    <p class="text-xs text-gray-400 pt-1 border-t border-gray-100">
                        Product ID: <span class="font-mono text-gray-600">${escapeHtml(productCode)}</span>
                    </p>` : ''}
                </div>

                ${tags.length ? `
                <div class="flex flex-wrap gap-2">
                    ${tags.map((tag) => `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FAF7F2] border border-[#9B7E4B]/30 text-[#4A0E17]">${escapeHtml(tag)}</span>
                    `).join('')}
                </div>` : ''}

                <div>
                    <h2 class="text-sm font-semibold uppercase tracking-wider text-[#9B7E4B] mb-2">Description</h2>
                    <p class="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">${escapeHtml(product.description || 'No description provided for this piece.')}</p>
                </div>

                <div class="flex flex-col sm:flex-row gap-3 pt-2">
                    <button type="button"
                        id="pd-add-cart"
                        data-add-cart="${escapeHtml(product.id)}"
                        data-add-name="${escapeHtml(product.name || 'Product')}"
                        data-add-price="${escapeHtml(product.price || 0)}"
                        data-add-image="${escapeHtml(cover)}"
                        class="flex-1 py-3.5 px-6 rounded-full bg-[#4A0E17] text-white font-semibold text-sm tracking-wide hover:bg-black transition shadow-md">
                        Add to Cart
                    </button>
                    <a href="all-jewellery.html"
                        class="inline-flex items-center justify-center flex-1 py-3.5 px-6 rounded-full border border-[#9B7E4B] text-[#4A0E17] font-semibold text-sm hover:bg-[#FAF7F2] transition">
                        Continue Shopping
                    </a>
                </div>

                <p class="text-xs text-gray-400 leading-relaxed">
                    Secure shopping with verified sellers. Use wishlist to save pieces, and cart to review before checkout.
                </p>
            </div>
        </div>
    `;

    // Thumbnail switcher (on-page, not full-screen zoom modal).
    const mainImage = document.getElementById('pd-main-image');
    content.querySelectorAll('[data-pd-thumb]').forEach((button) => {
        button.addEventListener('click', () => {
            const index = Number(button.getAttribute('data-pd-thumb'));
            if (!Number.isFinite(index) || !images[index] || !mainImage) return;
            mainImage.src = sanitizeImageUrl(images[index], IMAGE_FALLBACK_DATA_URI);
            content.querySelectorAll('[data-pd-thumb]').forEach((thumb) => {
                const active = thumb === button;
                thumb.setAttribute('aria-selected', active ? 'true' : 'false');
                thumb.classList.toggle('border-[#9B7E4B]', active);
                thumb.classList.toggle('border-gray-200', !active);
            });
        });
    });

    syncCartButtonStates();
    syncWishlistHeartStates();
}

export async function initProductDetailPage() {
    await loadPageLayout();

    const productId = getProductIdFromUrl();
    if (!productId) {
        setStatus(
            `Product not found.<br><a href="all-jewellery.html" class="inline-block mt-4 text-[#9B7E4B] hover:underline">Browse jewellery</a>`,
            true
        );
        return;
    }

    setStatus('Loading product details...');

    try {
        const product = await getProductById(productId);
        if (!product) {
            setStatus(
                `This product is unavailable or was removed.<br><a href="all-jewellery.html" class="inline-block mt-4 text-[#9B7E4B] hover:underline">Browse jewellery</a>`,
                true
            );
            return;
        }

        updateDocumentMeta(product);
        renderDetail(product);
    } catch (error) {
        console.error('Failed to load product detail:', error);
        setStatus(
            `Failed to load this product. Please try again.<br><a href="all-jewellery.html" class="inline-block mt-4 text-[#9B7E4B] hover:underline">Browse jewellery</a>`,
            true
        );
    }
}
