import {
    SITE_NAME,
    SITE_URL,
    SITE_TAGLINE,
    ORGANIZATION_LOGO,
    absoluteUrl,
    getPageSeo,
    getCurrentPageKey
} from './seo-config.js';

function upsertJsonLd(id, data) {
    let script = document.getElementById(id);
    if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
}

export function injectOrganizationSchema() {
    upsertJsonLd('jb-schema-organization', {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: ORGANIZATION_LOGO,
        description: SITE_TAGLINE,
        sameAs: []
    });
}

export function injectWebsiteSchema() {
    upsertJsonLd('jb-schema-website', {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_TAGLINE,
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: {
                '@type': 'ImageObject',
                url: ORGANIZATION_LOGO
            }
        }
    });
}

export function injectBreadcrumbSchema(breadcrumb = []) {
    if (!breadcrumb.length) return;

    upsertJsonLd('jb-schema-breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumb.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: absoluteUrl(item.path)
        }))
    });
}

export function renderVisibleBreadcrumb(breadcrumb = []) {
    if (breadcrumb.length < 2) return;

    const target = document.querySelector('.jb-category-hero-inner > div:first-child')
        || document.querySelector('main h1')?.parentElement;
    if (!target || target.querySelector('.jb-breadcrumb')) return;

    const nav = document.createElement('nav');
    nav.className = 'jb-breadcrumb text-xs text-[#9B7E4B] mb-2';
    nav.setAttribute('aria-label', 'Breadcrumb');

    const ol = document.createElement('ol');
    ol.className = 'flex flex-wrap items-center gap-1';

    breadcrumb.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'inline-flex items-center gap-1';

        if (index > 0) {
            const sep = document.createElement('span');
            sep.setAttribute('aria-hidden', 'true');
            sep.textContent = '/';
            li.appendChild(sep);
        }

        if (index === breadcrumb.length - 1) {
            const current = document.createElement('span');
            current.setAttribute('aria-current', 'page');
            current.className = 'text-[#4A0E17] font-medium';
            current.textContent = item.name;
            li.appendChild(current);
        } else {
            const link = document.createElement('a');
            link.href = item.path;
            link.className = 'hover:underline';
            link.textContent = item.name;
            li.appendChild(link);
        }

        ol.appendChild(li);
    });

    nav.appendChild(ol);
    target.insertBefore(nav, target.firstChild);
}

export function injectProductListSchema(products = [], pageSeo = null) {
    const seo = pageSeo || getPageSeo();
    const list = Array.isArray(products) ? products.slice(0, 20) : [];
    if (!list.length) {
        document.getElementById('jb-schema-products')?.remove();
        return;
    }

    upsertJsonLd('jb-schema-products', {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: seo.title,
        url: absoluteUrl(seo.path),
        numberOfItems: list.length,
        itemListElement: list.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: buildProductSchema(product)
        }))
    });
}

function buildProductSchema(product) {
    const price = Number(product.price);
    const image = product.imageUrl || product.images?.[0] || '';
    const schema = {
        '@type': 'Product',
        name: product.name || 'Jewellery Piece',
        description: product.description || `${product.name || 'Jewellery'} available on jewelBazaari.`,
        sku: product.id || product.productId || undefined,
        brand: {
            '@type': 'Brand',
            name: product.vendor || SITE_NAME
        },
        category: product.category || 'Jewellery'
    };

    if (image) {
        schema.image = image.startsWith('http') ? image : absoluteUrl(image.replace(/^\//, ''));
    }

    if (Number.isFinite(price) && price > 0) {
        schema.offers = {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: String(price),
            availability: 'https://schema.org/InStock',
            url: absoluteUrl(getPageSeo().path)
        };
    }

    return schema;
}

export function injectContactPageSchema() {
    upsertJsonLd('jb-schema-contact', {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contact jewelBazaari',
        url: absoluteUrl('/query.html'),
        mainEntity: {
            '@type': 'Organization',
            name: SITE_NAME,
            contactPoint: [{
                '@type': 'ContactPoint',
                telephone: '+91-8917219139',
                contactType: 'customer service',
                areaServed: 'IN',
                availableLanguage: 'English'
            }]
        }
    });
}

export function initPageSchemas(options = {}) {
    const pageKey = options.pageKey || getCurrentPageKey();
    const seo = options.pageSeo || getPageSeo(pageKey);
    injectOrganizationSchema();

    if (pageKey === 'index.html') {
        injectWebsiteSchema();
    }

    if (pageKey === 'query.html') {
        injectContactPageSchema();
    }

    if (seo.breadcrumb?.length) {
        injectBreadcrumbSchema(seo.breadcrumb);
        renderVisibleBreadcrumb(seo.breadcrumb);
    }
}