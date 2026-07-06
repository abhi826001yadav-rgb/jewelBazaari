export const IMAGE_UPLOAD_LIMITS = {
    maxImages: 5,
    maxBytes: 1024 * 1024,
    maxOriginalBytes: 15 * 1024 * 1024,
    outputMaxWidth: 1200,
    outputMaxHeight: 1500,
    aspectRatio: 4 / 5
};

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

function computeCenterCrop(width, height, targetRatio) {
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

function scaleToFit(width, height, maxWidth, maxHeight) {
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale))
    };
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality);
    });
}

export async function compressJewelleryImage(file, limits = IMAGE_UPLOAD_LIMITS) {
    if (!file?.type?.startsWith('image/')) {
        throw new Error('Please choose a valid image file.');
    }

    if (file.size > limits.maxOriginalBytes) {
        throw new Error('Original image is too large. Please choose a photo under 15 MB.');
    }

    const image = await loadImageFromFile(file);
    const crop = computeCenterCrop(image.naturalWidth, image.naturalHeight, limits.aspectRatio);
    const scaled = scaleToFit(
        crop.width,
        crop.height,
        limits.outputMaxWidth,
        limits.outputMaxHeight
    );

    const canvas = document.createElement('canvas');
    canvas.width = scaled.width;
    canvas.height = scaled.height;

    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, scaled.width, scaled.height);
    context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        scaled.width,
        scaled.height
    );

    const qualities = [0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52, 0.46, 0.4];
    let blob = null;

    for (const quality of qualities) {
        blob = await canvasToBlob(canvas, 'image/webp', quality);
        if (blob && blob.size <= limits.maxBytes) {
            break;
        }
    }

    if (!blob || blob.size > limits.maxBytes) {
        throw new Error('Could not compress this image below 1 MB. Try a smaller photo.');
    }

    const baseName = String(file.name || 'jewellery').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}

export function formatImageSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
}