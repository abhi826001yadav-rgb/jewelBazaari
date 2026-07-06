const MAX_BYTES = 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CLOUDINARY_TRANSFORM = 'c_fill,g_auto,ar_4:5,w_1200,h_1500,q_auto:good,f_webp';

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    });
}

function getBearerToken(request) {
    const header = request.headers.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

async function verifyFirebaseToken(idToken, apiKey) {
    if (!idToken || !apiKey) {
        return null;
    }

    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        }
    );

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    return data.users?.[0] || null;
}

function sanitizeVendorId(vendorId) {
    const clean = String(vendorId || '').trim().toLowerCase();
    if (!clean || !/^[a-z0-9_-]{4,32}$/.test(clean)) {
        return '';
    }
    return clean;
}

async function sha1Hex(value) {
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function signCloudinaryParams(params, apiSecret) {
    const serialized = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');
    return sha1Hex(serialized + apiSecret);
}

async function uploadToCloudinary({ image, vendorId, env }) {
    const cloudName = String(env.CLOUDINARY_CLOUD_NAME || '').trim();
    const apiKey = String(env.CLOUDINARY_API_KEY || '').trim();
    const apiSecret = String(env.CLOUDINARY_API_SECRET || '').trim();

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Cloudflare Pages settings.');
    }

    const timestamp = String(Math.round(Date.now() / 1000));
    const folder = `jewelbazaari/vendors/${vendorId}`;
    const paramsToSign = {
        folder,
        timestamp,
        transformation: CLOUDINARY_TRANSFORM
    };
    const signature = await signCloudinaryParams(paramsToSign, apiSecret);
    const bytes = await image.arrayBuffer();

    const cloudinaryForm = new FormData();
    cloudinaryForm.append('file', new Blob([bytes], { type: image.type || 'image/webp' }), image.name || 'jewellery.webp');
    cloudinaryForm.append('api_key', apiKey);
    cloudinaryForm.append('timestamp', timestamp);
    cloudinaryForm.append('signature', signature);
    cloudinaryForm.append('folder', folder);
    cloudinaryForm.append('transformation', CLOUDINARY_TRANSFORM);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: cloudinaryForm
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload.error?.message || 'Cloudinary upload failed.';
        throw new Error(message);
    }

    if (!payload.secure_url) {
        throw new Error('Cloudinary upload succeeded but no image URL was returned.');
    }

    return {
        url: payload.secure_url,
        publicId: payload.public_id || '',
        bytes: Number(payload.bytes || image.size || 0),
        format: payload.format || 'webp'
    };
}

export async function onRequestPost(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    const idToken = getBearerToken(request);
    const firebaseUser = await verifyFirebaseToken(idToken, env.FIREBASE_API_KEY);
    if (!firebaseUser) {
        return jsonResponse({ error: 'Unauthorized. Please log in again as an approved vendor.' }, 401);
    }

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return jsonResponse({ error: 'Invalid upload payload.' }, 400);
    }

    const vendorId = sanitizeVendorId(formData.get('vendorId'));
    if (!vendorId) {
        return jsonResponse({ error: 'A valid vendor ID is required.' }, 400);
    }

    const image = formData.get('image');
    if (!image || typeof image.arrayBuffer !== 'function') {
        return jsonResponse({ error: 'Image file is required.' }, 400);
    }

    const contentType = String(image.type || '').toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) {
        return jsonResponse({ error: 'Only JPEG, PNG, or WebP images are allowed.' }, 400);
    }

    if (image.size > MAX_BYTES) {
        return jsonResponse({ error: 'Each image must be 1 MB or smaller after compression.' }, 400);
    }

    try {
        const uploaded = await uploadToCloudinary({ image, vendorId, env });
        return jsonResponse({
            url: uploaded.url,
            publicId: uploaded.publicId,
            size: uploaded.bytes,
            format: uploaded.format
        });
    } catch (error) {
        return jsonResponse({
            error: error.message || 'Image upload failed.'
        }, 503);
    }
}