const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  loadHeaders,
  resolveHeaders,
  loadRedirects,
  resolveRedirect
} = require('./cf-pages-utils');


const projectRoot = path.join(__dirname, '..');
const root = path.join(projectRoot, 'public');
const port = Number(process.env.PORT || 3000);


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

const server = http.createServer(async (req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  const redirect = resolveRedirect(redirects, urlPath);
  if (redirect) {
    res.writeHead(redirect.status, {
      Location: redirect.to,
      ...resolveHeaders(headerRules, urlPath)
    });
    res.end();
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, resolveHeaders(headerRules, urlPath));
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const resolved = resolveHeaders(headerRules, urlPath);
    const contentType = resolved['Content-Type'] || types[ext] || 'application/octet-stream';

    res.writeHead(200, {
      ...resolved,
      'Content-Type': contentType
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`jewelBazaari running at http://localhost:${port}`);
  console.log(`Loaded ${headerRules.length} _headers rules, ${redirects.length} _redirects`);
  console.log('Vendor image uploads: direct to Cloudinary from the browser (see public/js/utils/cloudinary-config.js)');
});