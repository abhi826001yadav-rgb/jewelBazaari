// Cloudflare Pages middleware — enforce a single CSP on HTML responses.
// Fixes duplicate/stricter zone-level CSP headers that block Firebase (connect-src 'self' only).

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com https://www.gstatic.com https://apis.google.com https://www.googleapis.com https://accounts.google.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  [
    "connect-src 'self'",
    "https://api.gold-api.com",
    "https://cdn.tailwindcss.com",
    "https://apis.google.com",
    "https://www.gstatic.com",
    "https://www.googleapis.com",
    "https://*.googleapis.com",
    "https://firestore.googleapis.com",
    "https://firebase.googleapis.com",
    "https://firebaseinstallations.googleapis.com",
    "https://firebaseremoteconfig.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firebasestorage.googleapis.com",
    "https://firebasestorage.app",
    "https://*.firebasestorage.app",
    "https://*.firebaseio.com",
    "https://*.firebaseapp.com",
    "https://*.cloudfunctions.net",
    "https://api.cloudinary.com",
    "wss://*.firebaseio.com"
  ].join(' '),
  "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://apis.google.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join('; ');

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.delete('Content-Security-Policy');
  headers.delete('Content-Security-Policy-Report-Only');
  headers.set('Content-Security-Policy', CSP);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}