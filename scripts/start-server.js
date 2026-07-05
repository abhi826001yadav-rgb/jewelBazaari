const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public');
const port = Number(process.env.PORT || 3000);

function loadGlobalHeaders() {
  const headersFile = path.join(root, '_headers');
  const headers = {};

  try {
    const content = fs.readFileSync(headersFile, 'utf8');
    const blocks = content.split(/\n(?=\/|\S)/);
    const globalBlock = blocks.find((block) => block.trim().startsWith('/*'));

    if (!globalBlock) return headers;

    for (const line of globalBlock.split('\n').slice(1)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separator = trimmed.indexOf(':');
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (key && value) headers[key] = value;
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  return headers;
}

const globalHeaders = loadGlobalHeaders();

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(root, urlPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      ...globalHeaders,
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`jewelBazaari running at http://localhost:${port}`);
});