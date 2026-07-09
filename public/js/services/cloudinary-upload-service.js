import {
    assertCloudinaryUploadConfig,
    getCloudinaryUploadEndpoint
} from '../utils/cloudinary-config.js';
import {
    compressJewelleryImage,
    formatImageSize,
    IMAGE_UPLOAD_LIMITS,
    validateImageFile
} from '../utils/image-compress.js';
import { withCloudinaryAutoOptimization } from '../utils/image-url-utils.js';

/**
 * Cloudinary upload service — client-side direct upload using an unsigned preset.
 * Vendor portal gates access with a password; Firestore saves use open product rules.
 * API Secret is never used; only cloud name + unsigned preset are required.
 */

let lastUploadedAssets = [];

export function getLastUploadedAssets() {
    return [...lastUploadedAssets];
}

export function clearLastUploadedAssets() {
    lastUploadedAssets = [];
}

function uploadCompressedFileToCloudinary(file, vendorId, { onProgress } = {}) {
    const { uploadPreset } = assertCloudinaryUploadConfig();
    const endpoint = getCloudinaryUploadEndpoint();
    const cleanVendorId = String(vendorId || '').trim().toLowerCase();

    if (!cleanVendorId) {
        return Promise.reject(new Error('Vendor ID is required for image upload.'));
    }

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `jewelbazaari/vendors/${cleanVendorId}`);

    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', endpoint);

        request.upload.addEventListener('progress', (event) => {
            if (!event.lengthComputable) {
                return;
            }
            onProgress?.({
                loaded: event.loaded,
                total: event.total,
                percent: Math.round((event.loaded / event.total) * 100)
            });
        });

        request.addEventListener('load', () => {
            let payload = {};
            try {
                payload = JSON.parse(request.responseText || '{}');
            } catch {
                reject(new Error('Cloudinary returned an invalid response.'));
                return;
            }

            if (request.status < 200 || request.status >= 300) {
                reject(new Error(payload.error?.message || 'Cloudinary upload failed.'));
                return;
            }

            if (!payload.secure_url || !payload.public_id) {
                reject(new Error('Cloudinary upload succeeded but secure_url or public_id was missing.'));
                return;
            }

            resolve({
                url: withCloudinaryAutoOptimization(payload.secure_url),
                publicId: payload.public_id,
                size: Number(payload.bytes || file.size || 0),
                format: payload.format || 'jpg',
                sizeLabel: formatImageSize(file.size)
            });
        });

        request.addEventListener('error', () => {
            reject(new Error('Network error while uploading to Cloudinary.'));
        });

        request.addEventListener('abort', () => {
            reject(new Error('Cloudinary upload was cancelled.'));
        });

        request.send(formData);
    });
}

/**
 * Step 2–4 of the workflow:
 * validate → compress → upload a single image directly to Cloudinary.
 */
export async function uploadImage(file, vendorId, { onProgress } = {}) {
    validateImageFile(file);
    const compressed = await compressJewelleryImage(file);
    const uploaded = await uploadCompressedFileToCloudinary(compressed, vendorId, { onProgress });
    lastUploadedAssets = [uploaded];
    return uploaded;
}

export async function uploadImages(files, vendorId, { onProgress } = {}) {
    const selected = Array.from(files || []).slice(0, IMAGE_UPLOAD_LIMITS.maxImages);
    if (!selected.length) {
        throw new Error('Please choose at least one jewellery photo.');
    }

    const uploads = [];
    lastUploadedAssets = [];

    for (let index = 0; index < selected.length; index += 1) {
        const result = await uploadImage(selected[index], vendorId, {
            onProgress: (progress) => {
                const overallPercent = Math.round(
                    ((index + progress.percent / 100) / selected.length) * 100
                );
                onProgress?.({
                    completed: index,
                    total: selected.length,
                    currentIndex: index + 1,
                    currentPercent: progress.percent,
                    overallPercent
                });
            }
        });

        uploads.push(result);
        lastUploadedAssets = [...uploads];

        onProgress?.({
            completed: index + 1,
            total: selected.length,
            currentIndex: index + 1,
            currentPercent: 100,
            overallPercent: Math.round(((index + 1) / selected.length) * 100),
            currentSizeLabel: result.sizeLabel
        });
    }

    return uploads;
}

export function mapUploadsToProductFields(uploads = []) {
    const clean = uploads
        .map((item) => ({
            url: withCloudinaryAutoOptimization(String(item?.url || '').trim()),
            publicId: String(item?.publicId || '').trim()
        }))
        .filter((item) => item.url);

    const fields = {};
    const urlKeys = ['imageUrl', 'imageUrl2', 'imageUrl3'];
    const publicIdKeys = ['imagePublicId', 'imagePublicId2', 'imagePublicId3'];

    clean.slice(0, IMAGE_UPLOAD_LIMITS.maxImages).forEach((item, index) => {
        fields[urlKeys[index]] = item.url;
        if (item.publicId) {
            fields[publicIdKeys[index]] = item.publicId;
        }
    });

    return fields;
}

export { IMAGE_UPLOAD_LIMITS };