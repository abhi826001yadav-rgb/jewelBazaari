const fs = require('fs');
const path = require('path');
const {
  loadHeaders,
  loadRedirects,
  resolveHeaders,
  matchPattern
} = require('./cf-pages-utils');

const root = path.join(__dirname, '..', 'public');

const REQUIRED_GLOBAL_HEADERS = [
  'Strict-Transport-Security',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Content-Security-Policy',
  'Referrer-Policy'
];

const IMMUTABLE_PREFIXES = ['/css/', '/js/', '/images/'];
const HTML_PAGES = fs
  .readdirSync(root)
  .filter((name) => name.endsWith('.html'))
  .map((name) => `/${name}`);

let errors = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors += 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

if (!fs.existsSync(path.join(root, '_headers'))) {
  fail('_headers is missing from public/');
}

if (!fs.existsSync(path.join(root, '_redirects'))) {
  fail('_redirects is missing from public/');
}

const headerRules = loadHeaders(root);
const redirects = loadRedirects(root);

if (headerRules.length === 0) {
  fail('_headers contains no rules');
} else {
  ok(`${headerRules.length} header rules parsed`);
}

if (redirects.length === 0) {
  fail('_redirects contains no rules');
} else {
  ok(`${redirects.length} redirect rules parsed`);
}

const globalHeaders = resolveHeaders(headerRules, '/gold.html');
for (const name of REQUIRED_GLOBAL_HEADERS) {
  if (!globalHeaders[name]) {
    fail(`Global security header missing: ${name}`);
  }
}

for (const prefix of IMMUTABLE_PREFIXES) {
  const sample = `${prefix}sample.asset`;
  const cache = resolveHeaders(headerRules, sample)['Cache-Control'] || '';
  if (!cache.includes('immutable')) {
    fail(`${prefix}* is missing immutable Cache-Control`);
  }
  if (!cache.includes('31536000')) {
    fail(`${prefix}* is missing 1-year max-age`);
  }
}

for (const page of HTML_PAGES) {
  const cache = resolveHeaders(headerRules, page)['Cache-Control'] || '';
  if (cache.includes('immutable')) {
    fail(`${page} must not be marked immutable`);
  }
}

const indexCache = resolveHeaders(headerRules, '/index.html')['Cache-Control'] || '';
if (!indexCache.includes('stale-while-revalidate')) {
  fail('/index.html is missing stale-while-revalidate');
}

for (const privatePage of ['/admin.html', '/vendor-upload.html']) {
  const cache = resolveHeaders(headerRules, privatePage)['Cache-Control'] || '';
  if (!cache.includes('no-store')) {
    fail(`${privatePage} must use no-store`);
  }
}

const htmlCspRule = headerRules.find((rule) => rule.pattern === '/*.html');
const indexCspRule = headerRules.find((rule) => rule.pattern === '/index.html');

for (const [label, rule] of [['/*.html', htmlCspRule], ['/index.html', indexCspRule]]) {
  const csp = rule?.headers['Content-Security-Policy'] || '';
  if (!csp.includes('connect-src')) {
    fail(`${label} must include Content-Security-Policy connect-src (Cloudflare uses best-match rule only)`);
  }
  if (!csp.includes('firebasestorage')) {
    fail(`${label} CSP must allow Firebase storage hosts`);
  }
  if (!csp.includes('api.cloudinary.com')) {
    fail(`${label} CSP must allow Cloudinary uploads (api.cloudinary.com)`);
  }
}

// Cloudflare 308-strips .html → clean URL. Any /slug → /slug.html 301 loops forever.
const loopRiskySlugs = [
  'gold', 'diamond', 'gemstones', 'earrings', 'rings',
  'wedding', 'combos', 'more', 'query', 'all-jewellery',
  'admin', 'vendor-upload', 'track-order', 'index', 'home'
];

for (const slug of loopRiskySlugs) {
  const loopRule = redirects.find((entry) => {
    if (entry.from !== `/${slug}` && entry.from !== `/${slug}/`) return false;
    const dest = String(entry.to || '');
    return dest === `/${slug}.html` || dest.endsWith(`/${slug}.html`) || dest === `${slug}.html`;
  });
  if (loopRule) {
    fail(`Redirect loop risk: remove ${loopRule.from} -> ${loopRule.to} (conflicts with Cloudflare .html → /${slug} 308)`);
  }
}

const duplicateRedirects = redirects
  .map((entry) => entry.from)
  .filter((from, index, list) => list.indexOf(from) !== index);

if (duplicateRedirects.length > 0) {
  fail(`Duplicate redirect sources: ${[...new Set(duplicateRedirects)].join(', ')}`);
}

const unmatchedHeaderPatterns = headerRules
  .filter((rule) => rule.pattern !== '/*' && !rule.pattern.includes('*'))
  .filter((rule) => !rule.pattern.endsWith('.html') && !HTML_PAGES.includes(rule.pattern))
  .filter((rule) => !['/robots.txt', '/sitemap.xml'].includes(rule.pattern));

for (const rule of unmatchedHeaderPatterns) {
  if (!fs.existsSync(path.join(root, rule.pattern.replace(/^\//, '')))) {
    console.warn(`WARN: _headers path may not exist: ${rule.pattern}`);
  }
}

if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
}

console.log('\nCloudflare Pages configuration validated successfully.');