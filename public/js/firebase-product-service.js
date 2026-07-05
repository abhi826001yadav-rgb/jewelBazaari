import { db } from './firebase-config.js';
import { validateProductImageUrls } from './image-url-utils.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    increment
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const PRODUCTS_COLLECTION = 'products';

const GEMSTONE_STONE_TYPES = [
    'ruby',
    'emerald',
    'sapphire',
    'pearl',
    'topaz',
    'amethyst',
    'citrine',
    'garnet',
    'aquamarine'
];

function mapDoc(doc) {
    const data = doc.data();
    const imageUrl = String(data.imageUrl || '').trim()
        || (Array.isArray(data.images) ? data.images.find(Boolean) : '')
        || '';

    return {
        id: doc.id,
        ...data,
        imageUrl
    };
}

function getCreatedAtMillis(product) {
    const ts = product?.createdAt;
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds) return ts.seconds * 1000;
    return 0;
}

function sortByNewest(products) {
    return [...products].sort((a, b) => getCreatedAtMillis(b) - getCreatedAtMillis(a));
}

function getAddToCartCount(product) {
    const hasAdd = product?.addToCartCount !== undefined && product?.addToCartCount !== null;
    const hasLegacy = product?.cartCount !== undefined && product?.cartCount !== null;
    const addCount = hasAdd ? Number(product.addToCartCount) : 0;
    const legacyCount = hasLegacy ? Number(product.cartCount) : 0;

    if (hasAdd && hasLegacy) {
        return (Number.isFinite(addCount) ? addCount : 0) + (Number.isFinite(legacyCount) ? legacyCount : 0);
    }
    if (hasAdd) {
        return Number.isFinite(addCount) ? addCount : 0;
    }
    if (hasLegacy) {
        return Number.isFinite(legacyCount) ? legacyCount : 0;
    }
    return 0;
}

function sortByAddToCartCount(products) {
    return [...products].sort((a, b) => {
        const countA = getAddToCartCount(a);
        const countB = getAddToCartCount(b);
        return countB - countA;
    });
}

const CATEGORY_PREFIX_MAP = {
    gold: 'GOLD',
    diamond: 'DIAMOND',
    gemstone: 'GEMSTONE',
    earrings: 'EARRINGS',
    rings: 'RINGS',
    wedding: 'WEDDING',
    combos: 'COMBOS',
    'all-jewellery': 'ALLJEWELLERY'
};

function getCategoryPrefix(category) {
    const normalized = (category || '').trim().toLowerCase();
    return CATEGORY_PREFIX_MAP[normalized] || normalized.replace(/-/g, '').toUpperCase();
}

function formatTimestampParts(date = new Date()) {
    const pad = (value, length = 2) => String(value).padStart(length, '0');
    const yyyymmdd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const hhmmss = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    return { yyyymmdd, hhmmss };
}

function extractSerialFromProductCode(value, categoryPrefix) {
    const pattern = new RegExp(`^${categoryPrefix}-\\d{8}-\\d{6}-(\\d{4})$`);
    const match = String(value || '').match(pattern);
    return match ? Number.parseInt(match[1], 10) : 0;
}

async function getNextSerialForCategory(category, categoryPrefix) {
    const snapshot = await getDocs(
        query(
            collection(db, PRODUCTS_COLLECTION),
            where('category', '==', category)
        )
    );

    let maxSerial = 0;

    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const candidates = [docSnap.id, data?.productCode, data?.productId];

        candidates.forEach((candidate) => {
            maxSerial = Math.max(maxSerial, extractSerialFromProductCode(candidate, categoryPrefix));
        });
    });

    return maxSerial + 1;
}

function buildProductId(categoryPrefix, yyyymmdd, hhmmss, serial) {
    return `${categoryPrefix}-${yyyymmdd}-${hhmmss}-${String(serial).padStart(4, '0')}`;
}

function normalizeProductData(product) {
    const metalType = (product.metalType || '').trim().toLowerCase();
    const stoneType = (product.stoneType || '').trim().toLowerCase();
    const {
        imageUrl,
        imageUrl2,
        imageUrl3
    } = validateProductImageUrls({
        imageUrl: product.imageUrl,
        imageUrl2: product.imageUrl2,
        imageUrl3: product.imageUrl3
    });

    const normalized = {
        name: (product.name || '').trim(),
        description: (product.description || '').trim(),
        price: Number(product.price) || 0,
        imageUrl,
        category: (product.category || '').trim().toLowerCase(),
        metalType: metalType === 'none' ? '' : metalType,
        stoneType,
        vendor: (product.vendor || 'Verified Vendor').trim(),
        vendorId: (product.vendorId || '').trim().toLowerCase(),
        addToCartCount: 0,
        createdAt: serverTimestamp()
    };

    if (imageUrl2) {
        normalized.imageUrl2 = imageUrl2;
    }

    if (imageUrl3) {
        normalized.imageUrl3 = imageUrl3;
    }

    return normalized;
}

export async function addProduct(product) {
    const productData = normalizeProductData(product);

    if (!productData.name) {
        throw new Error('Product name is required.');
    }
    if (!productData.category) {
        throw new Error('Jewellery category is required.');
    }
    if (!productData.imageUrl) {
        throw new Error('Product image is required.');
    }
    if (!productData.price || productData.price <= 0) {
        throw new Error('Valid price is required.');
    }

    const categoryPrefix = getCategoryPrefix(productData.category);
    const { yyyymmdd, hhmmss } = formatTimestampParts();
    let serial = await getNextSerialForCategory(productData.category, categoryPrefix);

    let productId = '';
    let saved = false;

    for (let attempt = 0; attempt < 100; attempt += 1) {
        productId = buildProductId(categoryPrefix, yyyymmdd, hhmmss, serial);
        const existingDoc = await getDoc(doc(db, PRODUCTS_COLLECTION, productId));

        if (!existingDoc.exists()) {
            const finalData = {
                ...productData,
                productId,
                productCode: productId
            };

            await setDoc(doc(db, PRODUCTS_COLLECTION, productId), finalData);
            saved = true;
            return { id: productId, ...finalData };
        }

        serial += 1;
    }

    if (!saved) {
        throw new Error('Could not generate a unique product ID. Please try again.');
    }
}

