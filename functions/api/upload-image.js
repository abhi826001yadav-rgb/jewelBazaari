/**
 * Legacy server upload endpoint — deprecated.
 * Product images now upload directly to Cloudinary from the browser using an unsigned preset.
 */
export async function onRequestPost() {
    return new Response(JSON.stringify({
        error: 'Server-side upload is disabled. Images upload directly to Cloudinary from the vendor pages.'
    }), {
        status: 410,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
    });
}