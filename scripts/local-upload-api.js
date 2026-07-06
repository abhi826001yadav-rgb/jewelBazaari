const crypto = require('crypto');
const https = require('https');

const MAX_BYTES = 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CLOUDINARY_TRANSFORM = 'c_fill,g_auto,ar_4:5,w_1200,h_1500,q_auto:good,f_webp';

function loadDevVars(rootDir) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(rootDir, '.dev.vars');
    if (!fs.existsSync(filePath)) {
        return {};
    }

    return fs.readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .reduce((acc, line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                return acc;
            }
            const index = trimmed.indexOf('=');
            if (index === -1) {
                return acc;
            }
            acc[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
            return acc;
        }, {});
}

function parseMultipartBody(body, boundary) {
    const delimiter = Buffer.from(`--${boundary}`);
    const parts = [];
    let offset = body.indexOf(delimiter);

    while (offset !== -1) {
        let start = offset + delimiter.length;
        if (body[start] === 13 && body[start + 1] === 10) {
            start += 2;
        }

        const next = body.indexOf(delimiter, start);
        if (next === -1) {
            break;
        }

        let chunk = body.subarray(start, next);
        if (chunk.length >= 2 && chunk[chunk.length - 2] === 13 && chunk[chunk.length - 1] === 10) {
            chunk = chunk.subarray(0, chunk.length - 2);
        }

        const headerEnd = chunk.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
            const headers = chunk.subarray(0, headerEnd).toString('utf8');
            const data = chunk.subarray(headerEnd + 4);
            const nameMatch = headers.match(/name="([^"]+)"/);
            const filenameMatch = headers.match(/filename="([^"]+)"/);
            const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);

            parts.push({
                name: nameMatch ? nameMatch[1] : '',
                filename: filenameMatch ? filenameMatch[1] : '',
                contentType: typeMatch ? typeMatch[1].trim().toLowerCase() : '',
                data
            });
        }

        offset = next;
        if (body[offset + delimiter.length] === 45 && body[offset + delimiter.length + 1] === 45) {
            break;
        }
    }

    return parts;
}

function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function getBearerToken(req) {
    const header = req.headers.authorization || '';
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

function sha1Hex(value) {
    return crypto.createHash('sha1').update(value).digest('hex');
}

function uploadToCloudinary({ buffer, contentType, filename, vendorId, env }) {
    const cloudName = String(env.CLOUDINARY_CLOUD_NAME || '').trim();
    const apiKey = String(env.CLOUDINARY_API_KEY || '').trim();
    const apiSecret = String(env.CLOUDINARY_API_SECRET || '').trim();

    if (!cloudName || !apiKey || !apiSecret) {
        return Promise.reject(new Error('Cloudinary is not configured in .dev.vars'));
    }

    const timestamp = String(Math.round(Date.now() / 1000));
    const folder = `jewelbazaari/vendors/${vendorId}`;
    const paramsToSign = {
        folder,
        timestamp,
        transformation: CLOUDINARY_TRANSFORM
    };
    const serialized = Object.keys(paramsToSign)
        .sort()
        .map((key) => `${key}=${paramsToSign[key]}`)
        .join('&');
    const signature = sha1Hex(serialized + apiSecret);
    const boundary = `----jewelBazaari${Date.now()}`;
    const chunks = [];

    chunks.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename || 'jewellery.webp'}"\r\n` +
        `Content-Type: ${contentType || 'image/webp'}\r\n\r\n`
    ));
    chunks.push(buffer);
    chunks.push(Buffer.from(
        `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="folder"\r\n\r\n${folder}\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="transformation"\r\n\r\n${CLOUDINARY_TRANSFORM}\r\n` +
        `--${boundary}--\r\n`
    ));

    const body = Buffer.concat(chunks);

    return new Promise((resolve, reject) => {
        const request = https.request({
            hostname: 'api.cloudinary.com',
            path: `/v1_1/${cloudName}/image/upload`,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            }
        }, (response) => {
            const responseChunks = [];
            response.on('data', (chunk) => responseChunks.push(chunk));
            response.on('end', () => {
                try {
                    const payload = JSON.parse(Buffer.concat(responseChunks).toString('utf8'));
                    if (response.statusCode >= 400) {
                        reject(new Error(payload.error?.message || 'Cloudinary upload failed.'));
                        return;
                    }
                    if (!payload.secure_url) {
                        reject(new Error('Cloudinary upload succeeded but no image URL was returned.'));
                        return;
                    }
                    resolve(payload);
                } catch (error) {
                    reject(error);
                }
            });
        });

        request.on('error', reject);
        request.write(body);
        request.end();
    });
}

function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
    });
    res.end(payload);
}

function createLocalUploadHandler(rootDir) {
    const env = {
        ...loadDevVars(rootDir),
        ...process.env
    };

    return async function handleLocalUpload(req, res) {
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type'
            });
            res.end();
            return true;
        }

        if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed.' });
            return true;
        }

        const idToken = getBearerToken(req);
        const firebaseUser = await verifyFirebaseToken(idToken, env.FIREBASE_API_KEY);
        if (!firebaseUser) {
            sendJson(res, 401, { error: 'Unauthorized. Please log in again as an approved vendor.' });
            return true;
        }

        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
            sendJson(res, 400, { error: 'Invalid upload payload.' });
            return true;
        }

        const body = await readRequestBody(req);
        const parts = parseMultipartBody(body, boundaryMatch[1].trim());
        const vendorPart = parts.find((part) => part.name === 'vendorId');
        const imagePart = parts.find((part) => part.name === 'image');

        const vendorId = String(vendorPart?.data?.toString('utf8') || '').trim().toLowerCase();
        if (!vendorId || !/^[a-z0-9_-]{4,32}$/.test(vendorId)) {
            sendJson(res, 400, { error: 'A valid vendor ID is required.' });
            return true;
        }

        if (!imagePart || !imagePart.data?.length) {
            sendJson(res, 400, { error: 'Image file is required.' });
            return true;
        }

        if (!ALLOWED_TYPES.has(imagePart.contentType)) {
            sendJson(res, 400, { error: 'Only JPEG, PNG, or WebP images are allowed.' });
            return true;
        }

        if (imagePart.data.length > MAX_BYTES) {
            sendJson(res, 400, { error: 'Each image must be 1 MB or smaller after compression.' });
            return true;
        }

        try {
            const uploaded = await uploadToCloudinary({
                buffer: imagePart.data,
                contentType: imagePart.contentType,
                filename: imagePart.filename,
                vendorId,
                env
            });

            sendJson(res, 200, {
                url: uploaded.secure_url,
                publicId: uploaded.public_id || '',
                size: uploaded.bytes || imagePart.data.length,
                format: uploaded.format || 'webp'
            });
        } catch (error) {
            sendJson(res, 503, { error: error.message || 'Image upload failed.' });
        }

        return true;
    };
}

module.exports = {
    createLocalUploadHandler
};