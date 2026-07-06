const FALLBACK_IMAGE = 'https://picsum.photos/id/1015/400/400';

export function getProductImages(product) {
    if (!product) return [];

    const imageUrls = [
        product.imageUrl,
        product.imageUrl2,
        product.imageUrl3,
        product.imageUrl4,
        product.imageUrl5
    ]
        .map((url) => String(url || '').trim())
        .filter(Boolean)
        .slice(0, 5);

    if (imageUrls.length) {
        return imageUrls;
    }

    if (Array.isArray(product.images) && product.images.length) {
        return product.images
            .map((url) => String(url || '').trim())
            .filter(Boolean)
            .slice(0, 5);
    }

    return [];
}

export function getCoverImage(product) {
    const images = getProductImages(product);
    return images[0] || FALLBACK_IMAGE;
}