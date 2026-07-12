const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function exists(rel) {
  return fs.existsSync(path.join(publicDir, rel.replace(/^\//, '').replace(/\//g, path.sep)));
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const allFiles = new Set(
  walk(publicDir).map((f) => path.relative(publicDir, f).replace(/\\/g, '/'))
);

const htmlFiles = [...allFiles].filter((f) => f.endsWith('.html'));
const textFiles = [...allFiles].filter((f) => /\.(html|js|css|json|xml|txt)$/.test(f));

// --- Broken internal links ---
const linkPattern = /(?:href|src)=["']([^"']+)["']/gi;
const checkedLinks = new Set();

for (const file of textFiles) {
  const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const raw = match[1].trim();
    if (!raw || raw.includes('${') || raw.startsWith('#') || raw.startsWith('data:') ||
        raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:') ||
        /^https?:/i.test(raw)) {
      continue;
    }
    const normalized = raw.split('?')[0].split('#')[0].replace(/^\//, '');
    const key = `${file} -> ${raw}`;
    if (checkedLinks.has(key)) continue;
    checkedLinks.add(key);

    if (!exists(normalized)) {
      fail(`Broken link in ${file}: ${raw}`);
    }
  }
}

// --- href="#" stubs (informational) ---
let hashLinks = 0;
for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
  hashLinks += (content.match(/href=["']#["']/g) || []).length;
}
if (hashLinks > 0) warn(`${hashLinks} placeholder href="#" links (nav stubs, not 404s)`);

// --- JS module imports ---
const importPattern = /from\s+['"](\.\/[^'"]+)['"]/g;
for (const jsFile of [...allFiles].filter((f) => f.startsWith('js/') && f.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(publicDir, jsFile), 'utf8');
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    const target = match[1].replace(/^\.\//, 'js/');
    const candidates = [target, `${target}.js`, target.replace(/\.js$/, '')];
    if (!candidates.some((c) => allFiles.has(c))) {
      fail(`Missing JS import in ${jsFile}: ${match[1]}`);
    }
  }
}

const rootHtmlPages = htmlFiles.filter((p) => !p.includes('/'));

// --- HTML pages: script/css references in HTML ---
for (const page of rootHtmlPages) {
  const content = fs.readFileSync(path.join(publicDir, page), 'utf8');
  if (!content.includes('<!DOCTYPE html>')) warn(`${page}: missing DOCTYPE`);
  if (!content.match(/<html[^>]*lang=/i)) warn(`${page}: missing lang attribute`);
  if (!content.includes('<main')) warn(`${page}: no <main> landmark`);
}

// --- Sitemap coverage ---
const sitemap = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>https:\/\/jewelbazaari\.com\/([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const urlPath of sitemapUrls) {
  if (!exists(urlPath)) fail(`Sitemap URL missing file: ${urlPath}`);
}

const indexablePages = rootHtmlPages.filter((p) => {
  const c = fs.readFileSync(path.join(publicDir, p), 'utf8');
  return !c.includes('noindex');
});
for (const page of indexablePages) {
  if (!sitemapUrls.includes(page) && page !== 'track-order.html') {
    warn(`Indexable page not in sitemap: ${page}`);
  }
}

// --- Required deploy files ---
['wrangler.toml', 'public/_headers', 'public/_redirects', 'public/robots.txt', 'public/sitemap.xml'].forEach((f) => {
  if (!fs.existsSync(path.join(root, f))) fail(`Missing deploy file: ${f}`);
});

// --- Components bundle sync ---
const componentsDir = path.join(publicDir, 'components');
const bundlePath = path.join(publicDir, 'js/layout-components.v7.js');
if (fs.existsSync(bundlePath)) {
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  for (const comp of fs.readdirSync(componentsDir).filter((f) => f.endsWith('.html'))) {
    const key = `components/${comp}`;
    if (!bundle.includes(key)) warn(`Component not in layout-components.v7.js bundle: ${key}`);
  }
}

// --- Security patterns ---
for (const jsFile of [...allFiles].filter((f) => f.endsWith('.js'))) {
  const content = fs.readFileSync(path.join(publicDir, jsFile), 'utf8');
  if (/eval\(/.test(content)) fail(`${jsFile}: contains eval()`);
  if (/document\.write\(/.test(content)) fail(`${jsFile}: contains document.write()`);
  if (/console\.log\(/.test(content)) warn(`${jsFile}: contains console.log`);
}

// --- Image sizes ---
const imagesDir = path.join(publicDir, 'images');
for (const img of fs.readdirSync(imagesDir)) {
  const size = fs.statSync(path.join(imagesDir, img)).size;
  if (size > 250 * 1024) warn(`Large image: images/${img} (${Math.round(size / 1024)} KB)`);
}

// --- Report (after hero sync so compressed banners are current) ---
async function finish() {
  try {
    await require('./sync-hero-carousel').syncHeroCarousel();
  } catch (err) {
    console.warn('[predeploy] hero carousel sync skipped:', err.message);
  }
  try {
    await require('./sync-hero-carousel-mobile').syncHeroCarouselMobile();
  } catch (err) {
    console.warn('[predeploy] mobile hero carousel sync skipped:', err.message);
  }

  console.log('=== Pre-Deploy Check ===\n');
  if (errors.length) {
    console.log('ERRORS:');
    errors.forEach((e) => console.log(`  ✗ ${e}`));
  }
  if (warnings.length) {
    console.log('\nWARNINGS:');
    warnings.forEach((w) => console.log(`  ! ${w}`));
  }
  if (!errors.length && !warnings.length) console.log('All checks passed.');
  console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

finish();