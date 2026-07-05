const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const viewport = 'width=device-width, initial-scale=1.0, viewport-fit=cover';

for (const file of fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'))) {
    const filePath = path.join(publicDir, file);
    let html = fs.readFileSync(filePath, 'utf8');
    const next = html.replace(
        /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/g,
        `<meta name="viewport" content="${viewport}">`
    );
    if (next !== html) {
        fs.writeFileSync(filePath, next, 'utf8');
        console.log(`Patched viewport: ${file}`);
    }
}