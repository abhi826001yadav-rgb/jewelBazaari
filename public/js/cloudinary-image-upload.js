import { auth } from './firebase-config.js';
import { compressJewelleryImage, formatImageSize, IMAGE_UPLOAD_LIMITS } from './image-compress.js';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UNSIGNED_PRESET } from './cloudinary-config.js';

const UPLOAD_API_PATH = '/api/upload-image';

async function parseUploadError(response) {
    if (response.status === 404 || response.status === 405) {
        return 'UPLOAD_API_UNAVAILABLE';
    }

    try {
        const data = await response.json();
        return data.error || 'Image upload failed.';
    } catch {
        return 'Image upload failed.';
    }
}

async function uploadDirectToCloudinary(file, vendorId) {
    if (!CLOUDINARY_UNSIGNED_PRESET) {
        throw new Error(
            'Image upload API is not available on Live Server (port 5500). ' +
            'Use http://localhost:3000 via "node scripts/start-server.js", deploy to Cloudflare Pages, ' +
            'or set CLOUDINARY_UNSIGNED_PRESET in public/js/cloudinary-config.js for local testing.'
        );
    }

    const compressed = await compressJewelleryImage(file);
    const formData = new FormData();
    formData.append('file', compressed, compressed.name);
    formData.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET);
    formData.append('folder', `jewelbazaari/vendors/${vendorId}`);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: 'POST',
            body: formData
        }
    );

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error?.message || 'Cloudinary direct upload failed.');
    }

    const data = await response.json();
    if (!data?.secure_url) {
        throw new Error('Cloudinary upload succeeded but no image URL was returned.');
    }

    return {
        url: data.secure_url,
        sizeLabel: formatImageSize(compressed.size)
    };
}

async function uploadThroughApi(file, vendorId) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('Please log in again before uploading images.');
    }

    const compressed = await compressJewelleryImage(file);
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('image', compressed, compressed.name);
    formData.append('vendorId', vendorId);

    const response = await fetch(UPLOAD_API_PATH, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        const message = await parseUploadError(response);
        if (message === 'UPLOAD_API_UNAVAILABLE') {
            return uploadDirectToCloudinary(file, vendorId);
        }
        throw new Error(message);
    }

    const data = await response.json();
    if (!data?.url) {
        throw new Error('Upload succeeded but no image URL was returned.');
    }

    return {
        url: data.url,
        sizeLabel: formatImageSize(compressed.size)
    };
}

export async function uploadVendorImage(file, vendorId) {
    const cleanVendorId = String(vendorId || '').trim();
    if (!cleanVendorId) {
        throw new Error('Vendor ID is required for image upload.');
    }

    return uploadThroughApi(file, cleanVendorId);
}

export async function uploadVendorImages(files, vendorId, { onProgress } = {}) {
    const selected = Array.from(files || []).slice(0, IMAGE_UPLOAD_LIMITS.maxImages);
    if (!selected.length) {
        throw new Error('Please choose at least one jewellery photo.');
    }

    const urls = [];

    for (let index = 0; index < selected.length; index += 1) {
        const result = await uploadVendorImage(selected[index], vendorId);
        urls.push(result.url);
        onProgress?.({
            completed: index + 1,
            total: selected.length,
            currentSizeLabel: result.sizeLabel
        });
    }

    return urls;
}

export function mapUrlsToProductFields(urls = []) {
    const clean = urls.map((url) => String(url || '').trim()).filter(Boolean);
    return {
        imageUrl: clean[0] || '',
        imageUrl2: clean[1] || '',
        imageUrl3: clean[2] || '',
        imageUrl4: clean[3] || '',
        imageUrl5: clean[4] || ''
    };
}

export { IMAGE_UPLOAD_LIMITS };