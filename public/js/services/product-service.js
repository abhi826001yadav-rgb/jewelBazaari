import {
    addProduct as addProductToFirestore,
    updateProduct as updateProductInFirestore,
    deleteProduct as deleteProductFromFirestore
} from '../firebase-product-service.js';
import {
    getLastUploadedAssets,
    mapExistingImagesToProductFields,
    mapUploadsToProductFields,
    uploadImages
} from './cloudinary-upload-service.js';

/**
 * Product service — orchestrates Cloudinary upload then Firestore save.
 * Keeps Firebase product schema intact while storing secure_url + public_id.
 */

export class ProductSaveError extends Error {
    constructor(message, { uploadedAssets = [], phase = 'unknown' } = {}) {
        super(message);
        this.name = 'ProductSaveError';
        this.phase = phase;
        this.uploadedAssets = uploadedAssets;
    }
}

export async function createProduct(product) {
    return addProductToFirestore(product);
}

export async function updateProduct(productId, product) {
    return updateProductInFirestore(productId, product);
}

export async function deleteProduct(productId) {
    return deleteProductFromFirestore(productId);
}

/**
 * Upload images to Cloudinary first, then create the Firestore product.
 * Requirement 14: Firestore save is skipped when Cloudinary upload fails.
 * Requirement 15: uploaded Cloudinary assets are returned when Firestore save fails.
 */
export async function createProductWithImages({
    files,
    productData,
    vendorId,
    onProgress
}) {
    let uploadedAssets = [];

    try {
        uploadedAssets = await uploadImages(files, vendorId, { onProgress });
    } catch (error) {
        throw new ProductSaveError(error.message || 'Cloudinary upload failed.', {
            phase: 'cloudinary',
            uploadedAssets: getLastUploadedAssets()
        });
    }

    const payload = {
        ...productData,
        ...mapUploadsToProductFields(uploadedAssets)
    };

    try {
        return await createProduct(payload);
    } catch (error) {
        throw new ProductSaveError(
            error.message || 'Product could not be saved in Firestore.',
            {
                phase: 'firestore',
                uploadedAssets
            }
        );
    }
}

export async function updateProductWithImages({
    productId,
    productData,
    vendorId,
    newFiles = [],
    existingImages = [],
    onProgress
}) {
    let uploadedAssets = [];

    if (newFiles.length) {
        try {
            uploadedAssets = await uploadImages(newFiles, vendorId, { onProgress });
        } catch (error) {
            throw new ProductSaveError(error.message || 'Cloudinary upload failed.', {
                phase: 'cloudinary',
                uploadedAssets: getLastUploadedAssets()
            });
        }
    }

    const mergedImages = [
        ...existingImages.map((item) => ({
            url: item.url,
            publicId: item.publicId || ''
        })),
        ...uploadedAssets.map((item) => ({
            url: item.url,
            publicId: item.publicId
        }))
    ].slice(0, 5);

    const payload = {
        ...productData,
        ...mapExistingImagesToProductFields(mergedImages)
    };

    try {
        return await updateProduct(productId, payload);
    } catch (error) {
        throw new ProductSaveError(
            error.message || 'Product could not be updated in Firestore.',
            {
                phase: 'firestore',
                uploadedAssets
            }
        );
    }
}

export function formatUploadedAssetsForCleanup(uploadedAssets = []) {
    if (!uploadedAssets.length) {
        return '';
    }

    return uploadedAssets
        .map((asset, index) => `${index + 1}. ${asset.publicId} → ${asset.url}`)
        .join('\n');
}