export async function getAllProducts() {
    try {
        const q = query(
            collection(db, PRODUCTS_COLLECTION),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(mapDoc);
    } catch (error) {
        const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
        return sortByNewest(snapshot.docs.map(mapDoc));
    }
}

export async function getProductsByMetal(metalType) {
    const normalizedMetal = (metalType || '').trim().toLowerCase();
    const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('metalType', '==', normalizedMetal)
    );
    const snapshot = await getDocs(q);
    return sortByNewest(snapshot.docs.map(mapDoc));
}

export async function getProductsByStone(stoneType) {
    const normalizedStone = (stoneType || '').trim().toLowerCase();
    const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('stoneType', '==', normalizedStone)
    );
    const snapshot = await getDocs(q);
    return sortByNewest(snapshot.docs.map(mapDoc));
}

export async function getProductsByCategory(category) {
    const normalizedCategory = (category || '').trim().toLowerCase();
    const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('category', '==', normalizedCategory)
    );
    const snapshot = await getDocs(q);
    return sortByNewest(snapshot.docs.map(mapDoc));
}

/**
 * Gemstones page: stoneType is set AND stoneType is not "diamond".
 * Uses Firestore `in` query for efficiency; falls back to client-side filter.
 */
export async function updateProduct(productId, product) {
    const id = String(productId || '').trim();
    if (!id) {
        throw new Error('Product ID is required.');
    }

    const metalType = (product.metalType || '').trim().toLowerCase();
    const stoneType = (product.stoneType || '').trim().toLowerCase();
    const {
        imageUrl,
        imageUrl2,
        imageUrl3
    } = validateProductImageUrls({
        imageUrl: product.imageUrl,
        imageUrl2: product.imageUrl2,
        imageUrl3: product.imageUrl3
    });

    const updateData = {
        name: (product.name || '').trim(),
        description: (product.description || '').trim(),
        price: Number(product.price) || 0,
        category: (product.category || '').trim().toLowerCase(),
        metalType: metalType === 'none' ? '' : metalType,
        stoneType,
        vendor: (product.vendor || 'Verified Vendor').trim(),
        vendorId: (product.vendorId || '').trim().toLowerCase(),
        imageUrl
    };

    if (!updateData.name) {
        throw new Error('Product name is required.');
    }
    if (!updateData.category) {
        throw new Error('Jewellery category is required.');
    }
    if (!updateData.imageUrl) {
        throw new Error('Product image is required.');
    }
    if (!updateData.price || updateData.price <= 0) {
        throw new Error('Valid price is required.');
    }

    if (imageUrl2) {
        updateData.imageUrl2 = imageUrl2;
    }
    if (imageUrl3) {
        updateData.imageUrl3 = imageUrl3;
    }

    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), updateData);
    return { id, productId: id, productCode: id, ...updateData };
}

export async function getProductsByVendorId(vendorId, shopName = '') {
    const normalizedVendorId = String(vendorId || '').trim().toLowerCase();
    const normalizedShopName = String(shopName || '').trim().toLowerCase();

    if (!normalizedVendorId && !normalizedShopName) {
        return [];
    }

    try {
        if (normalizedVendorId) {
            const q = query(
                collection(db, PRODUCTS_COLLECTION),
                where('vendorId', '==', normalizedVendorId)
            );
            const snapshot = await getDocs(q);
            const products = sortByNewest(snapshot.docs.map(mapDoc));
            if (products.length > 0) {
                return products;
            }
        }
    } catch (error) {
        console.warn('Vendor product query failed, falling back to client filter.', error);
    }

    const all = await getAllProducts();
    return all.filter((product) => {
        const productVendorId = String(product.vendorId || '').trim().toLowerCase();
        const productShopName = String(product.vendor || '').trim().toLowerCase();

        if (normalizedVendorId && productVendorId) {
            return productVendorId === normalizedVendorId;
        }

        return normalizedShopName && productShopName === normalizedShopName;
    });
}

export async function deleteProduct(productId) {
    const id = String(productId || '').trim();
    if (!id) {
        throw new Error('Product ID is required.');
    }

    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    const existingDoc = await getDoc(productRef);

    if (!existingDoc.exists()) {
        throw new Error('Product not found.');
    }

    await deleteDoc(productRef);
    return { id };
}

export async function incrementAddToCartCount(productId) {
    const id = String(productId || '').trim();
    if (!id) return;

    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(productRef, {
        addToCartCount: increment(1)
    });
}

export async function getTrendingProducts(limit = 10) {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const products = snapshot.docs.map(mapDoc);

    const sorted = sortByAddToCartCount(products);
    return sorted.slice(0, limit);
}

export async function getGemstoneProducts() {
    try {
        const q = query(
            collection(db, PRODUCTS_COLLECTION),
            where('stoneType', 'in', GEMSTONE_STONE_TYPES)
        );
        const snapshot = await getDocs(q);
        return sortByNewest(snapshot.docs.map(mapDoc));
    } catch (error) {
        const all = await getAllProducts();
        return all.filter(
            (product) => product.stoneType && product.stoneType !== 'diamond'
        );
    }
}