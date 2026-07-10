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
 *  - Auto-compresses website copies to ≤ MAX_BYTES (default 500 KB)
 *    using resize + adaptive JPEG quality (source files stay untouched)
 *  - Re-run this script (or start the local server) after adding/removing photos
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MAX_IMAGES = 10;
const MAX_BYTES = 500 * 1024; // 500 KB target for public banners
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 800;

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

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Compress one image to ≤ MAX_BYTES:
 * 1) Resize within 1920×800 (no upscale)
 * 2) Encode JPEG at decreasing quality until under budget
 * 3) If still over, shrink dimensions and retry quality ladder
 */
async function compressToBudget(sharp, inputPath) {
  const qualities = [82, 75, 68, 60, 52, 45, 38, 32];
  const scaleSteps = [1, 0.92, 0.85, 0.78, 0.7, 0.62];

  let best = null;

  for (const scale of scaleSteps) {
    const width = Math.round(MAX_WIDTH * scale);
    const height = Math.round(MAX_HEIGHT * scale);

    for (const quality of qualities) {
      const buffer = await sharp(inputPath, { failOn: 'none' })
        .rotate() // honor EXIF orientation
        .resize({
          width,
          height,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality,
          mozjpeg: true,
          chromaSubsampling: '4:2:0'
        })
        .toBuffer();

      if (!best || buffer.length < best.length) {
        best = buffer;
      }

      if (buffer.length <= MAX_BYTES) {
        return {
          buffer,
          quality,
          width,
          height,
          underBudget: true
        };
      }
    }
  }

  return {
    buffer: best,
    quality: null,
    width: null,
    height: null,
    underBudget: best ? best.length <= MAX_BYTES : false
  };
}

async function processOneImage(sharp, name, index) {
  const srcPath = path.join(sourceDir, name);
  const destName = `banner-${String(index + 1).padStart(2, '0')}.jpg`;
  const destPath = path.join(outDir, destName);
  const srcBytes = fs.statSync(srcPath).size;

  const result = await compressToBudget(sharp, srcPath);
  if (!result.buffer) {
    throw new Error(`Failed to encode ${name}`);
  }

  fs.writeFileSync(destPath, result.buffer);

  return {
    src: `images/hero-carousel/${destName}`,
    alt: `jewelBazaari featured collection ${index + 1}`,
    file: name,
    srcBytes,
    outBytes: result.buffer.length,
    quality: result.quality,
    underBudget: result.underBudget
  };
}

async function syncHeroCarousel() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      '[hero-carousel] Missing dependency "sharp". Run: npm install  (from the jewelBazaari folder)'
    );
    throw new Error('sharp is required for auto-compression');
  }

  ensureDir(sourceDir);
  const all = listSourceImages();

  if (all.length > MAX_IMAGES) {
    console.warn(
      `[hero-carousel] Found ${all.length} images; using first ${MAX_IMAGES} only (max ${MAX_IMAGES}).`
    );
  }

  const selected = all.slice(0, MAX_IMAGES);
  clearOutDir();

  const slides = [];
  for (let i = 0; i < selected.length; i++) {
    const slide = await processOneImage(sharp, selected[i], i);
    slides.push(slide);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    max: MAX_IMAGES,
    maxBytes: MAX_BYTES,
    count: slides.length,
    sourceFolder: 'carousel-homepage',
    slides: slides.map(({ src, alt, file }) => ({ src, alt, file }))
  };

  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  if (slides.length === 0) {
    console.warn(
      '[hero-carousel] No images in carousel-homepage/. Add up to 10 photos (.jpg/.png/.webp), then re-run.'
    );
  } else {
    console.log(
      `[hero-carousel] Synced ${slides.length} image(s) → public/images/hero-carousel/ (target ≤ ${formatKB(MAX_BYTES)})`
    );
    slides.forEach((s, i) => {
      const flag = s.underBudget ? 'OK' : 'OVER (best effort)';
      console.log(
        `  ${i + 1}. ${s.file}  ${formatKB(s.srcBytes)} → ${formatKB(s.outBytes)}  q=${s.quality ?? '—'}  [${flag}]`
      );
    });
  }

  return manifest;
}

if (require.main === module) {
  syncHeroCarousel().catch((err) => {
    console.error('[hero-carousel] sync failed:', err.message || err);
    process.exit(1);
  });
}

module.exports = { syncHeroCarousel, MAX_IMAGES, MAX_BYTES };
