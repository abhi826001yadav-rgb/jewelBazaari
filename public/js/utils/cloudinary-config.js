/**
 * Public Cloudinary settings (safe for the browser).
 * Step 1 of Cloudinary integration: expose only cloud name + unsigned preset.
 * API Secret must NEVER appear in client code or .env.example.
 */
export const CLOUDINARY_CLOUD_NAME = 'dbhxymcuc';

export const CLOUDINARY_UPLOAD_PRESET = 'jewelbazaari_vendor_upload';

export function getCloudinaryUploadEndpoint() {
    const cloudName = String(CLOUDINARY_CLOUD_NAME || '').trim();
    if (!cloudName) {
        throw new Error('Cloudinary cloud name is not configured.');
    }
    return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

export function assertCloudinaryUploadConfig() {
    const cloudName = String(CLOUDINARY_CLOUD_NAME || '').trim();
    const uploadPreset = String(CLOUDINARY_UPLOAD_PRESET || '').trim();

    if (!cloudName || !uploadPreset) {
        throw new Error(
            'Cloudinary upload is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in public/js/utils/cloudinary-config.js.'
        );
    }

    return { cloudName, uploadPreset };
}