import { cloudinaryConfig } from './cloudinary-config.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateUploadConfig() {
    const { cloudName, uploadPreset } = cloudinaryConfig;

    if (!cloudName || cloudName === 'YOUR_CLOUD_NAME') {
        throw new Error('Cloudinary cloud name is not configured.');
    }

    if (!uploadPreset || uploadPreset === 'YOUR_UNSIGNED_UPLOAD_PRESET') {
        throw new Error('Cloudinary upload preset is not configured.');
    }

    return { cloudName, uploadPreset };
}

export function validateImageFile(file) {
    if (!file) {
        throw new Error('Please select a product image.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed.');
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('Image must be 5 MB or smaller.');
    }
}

/**
 * Upload a single image to Cloudinary using an unsigned upload preset.
 * @param {File} file
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<string>} secure_url
 */
export async function uploadToCloudinary(file, onProgress) {
    validateImageFile(file);

    const { cloudName, uploadPreset } = validateUploadConfig();
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', endpoint, true);

        request.upload.addEventListener('progress', (event) => {
            if (!event.lengthComputable || typeof onProgress !== 'function') {
                return;
            }

            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
        });

        request.addEventListener('load', () => {
            let response = null;

            try {
                response = JSON.parse(request.responseText || '{}');
            } catch (error) {
                reject(new Error('Cloudinary returned an invalid response.'));
                return;
            }

            if (request.status >= 200 && request.status < 300 && response.secure_url) {
                resolve(response.secure_url);
                return;
            }

            const message = response?.error?.message || 'Image upload failed. Please try again.';
            reject(new Error(message));
        });

        request.addEventListener('error', () => {
            reject(new Error('Network error while uploading image. Check your connection and try again.'));
        });

        request.addEventListener('abort', () => {
            reject(new Error('Image upload was cancelled.'));
        });

        request.send(formData);
    });
}