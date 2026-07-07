# Cloudinary Image Upload Setup for jewelBazaari

Vendor jewellery photos upload **directly to Cloudinary** from the browser using an **unsigned upload preset**.

The site stays on **Cloudflare Pages** for hosting. Only product image storage uses **Cloudinary**.

## Workflow

```
Vendor Login (Firebase Auth)
        ↓
Vendor selects jewellery image(s)
        ↓
Client compresses + uploads to Cloudinary (unsigned preset)
        ↓
Cloudinary returns secure_url + public_id
        ↓
Firestore stores secure_url, public_id, and product details
        ↓
Storefront displays images from secure_url
```

## Cloudinary dashboard settings

1. Create a Cloudinary account at [cloudinary.com](https://cloudinary.com).
2. Create an **unsigned upload preset**:
   - Folder: `jewelbazaari/vendors/[vendorId]` (set via client `folder` param)
   - Allowed formats: jpg, png, webp
   - Max file size: 1 MB (also enforced client-side)
3. Copy:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **Unsigned preset name** → `CLOUDINARY_UPLOAD_PRESET`

**Never** put API Secret in client code, `.env.example`, or Cloudflare Pages variables.

## Project configuration

### `.env.example` (documentation)

```
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

### Runtime config (vanilla JS)

Edit `public/js/utils/cloudinary-config.js`:

```js
export const CLOUDINARY_CLOUD_NAME = 'your_cloud_name';
export const CLOUDINARY_UPLOAD_PRESET = 'your_unsigned_preset';
```

## Limits

| Rule | Value |
|------|-------|
| Max photos per product | 5 |
| Allowed types | jpg, jpeg, png, webp |
| Max size | 1 MB per image (after compression) |
| Output | WebP, 4:5, 1200×1500 px |

## Firestore fields saved per product

Existing schema is preserved. New uploads also store:

- `imageUrl` … `imageUrl5` — Cloudinary `secure_url`
- `imagePublicId` … `imagePublicId5` — Cloudinary `public_id`

## Module layout

```
public/js/
  services/
    cloudinary-upload-service.js   → uploadImage(), uploadImages()
    product-service.js             → createProduct(), updateProduct(), deleteProduct()
  utils/
    cloudinary-config.js
    image-compress.js
    image-url-utils.js
  components/
    vendor-image-picker.js
```

## Cloudflare Pages

- No server upload secrets required.
- CSP allows `https://api.cloudinary.com` in `functions/_middleware.js`.
- Deploy `public/` as usual.

## Troubleshooting

| Error | Fix |
|-------|-----|
| Cloudinary upload is not configured | Set cloud name + unsigned preset in `cloudinary-config.js` |
| Upload blocked by CSP | Redeploy Pages so middleware CSP includes `api.cloudinary.com` |
| Firestore save failed after upload | Error shows `public_id` values for manual Cloudinary cleanup |