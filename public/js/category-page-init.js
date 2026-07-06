import { BUILD_VERSION } from './build-version.js';
import { scheduleStorefrontUiInit, initLinkPrefetch } from './performance-boot.js?v=20260706i';
import { getPageSeo } from './seo-config.js';
import { initPageSchemas } from './seo-schema.js';

export async function initCategoryPageDeferred(loadProducts, options = {}) {
    const gridId = options.gridId || 'products-grid';
    const pageKey = options.pageKey || null;
    const pageSeo = getPageSeo(pageKey);
    const { loadPageLayout, renderProducts, setupSearch, showLoading, showError } = await import(`./product-ui.js?v=${BUILD_VERSION}`);

    scheduleStorefrontUiInit();
    initLinkPrefetch();
    initPageSchemas({ pageKey, pageSeo });
    showLoading(gridId);

    await loadPageLayout();

    try {
        const products = await loadProducts();
        renderProducts(products, gridId, options.countId, options.emptyId, { pageSeo });
        setupSearch(products, (filtered) => renderProducts(filtered, gridId, options.countId, options.emptyId, { pageSeo }));
        return products;
    } catch (error) {
        console.error('Category page load error:', error);
        showError(gridId);
        return [];
    }
}