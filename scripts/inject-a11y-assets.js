const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const cssLine = '    <link rel="stylesheet" href="css/accessibility.css">';
const moduleLine = '    <script type="module" src="js/accessibility.js"></script>';

const searchLabelMap = {
    'all-jewellery.html': 'Search jewellery',
    'gold.html': 'Search gold jewellery',
    'diamond.html': 'Search diamond jewellery',
    'gemstones.html': 'Search gemstones',
    'earrings.html': 'Search earrings',
    'rings.html': 'Search rings'
};

for (const file of fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'))) {
    const filePath = path.join(publicDir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (!html.includes('accessibility.css')) {
        if (html.includes('href="css/mobile-responsive.css"')) {
            html = html.replace(
                /<link rel="stylesheet" href="css\/mobile-responsive.css">/,
                `<link rel="stylesheet" href="css/mobile-responsive.css">\n${cssLine}`
            );
            changed = true;
        }
    }

    if (!html.includes('js/accessibility.js') && !html.includes("import './js/accessibility.js'") && !html.includes('import "./js/accessibility.js"')) {
        html = html.replace('</body>', `${moduleLine}\n</body>`);
        changed = true;
    }

    const labelText = searchLabelMap[file];
    if (labelText && html.includes('id="search-input"') && !html.includes('for="search-input"')) {
        html = html.replace(
            /(\s*)<input type="text" id="search-input"/,
            `$1<label for="search-input" class="sr-only">${labelText}</label>\n$1<input type="search" id="search-input" aria-label="${labelText}"`
        );
        changed = true;
    }

    if (file === 'admin.html' && html.includes('id="admin-search"') && !html.includes('for="admin-search"')) {
        html = html.replace(
            /(<div id="search-wrap"[^>]*>)\s*<input/,
            `$1\n                <label for="admin-search" class="sr-only">Search jewellery records</label>\n                <input`
        );
        html = html.replace(
            'id="admin-search"',
            'id="admin-search" aria-label="Search jewellery records"'
        );
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`Updated ${file}`);
    }
}

console.log('Accessibility asset injection complete.');