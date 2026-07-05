const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const imagesDir = path.join(publicDir, 'images');

const categoryPages = [
    'all-jewellery.html',
    'diamond.html',
    'earrings.html',
    'gold.html',
    'gemstones.html',
    'rings.html'
];

const pagesWithoutLucide = [
    ...categoryPages,
    'more.html',
    'wedding.html',
    'combos.html'
];

function removeStandaloneAccessibilityScript(html) {
    return html.replace(/\s*<script type="module" src="js\/accessibility\.js"><\/script>\n?/g, '\n');
}

function removeLucideScript(html) {
    return html.replace(/\s*<script defer src="https:\/\/unpkg\.com\/lucide@[^"]+"><\/script>\n?/g, '\n');
}

function normalizeCategoryPage(html) {
    html = removeLucideScript(html);
    html = removeStandaloneAccessibilityScript(html);
    html = html.replace(/<body>/, '<body class="jb-category-page">');
    html = html.replace(
        /\s*<style>[\s\S]*?<\/style>\s*(?=<\/head>)/,
        '\n'
    );
    return html;
}

function normalizeTailwindV3(html) {
    if (!html.includes('@tailwindcss/browser@4')) return html;
    return html
        .replace(
            /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tailwindcss\/browser@4"><\/script>/,
            '<script src="https://cdn.tailwindcss.com"></script>\n    <script src="js/tailwind-config.js"></script>'
        )
        .replace(
            /<link rel="preconnect" href="https:\/\/cdn\.tailwindcss\.com" crossorigin>\n?/,
            '<link rel="preconnect" href="https://cdn.tailwindcss.com" crossorigin>\n'
        );
}

for (const file of categoryPages) {
    const filePath = path.join(publicDir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    html = normalizeCategoryPage(html);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`Refactored category page: ${file}`);
}

for (const file of pagesWithoutLucide) {
    if (categoryPages.includes(file)) continue;
    const filePath = path.join(publicDir, file);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');
    html = removeLucideScript(html);
    html = removeStandaloneAccessibilityScript(html);
    html = normalizeTailwindV3(html);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`Refactored page: ${file}`);
}

for (const file of fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'))) {
    const filePath = path.join(publicDir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    const next = removeStandaloneAccessibilityScript(html);
    if (next !== html) {
        fs.writeFileSync(filePath, next, 'utf8');
        console.log(`Removed duplicate accessibility script: ${file}`);
    }
}

const unusedWebp = [
    'logo.webp', 'haram.webp', 'bangles.webp', 'mangalsutra.webp',
    'accessories.webp', 'bride.webp', 'groom.webp', 'couple.webp'
];

for (const name of unusedWebp) {
    const filePath = path.join(imagesDir, name);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted unused image: ${name}`);
    }
}

for (const name of fs.readdirSync(imagesDir).filter((n) => n.startsWith('pexels-'))) {
    fs.unlinkSync(path.join(imagesDir, name));
    console.log(`Deleted unused image: ${name}`);
}

const diamondCopy = path.join(publicDir, 'diamond copy.html');
if (fs.existsSync(diamondCopy)) {
    fs.unlinkSync(diamondCopy);
    console.log('Deleted diamond copy.html');
}

console.log('Refactor cleanup complete.');