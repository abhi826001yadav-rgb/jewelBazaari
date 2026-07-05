const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://jewelbazaari.com';
const SITE_NAME = 'jewelBazaari';
const publicDir = path.join(__dirname, '..', 'public');

const PAGE_SEO = JSON.parse(
    fs.readFileSync(path.join(publicDir, 'js', 'seo-pages.json'), 'utf8')
);

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