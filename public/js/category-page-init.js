import { scheduleStorefrontUiInit, initLinkPrefetch } from './performance-boot.js';

export async function initCategoryPage(loadProducts, options = {}) {
    const gridId = options.gridId || 'products-grid';
    const [
        { loadPageLayout, renderProducts, setupSearch, showLoading, showError },
        products
    ] = await Promise.all([
        import('./product-ui.js'),
        loadProducts()
    ]);

    scheduleStorefrontUiInit();
    initLinkPrefetch();

    await loadPageLayout();
    renderProducts(products, gridId, options.countId, options.emptyId);
    setupSearch(products, (filtered) => renderProducts(filtered, gridId, options.countId, options.emptyId));

    return products;
}

export async function initCategoryPageDeferred(loadProducts, options = {}) {
    const gridId = options.gridId || 'products-grid';
    const { loadPageLayout, renderProducts, setupSearch, showLoading, showError } = await import('./product-ui.js');

    scheduleStorefrontUiInit();
    initLinkPrefetch();
    showLoading(gridId);

    await loadPageLayout();

    try {
        const products = await loadProducts();
        renderProducts(products, gridId, options.countId, options.emptyId);
        setupSearch(products, (filtered) => renderProducts(filtered, gridId, options.countId, options.emptyId));
        return products;
    } catch (error) {
        console.error('Category page load error:', error);
        showError(gridId);
        return [];
    }
}