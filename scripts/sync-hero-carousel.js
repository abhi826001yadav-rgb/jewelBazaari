/**
 * Sync homepage hero banners from project folder → public website assets.
 *
 * Source (edit these photos):  carousel-homepage/
 * Output (used by website):    public/images/hero-carousel/
 * Manifest (read by JS):       public/js/hero-carousel-data.json
 *
 * Rules:
 *  - Accepts .jpg .jpeg .png .webp
 *  - Max 10 images (extra files are ignored, with a warning)
 *  - Order = filename sort (use 01.jpg, 02.jpg, … for control)
 *  - Re-run this script (or start the local server) after adding/removing photos
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_IMAGES = 10;
const projectRoot = path.join(__dirname, '..');
const sourceDir = path.join(projectRoot, 'carousel-homepage');
const outDir = path.join(projectRoot, 'public', 'images', 'hero-carousel');
const manifestPath = path.join(projectRoot, 'public', 'js', 'hero-carousel-data.json');

const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listSourceImages() {
  if (!fs.existsSync(sourceDir)) {
    ensureDir(sourceDir);
    return [];
  }

  return fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMAGE_RE.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function clearOutDir() {
  ensureDir(outDir);
  for (const name of fs.readdirSync(outDir)) {
    const full = path.join(outDir, name);
    if (fs.statSync(full).isFile()) fs.unlinkSync(full);
  }
}

function safePublicName(index, originalName) {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const n = String(index + 1).padStart(2, '0');
  return `banner-${n}${ext}`;
}

function syncHeroCarousel() {
  ensureDir(sourceDir);
  const all = listSourceImages();

  if (all.length > MAX_IMAGES) {
    console.warn(
      `[hero-carousel] Found ${all.length} images; using first ${MAX_IMAGES} only (max ${MAX_IMAGES}).`
    );
  }

  const selected = all.slice(0, MAX_IMAGES);
  clearOutDir();

  const slides = selected.map((name, index) => {
    const destName = safePublicName(index, name);
    fs.copyFileSync(path.join(sourceDir, name), path.join(outDir, destName));
    return {
      src: `images/hero-carousel/${destName}`,
      alt: `jewelBazaari featured collection ${index + 1}`,
      file: name
    };
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    max: MAX_IMAGES,
    count: slides.length,
    sourceFolder: 'carousel-homepage',
    slides
  };

  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  if (slides.length === 0) {
    console.warn(
      '[hero-carousel] No images in carousel-homepage/. Add up to 10 photos (.jpg/.png/.webp), then re-run.'
    );
  } else {
    console.log(
      `[hero-carousel] Synced ${slides.length} image(s) from carousel-homepage/ → public/images/hero-carousel/`
    );
    slides.forEach((s, i) => console.log(`  ${i + 1}. ${s.file} → ${s.src}`));
  }

  return manifest;
}

if (require.main === module) {
  syncHeroCarousel();
}

module.exports = { syncHeroCarousel, MAX_IMAGES };
