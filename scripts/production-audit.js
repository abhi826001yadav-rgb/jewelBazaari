const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

const htmlPages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));
const jsFiles = fs.readdirSync(path.join(publicDir, 'js')).filter((name) => name.endsWith('.js'));

let warnings = 0;
let errors = 0;

function warn(msg) {
  console.warn(`WARN: ${msg}`);
  warnings += 1;
}

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  errors += 1;
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

for (const page of htmlPages) {
  const content = read(path.join(publicDir, page));
  if (!content.includes('<meta charset="UTF-8">')) fail(`${page} missing charset`);
  if (!content.includes('viewport')) fail(`${page} missing viewport`);
  if (!content.includes('<title>')) fail(`${page} missing title`);
  if (!content.includes('rel="canonical"') && page !== 'track-order.html') {
    warn(`${page} missing canonical link`);
  }
}

for (const jsFile of jsFiles) {
  const content = read(path.join(publicDir, 'js', jsFile));
  if (/console\.log\(/.test(content)) fail(`${jsFile} contains console.log`);
  if (/eval\(/.test(content)) fail(`${jsFile} contains eval()`);
  if (/document\.write\(/.test(content)) fail(`${jsFile} contains document.write()`);
}

const imagesDir = path.join(publicDir, 'images');
if (fs.existsSync(imagesDir)) {
  for (const image of fs.readdirSync(imagesDir)) {
    const size = fs.statSync(path.join(imagesDir, image)).size;
    if (size > 300 * 1024) {
      warn(`Large image: ${image} (${Math.round(size / 1024)} KB)`);
    }
  }
}

const redirects = read(path.join(publicDir, '_redirects'));
if (!redirects.includes('/track-order')) warn('_redirects missing track-order rule');

const brokenTargets = ['track-order.html', 'diamond copy.html'];
for (const target of brokenTargets) {
  if (target === 'track-order.html') {
    if (!fs.existsSync(path.join(publicDir, target))) fail(`${target} is missing`);
    continue;
  }
}

console.log(`\nAudit complete: ${errors} error(s), ${warnings} warning(s).`);
if (errors > 0) process.exit(1);