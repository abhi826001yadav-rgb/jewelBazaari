const fs = require('fs');
const path = require('path');

async function loadSharp() {
    try {
        return require('sharp');
    } catch {
        const { execSync } = require('child_process');
        execSync('npm install sharp --no-save --prefix "' + path.join(__dirname, '..') + '"', {
            stdio: 'inherit'
        });
        return require('sharp');
    }
}

const imagesDir = path.join(__dirname, '..', 'public', 'images');
const targets = fs.readdirSync(imagesDir).filter((name) => /\.(jpe?g|png)$/i.test(name));

const presets = {
    hero: { maxWidth: 1920, quality: 82 },
    logo: { maxWidth: 352, quality: 88 },
    card: { maxWidth: 640, quality: 80 }
};

function getPreset(filename) {
    if (/^photo\d+\.jpg$/i.test(filename)) return presets.hero;
    if (/logo\.png$/i.test(filename)) return presets.logo;
    return presets.card;
}

async function optimizeFile(sharp, filename) {
    const inputPath = path.join(imagesDir, filename);
    const preset = getPreset(filename);
    const tempPath = `${inputPath}.opt`;
    const ext = path.extname(filename).toLowerCase();

    let pipeline = sharp(inputPath).rotate().resize({
        width: preset.maxWidth,
        withoutEnlargement: true,
        fit: 'inside'
    });

    if (ext === '.png') {
        pipeline = pipeline.png({ quality: preset.quality, compressionLevel: 9 });
    } else {
        pipeline = pipeline.jpeg({ quality: preset.quality, mozjpeg: true });
    }

    await pipeline.toFile(tempPath);

    const webpPath = inputPath.replace(/\.(jpe?g|png)$/i, '.webp');
    await sharp(inputPath)
        .rotate()
        .resize({ width: preset.maxWidth, withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: preset.quality })
        .toFile(webpPath);

    fs.renameSync(tempPath, inputPath);

    const originalSize = fs.statSync(inputPath).size;
    const webpSize = fs.statSync(webpPath).size;
    console.log(`${filename}: optimized (${originalSize} bytes), webp (${webpSize} bytes)`);
}

async function main() {
    const sharp = await loadSharp();

    for (const filename of targets) {
        await optimizeFile(sharp, filename);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});