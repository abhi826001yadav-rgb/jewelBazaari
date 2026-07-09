export const IMAGE_UPLOAD_LIMITS = {
    maxImages: 3,
    /** Final compressed file size cap (after crop/resize). */
    maxBytes: 250 * 1024,
    /** Original file size cap before processing. */
    maxOriginalBytes: 15 * 1024 * 1024,
    /** Exact output dimensions — 1:1 square. */
    outputSize: 1200,
    aspectRatio: 1
};

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png'
]);

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);

export function validateImageFile(file) {
    if (!file) {
        throw new Error('Please choose an image file.');
    }

    const mimeType = String(file.type || '').toLowerCase();
    const extension = String(file.name || '').split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_MIME_TYPES.has(mimeType) && !ALLOWED_EXTENSIONS.has(extension)) {
        throw new Error('Only JPG, JPEG, and PNG images are allowed.');
    }

    if (file.size > IMAGE_UPLOAD_LIMITS.maxOriginalBytes) {
        throw new Error('Original image is too large. Please choose a photo under 15 MB.');
    }
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not read the selected image.'));
        };

        image.src = objectUrl;
    });
}

/** Center-crop source to a square (1:1). */
function computeCenterCrop(width, height, targetRatio = 1) {
    const sourceRatio = width / height;

    if (sourceRatio > targetRatio) {
        const cropHeight = height;
        const cropWidth = Math.round(height * targetRatio);
        return {
            x: Math.round((width - cropWidth) / 2),
            y: 0,
            width: cropWidth,
            height: cropHeight
        };
    }

    const cropWidth = width;
    const cropHeight = Math.round(width / targetRatio);
    return {
        x: 0,
        y: Math.round((height - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight
    };
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
    });
}

/**
 * Crop to 1:1, resize to 1200×1200, encode as JPEG ≤ maxBytes.
 * Accepts JPG/JPEG/PNG input; output is always JPEG for consistent size/quality.
 */
export async function compressJewelleryImage(file, limits = IMAGE_UPLOAD_LIMITS) {
    validateImageFile(file);

    const image = await loadImageFromFile(file);
    const size = limits.outputSize || 1200;
    const crop = computeCenterCrop(
        image.naturalWidth,
        image.naturalHeight,
        limits.aspectRatio || 1
    );

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        size,
        size
    );

    // Prefer higher quality first; step down until under 250 KB.
    const qualities = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3];
    let blob = null;

    for (const quality of qualities) {
        blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        if (blob && blob.size <= limits.maxBytes) {
            break;
        }
    }

    if (!blob || blob.size > limits.maxBytes) {
        throw new Error('Could not compress this image below 250 KB. Try a clearer, smaller photo.');
    }

    const baseName = String(file.name || 'jewellery').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export function formatImageSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
}
