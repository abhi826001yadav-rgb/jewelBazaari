const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  loadHeaders,
  resolveHeaders,
  loadRedirects,
  resolveRedirect
} = require('./cf-pages-utils');
const { syncHeroCarousel } = require('./sync-hero-carousel');
const { syncHeroCarouselMobile } = require('./sync-hero-carousel-mobile');


const projectRoot = path.join(__dirname, '..');
const root = path.join(projectRoot, 'public');
// Prefer 5500 (VS Code Live Server default) so bookmarks/links match; fallback 3000.
const port = Number(process.env.PORT || 5500);

/* Refresh + auto-compress homepage banners (desktop + mobile) on start */
const syncReady = Promise.resolve()
  .then(() => syncHeroCarousel())
  .catch((err) => {
    console.warn('[hero-carousel] sync failed:', err.message);
  })
  .then(() => syncHeroCarouselMobile())
  .catch((err) => {
    console.warn('[hero-carousel-mobile] sync failed:', err.message);
  });


const headerRules = loadHeaders(root);
const redirects = loadRedirects(root);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2'
};

/**
 * Production _headers are applied for realistic local testing, but two
 * directives break plain http://localhost navigation:
 *  - upgrade-insecure-requests (forces https://localhost, which is not served)
 *  - Strict-Transport-Security (pins browsers to HTTPS for localhost)
 */
function resolveLocalHeaders(urlPath) {
  const headers = { ...resolveHeaders(headerRules, urlPath) };

  delete headers['Strict-Transport-Security'];

  if (headers['Content-Security-Policy']) {
    headers['Content-Security-Policy'] = headers['Content-Security-Policy']
      .replace(/;\s*upgrade-insecure-requests/gi, '')
      .replace(/upgrade-insecure-requests\s*;?\s*/gi, '')
      .replace(/;;+/g, ';')
      .trim();
  }

  return headers;
}

const server = http.createServer(async (req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  const redirect = resolveRedirect(redirects, urlPath);
  if (redirect) {
    res.writeHead(redirect.status, {
      Location: redirect.to,
      ...resolveLocalHeaders(urlPath)
    });
    res.end();
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  let filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!path.extname(urlPath) && !fs.existsSync(filePath)) {
    const htmlPath = path.normalize(path.join(root, `${urlPath}.html`));
    if (htmlPath.startsWith(root) && fs.existsSync(htmlPath)) {
      urlPath = `${urlPath}.html`;
      filePath = htmlPath;
    }
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, resolveLocalHeaders(urlPath));
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const resolved = resolveLocalHeaders(urlPath);
    const contentType = resolved['Content-Type'] || types[ext] || 'application/octet-stream';

    res.writeHead(200, {
      ...resolved,
      'Content-Type': contentType
    });
    res.end(data);
  });
});

syncReady.finally(() => {
  server.listen(port, () => {
    console.log(`jewelBazaari running at http://localhost:${port}`);
    console.log(`Loaded ${headerRules.length} _headers rules, ${redirects.length} _redirects`);
    console.log('Local mode: HSTS + upgrade-insecure-requests disabled so http://localhost works');
    console.log('Vendor image uploads: direct to Cloudinary from the browser (see public/js/utils/cloudinary-config.js)');
  });
});