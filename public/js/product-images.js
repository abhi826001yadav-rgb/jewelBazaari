import { withCloudinaryAutoOptimization } from './utils/image-url-utils.js';

const FALLBACK_IMAGE = 'https://picsum.photos/id/1015/400/400';
const MAX_DISPLAY_IMAGES = 3;

function optimizeProductImageUrl(url) {
    return withCloudinaryAutoOptimization(String(url || '').trim());
}

export function getProductImageAssets(product) {
    if (!product) return [];

    const urlKeys = ['imageUrl', 'imageUrl2', 'imageUrl3', 'imageUrl4', 'imageUrl5'];
    const publicIdKeys = ['imagePublicId', 'imagePublicId2', 'imagePublicId3', 'imagePublicId4', 'imagePublicId5'];

    return urlKeys
        .map((urlKey, index) => ({
            url: optimizeProductImageUrl(product[urlKey]),
            publicId: String(product[publicIdKeys[index]] || '').trim()
        }))
        .filter((item) => item.url)
        .slice(0, MAX_DISPLAY_IMAGES);
}

export function getProductImages(product) {
    if (!product) return [];

    const imageUrls = [
        product.imageUrl,
        product.imageUrl2,
        product.imageUrl3,
        product.imageUrl4,
        product.imageUrl5
    ]
        .map((url) => optimizeProductImageUrl(url))
        .filter(Boolean)
        .slice(0, MAX_DISPLAY_IMAGES);

    if (imageUrls.length) {
        return imageUrls;
    }

    if (Array.isArray(product.images) && product.images.length) {
        return product.images
            .map((url) => optimizeProductImageUrl(url))
            .filter(Boolean)
            .slice(0, MAX_DISPLAY_IMAGES);
    }

    return [];
}

export function getCoverImage(product) {
    const images = getProductImages(product);
    return images[0] || FALLBACK_IMAGE;
}