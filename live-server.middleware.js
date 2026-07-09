/**
 * Live Server clean-URL rewrites (VS Code Live Server + npm live-server).
 * Maps /vendor-upload → /vendor-upload.html so extensionless nav works locally.
 *
 * Supports both middleware shapes:
 *  - npm live-server: module.exports = (connect, liveServer, opts) => (req, res, next) => {}
 *  - app-style setup: module.exports = function setup(app) { app.use(...) }
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');

function listHtmlPages() {
  try {
    return fs
      .readdirSync(PUBLIC_DIR)
      .filter((name) => name.endsWith('.html') && name !== 'index.html')
      .map((name) => name.replace(/\.html$/i, ''));
  } catch {
    return [
      'admin',
      'vendor-upload',
      'all-jewellery',
      'gold',
      'diamond',
      'gemstones',
      'earrings',
      'rings',
      'wedding',
      'combos',
      'more',
      'query',
      'track-order'
    ];
  }
}

const CLEAN_PAGES = listHtmlPages();

function rewriteUrl(rawUrl) {
  if (!rawUrl) return rawUrl;

  const [pathname, ...searchParts] = rawUrl.split('?');
  const search = searchParts.length ? `?${searchParts.join('?')}` : '';
  const clean = decodeURIComponent(pathname || '/').replace(/\/+$/, '') || '/';

  if (clean === '/' || clean === '/index') {
    return `/index.html${search}`;
  }

  // Already has an extension (file asset or explicit .html)
  const base = clean.split('/').pop() || '';
  if (base.includes('.')) {
    return rawUrl;
  }

  const slug = clean.replace(/^\//, '');
  if (CLEAN_PAGES.includes(slug)) {
    return `/${slug}.html${search}`;
  }

  // Nested-looking clean path without extension → try .html sibling
  const htmlCandidate = path.join(PUBLIC_DIR, `${slug}.html`);
  if (fs.existsSync(htmlCandidate)) {
    return `/${slug}.html${search}`;
  }

  return rawUrl;
}

function rewriteMiddleware(req, res, next) {
  const original = req.url;
  const rewritten = rewriteUrl(original);
  if (rewritten !== original) {
    req.url = rewritten;
  }
  next();
}

function setup(appOrConnect) {
  // App-style: setup(app) where app.use exists
  if (appOrConnect && typeof appOrConnect.use === 'function') {
    appOrConnect.use(rewriteMiddleware);
    return rewriteMiddleware;
  }

  // npm live-server style: export (connect, liveServer, opts) => middleware
  return rewriteMiddleware;
}

// npm live-server calls: require(mw)(connect, liveServer, opts)
// and expects a request handler function back.
module.exports = function liveServerCleanUrls(connect, liveServer, opts) {
  if (connect && typeof connect.use === 'function' && arguments.length === 1) {
    return setup(connect);
  }
  return rewriteMiddleware;
};

module.exports.setup = setup;
module.exports.rewriteUrl = rewriteUrl;
