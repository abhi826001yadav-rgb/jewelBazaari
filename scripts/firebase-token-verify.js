const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

function base64UrlDecode(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const binary = atob(normalized + padding);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

function decodeJsonPart(part) {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(part)));
}

async function fetchFirebaseJwks() {
    const response = await fetch(FIREBASE_JWKS_URL, {
        headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
        throw new Error('Could not fetch Firebase public keys.');
    }
    const data = await response.json();
    return Array.isArray(data.keys) ? data.keys : [];
}

async function importFirebasePublicKey(jwk) {
    return crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
    );
}

async function verifyFirebaseIdToken(idToken, projectId) {
    const parts = String(idToken || '').split('.');
    if (parts.length !== 3) {
        return null;
    }

    let header;
    let payload;
    try {
        header = decodeJsonPart(parts[0]);
        payload = decodeJsonPart(parts[1]);
    } catch {
        return null;
    }

    const cleanProjectId = String(projectId || '').trim();
    if (!cleanProjectId) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
        return null;
    }

    if (payload.aud !== cleanProjectId) {
        return null;
    }

    const expectedIssuer = `https://securetoken.google.com/${cleanProjectId}`;
    if (payload.iss !== expectedIssuer) {
        return null;
    }

    const keys = await fetchFirebaseJwks();
    const jwk = keys.find((key) => key.kid === header.kid);
    if (!jwk) {
        return null;
    }

    const publicKey = await importFirebasePublicKey(jwk);
    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]);
    const isValid = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        publicKey,
        signature,
        signedData
    );

    if (!isValid) {
        return null;
    }

    return {
        uid: payload.user_id || payload.sub || '',
        email: payload.email || ''
    };
}

async function verifyFirebaseTokenLookup(idToken, apiKey) {
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
    const user = data.users?.[0];
    if (!user) {
        return null;
    }

    return {
        uid: user.localId || '',
        email: user.email || ''
    };
}

async function verifyFirebaseAuthToken(idToken, { projectId, apiKey } = {}) {
    const jwtUser = await verifyFirebaseIdToken(idToken, projectId);
    if (jwtUser?.uid) {
        return jwtUser;
    }

    return verifyFirebaseTokenLookup(idToken, apiKey);
}

module.exports = {
    verifyFirebaseAuthToken,
    verifyFirebaseIdToken
};