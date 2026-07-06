# Cloudinary Image Upload Setup for jewelBazaari

Vendor jewellery photos are uploaded to **Cloudinary** through the secure Pages Function at `/api/upload-image`.

Your website still runs on **Cloudflare Pages** for hosting. Only image storage uses **Cloudinary**.

## What happens automatically

- Vendors choose up to **5 photos** per jewellery item.
- The browser crops each photo to a **4:5 portrait ratio**.
- Photos are resized to a maximum of **1200 × 1500 px**.
- Each image is compressed to **WebP** and kept at **1 MB or less**.
- The server uploads the file to Cloudinary.
- The returned Cloudinary `secure_url` is saved in Firebase with the product.

## Step 1 — Create a Cloudinary account

1. Go to [https://cloudinary.com](https://cloudinary.com).
2. Sign up for a free account.
3. Open the **Dashboard**.
4. Copy these three values:

| Dashboard field | Environment variable |
|-----------------|----------------------|
| Cloud name | `CLOUDINARY_CLOUD_NAME` |
| API Key | `CLOUDINARY_API_KEY` |
| API Secret | `CLOUDINARY_API_SECRET` |

Keep the **API Secret private**. Never put it in frontend JavaScript.

## Step 2 — Add environment variables in Cloudflare Pages

Your site is hosted on Cloudflare Pages, but image files go to Cloudinary.

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages**.
3. Select your **jewelbazaari** Pages project.
4. Open **Settings → Environment variables**.
5. Add these for **Production** (and Preview if you want):

| Variable | Example |
|----------|---------|
| `FIREBASE_API_KEY` | Your Firebase web API key from `public/js/firebase-config.js` |
| `CLOUDINARY_CLOUD_NAME` | `dxxxxxxxx` |
| `CLOUDINARY_API_KEY` | `123456789012345` |
| `CLOUDINARY_API_SECRET` | `your-secret-key` |

## Step 3 — Deploy the site

Deploy from your machine or GitHub:

```bash
npx wrangler pages deploy public --project-name jewelbazaari
```

Or push to the branch connected to Cloudflare Pages.

The upload API only works on the deployed Cloudflare Pages site, not on the simple local `node scripts/start-server.js` server.

## Step 4 — Test vendor upload

1. Open `https://jewelbazaari.com/vendor-upload.html`.
2. Log in as an **approved vendor**.
3. Choose 1–5 jewellery photos.
4. Submit the product.
5. Confirm:
   - Upload progress appears.
   - The product saves successfully.
   - New images appear in Cloudinary under `jewelbazaari/vendors/{vendorId}/`.
   - Product images load on the storefront from `https://res.cloudinary.com/...`.

## Step 5 — Local testing (optional)

### Option A — Recommended local server (`localhost:3000`)

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Fill in Cloudinary + Firebase values.
3. Run:

```bash
node scripts/start-server.js
```

4. Open `http://localhost:3000/registered-vendors.html` and test upload.

### Option B — Live Server / VS Code port 5500

Live Server cannot run `/api/upload-image`, so uploads fail with **405**.

Fix one of these:

1. Stop Live Server and use `node scripts/start-server.js` on port **3000**, or
2. Create a Cloudinary **unsigned upload preset** and set it in `public/js/cloudinary-config.js`:

```js
export const CLOUDINARY_UNSIGNED_PRESET = 'your_unsigned_preset_name';
```

Unsigned preset settings in Cloudinary:

- Signing mode: **Unsigned**
- Folder: `jewelbazaari/vendors`
- Max file size: **1 MB**
- Formats: `webp`, `jpg`, `png`

### Option C — Wrangler Pages dev

```bash
npx wrangler pages dev public
```

## Image rules used by jewelBazaari

| Setting | Value |
|---------|-------|
| Max photos per product | 5 |
| Aspect ratio | 4:5 portrait |
| Max dimensions | 1200 × 1500 px |
| Format | WebP |
| Max size | 1 MB per image |

Cloudinary also applies this transformation on upload:

`c_fill,g_auto,ar_4:5,w_1200,h_1500,q_auto:good,f_webp`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cloudinary is not configured` | Add all 3 Cloudinary env vars in Cloudflare Pages settings. |
| `Unauthorized` | Vendor must be logged in with Firebase after admin approval. |
| Upload works on live site only | Expected. Local static server does not run Pages Functions. |
| Image URL rejected in Firebase | Cloudinary URLs from `res.cloudinary.com` are already allowed. |

## Security notes

- Vendors must send a valid Firebase ID token.
- Cloudinary API secret stays on the server only.
- Each file is limited to **1 MB** before upload.
- Files are stored in folder `jewelbazaari/vendors/{vendorId}/`.