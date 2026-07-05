const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://jewelbazaari.com';
const SITE_NAME = 'jewelBazaari';
const publicDir = path.join(__dirname, '..', 'public');

const PAGE_SEO = {
    'index.html': {
        title: 'jewelBazaari | Premium Jewellery Marketplace India',
        description: 'Shop certified gold, diamond, and gemstone jewellery from verified Indian vendors. Discover trending designs, new arrivals, and transparent pricing at jewelBazaari.',
        path: '/index.html',
        image: '/images/photo1.jpg',
        robots: 'index, follow'
    },
    'gold.html': {
        title: 'Gold Jewellery | jewelBazaari',
        description: 'Browse certified gold jewellery including rings, bangles, chains, necklaces, and bridal sets from verified sellers on jewelBazaari.',
        path: '/gold.html',
        image: '/images/photo2.jpg',
        robots: 'index, follow'
    },
    'diamond.html': {
        title: 'Diamond Jewellery | jewelBazaari',
        description: 'Explore certified diamond rings, earrings, pendants, and solitaires from trusted jewellers on jewelBazaari.',
        path: '/diamond.html',
        image: '/images/photo3.jpg',
        robots: 'index, follow'
    },
    'gemstones.html': {
        title: 'Gemstone Jewellery | jewelBazaari',
        description: 'Shop ruby, emerald, sapphire, pearl, and gemstone jewellery from verified vendors on jewelBazaari.',
        path: '/gemstones.html',
        image: '/images/photo4.jpg',
        robots: 'index, follow'
    },
    'earrings.html': {
        title: 'Earrings Collection | jewelBazaari',
        description: 'Discover gold, diamond, and gemstone earrings for every occasion from verified Indian jewellers.',
        path: '/earrings.html',
        image: '/images/photo2.jpg',
        robots: 'index, follow'
    },
    'rings.html': {
        title: 'Rings Collection | jewelBazaari',
        description: 'Shop engagement rings, wedding bands, and fashion rings in gold and diamond from jewelBazaari vendors.',
        path: '/rings.html',
        image: '/images/photo3.jpg',
        robots: 'index, follow'
    },
    'all-jewellery.html': {
        title: 'All Jewellery | jewelBazaari',
        description: 'Browse the complete jewelBazaari catalogue — gold, diamond, gemstones, rings, earrings, and more from verified sellers.',
        path: '/all-jewellery.html',
        image: '/images/photo1.jpg',
        robots: 'index, follow'
    },
    'wedding.html': {
        title: 'Wedding Jewellery | jewelBazaari',
        description: 'Explore bridal necklaces, mangalsutras, wedding bangles, and heritage marriage jewellery on jewelBazaari.',
        path: '/wedding.html',
        image: '/images/bride.jpg',
        robots: 'index, follow'
    },
    'combos.html': {
        title: 'Jewellery Combos | jewelBazaari',
        description: 'Curated bride, groom, and couple jewellery combos from verified vendors on jewelBazaari.',
        path: '/combos.html',
        image: '/images/couple.jpg',
        robots: 'index, follow'
    },
    'more.html': {
        title: 'More Collections | jewelBazaari',
        description: 'Discover specialty jewellery collections and vendor opportunities on jewelBazaari.',
        path: '/more.html',
        image: '/images/logo.png',
        robots: 'index, follow'
    },
    'query.html': {
        title: 'Contact Us | jewelBazaari',
        description: 'Contact jewelBazaari for order support, vendor enquiries, and customer assistance. We respond within one business day.',
        path: '/query.html',
        image: '/images/logo.png',
        robots: 'index, follow'
    },
    'admin.html': {
        title: 'Admin Dashboard | jewelBazaari',
        description: 'jewelBazaari admin access.',
        path: '/admin.html',
        image: '/images/logo.png',
        robots: 'noindex, nofollow'
    },
    'vendor-upload.html': {
        title: 'Vendor Registration | jewelBazaari',
        description: 'Register as a jewelBazaari vendor to list certified jewellery.',
        path: '/vendor-upload.html',
        image: '/images/logo.png',
        robots: 'noindex, nofollow'
    },
    'registered-vendors.html': {
        title: 'Vendor Dashboard | jewelBazaari',
        description: 'Approved jewelBazaari vendor dashboard for managing jewellery listings.',
        path: '/registered-vendors.html',
        image: '/images/logo.png',
        robots: 'noindex, nofollow'
    },
    'diamond copy.html': {
        title: 'Gemstone Jewellery | jewelBazaari',
        description: 'Legacy gemstones preview page.',
        path: '/diamond%20copy.html',
        image: '/images/photo1.jpg',
        robots: 'noindex, nofollow'
    }
};

function escapeAttr(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
}

function buildSeoBlock(seo) {
    const canonical = `${SITE_URL}${seo.path}`;
    const image = `${SITE_URL}${seo.image}`;

    return [
        `    <meta name="description" content="${escapeAttr(seo.description)}">`,
        `    <meta name="robots" content="${seo.robots}">`,
        `    <link rel="canonical" href="${canonical}">`,
        `    <meta property="og:type" content="website">`,
        `    <meta property="og:site_name" content="${SITE_NAME}">`,
        `    <meta property="og:title" content="${escapeAttr(seo.title)}">`,
        `    <meta property="og:description" content="${escapeAttr(seo.description)}">`,
        `    <meta property="og:url" content="${canonical}">`,
        `    <meta property="og:image" content="${image}">`,
        `    <meta property="og:locale" content="en_IN">`,
        `    <meta name="twitter:card" content="summary_large_image">`,
        `    <meta name="twitter:title" content="${escapeAttr(seo.title)}">`,
        `    <meta name="twitter:description" content="${escapeAttr(seo.description)}">`,
        `    <meta name="twitter:image" content="${image}">`
    ].join('\n');
}

function stripExistingSeo(html) {
    return html
        .replace(/\s*<meta name="description"[^>]*>/gi, '')
        .replace(/\s*<meta name="robots"[^>]*>/gi, '')
        .replace(/\s*<link rel="canonical"[^>]*>/gi, '')
        .replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, '')
        .replace(/\s*<meta name="twitter:[^"]+"[^>]*>/gi, '');
}

for (const [filename, seo] of Object.entries(PAGE_SEO)) {
    const filePath = path.join(publicDir, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`Skip missing file: ${filename}`);
        continue;
    }

    let html = stripExistingSeo(fs.readFileSync(filePath, 'utf8'));
    const seoBlock = buildSeoBlock(seo);
    html = html.replace(
        /<title>[^<]*<\/title>/i,
        `<title>${escapeAttr(seo.title)}</title>\n${seoBlock}`
    );

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`Updated SEO meta: ${filename}`);
}