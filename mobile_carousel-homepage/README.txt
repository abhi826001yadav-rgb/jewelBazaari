============================================================
  ADMIN ONLY — Mobile Homepage Hero Carousel Guide
  (This folder is NOT on the public website.
   Visitors never see this file or this folder.)
============================================================

WHY A SEPARATE MOBILE FOLDER?
-----------------------------
Desktop banners are wide (1920×800). On phones the hero frame
is nearly square / slightly tall, so the same wide poster
crops badly (faces, jewellery, and text get cut off).

  Desktop photos  →  carousel-homepage\          (UNTOUCHED)
  Mobile photos   →  mobile_carousel-homepage\   (YOU ARE HERE)

Both use the same sync algorithm; only size / ratio / file-
size budget differ.


HOW PHOTOS GET ON THE WEBSITE EVERY TIME
----------------------------------------
Browsers cannot read this folder by themselves. A small sync
step copies your photos into the public website assets.

  1. You put / replace / delete photos in THIS folder.
  2. Sync runs (automatically when you start the local server,
     or when you run the sync script, or on predeploy).
  3. Sync copies up to 10 images into:
        public\images\hero-carousel-mobile\
     and writes the list file:
        public\js\hero-carousel-data-mobile.json
  4. Homepage uses these on screens ≤ 639px wide.
     Desktop still uses carousel-homepage\ only.

YOU DO NOT upload banners one-by-one in the admin panel.
Just manage files here, then sync + refresh.

When does sync run automatically?
  • scripts\start-jewelbazaari.bat   (every local start)
  • node scripts\start-server.js     (every local start)
  • scripts\predeploy-check.js       (before deploy checks)

Manual sync only (no server):
  node scripts\sync-hero-carousel-mobile.js

  Or sync BOTH desktop + mobile:
  npm run sync-carousel

After sync: hard-refresh the homepage on your phone or with
browser DevTools mobile view (Ctrl+F5).

If this folder is empty:
  Mobile users temporarily see desktop banners (fallback).
  Fill this folder for a proper mobile look.

Production / live site:
  Before you deploy, sync must have run so
  public\images\hero-carousel-mobile\ and the JSON are up to date.
  Deploy those public files with the rest of the site.
  (Do not deploy only mobile_carousel-homepage\ without syncing.)


BEST PHOTO DIMENSIONS (for a perfect mobile fit)
------------------------------------------------
The mobile carousel shows ONE full-width card (no side peeks).
CSS uses object-fit: cover — the image fills the rounded card;
edges crop slightly only if your ratio differs.

  ★ RECOMMENDED (best match for this site’s mobile frame):
      Width:   1080 px
      Height:  960 px
      Ratio:   9 : 8   (≈ 1.125 : 1)  — slightly wider than square
      Format:  .jpg or .webp

  Why these numbers?
      On phones the card is about min(92% of screen, 400px) wide
      and about 270–360px tall. That is near-square, NOT the
      wide 2.4:1 desktop strip. A 1080×960 poster maps cleanly
      so jewellery and faces stay centered without heavy crop.

  AUTO-COMPRESS (built into sync):
      Your originals in this folder stay untouched.
      Website copies are resized (max 1080×960) and JPEG-
      compressed with adaptive quality until each file is
      ≤ 150 KB. Safe to drop large 2–5 MB camera exports.

  Also good:
      1080 × 1000   (a touch taller — more poster feel)
      900 × 800     (same 9:8 ratio, slightly smaller)
      1080 × 1080   (true square — slight top/bottom crop OK)

  Avoid:
      Ultra-wide desktop banners (1920×800) — sides crop hard
      Very tall portrait posters (9:16 stories) — top/bottom crop
      Tiny images under ~700px wide (look soft on modern phones)
      Huge files over ~1.5 MB (slow mobile load; sync still helps)


COMPOSITION TIPS FOR MOBILE
---------------------------
  • Keep the MAIN subject in the CENTER safe zone
    (about the middle 70% of width and height)
  • Leave a little margin on all four edges (rounded corners
    and object-fit: cover clip the extremes)
  • Prefer one clear hero product / model face over busy collages
  • Same ratio for all mobile banners = smoothest carousel
  • Match slide ORDER with desktop (01, 02, 03…) so the same
    campaign advances together on phone and desktop


FILE NAMES = ORDER ON HOMEPAGE
------------------------------
  01.jpg  → first slide
  02.jpg  → second slide (often the featured/start center)
  03.jpg  → third slide
  04.jpg … 10.jpg

Max 10 photos. Extra files beyond 10 are ignored.
Supported: .jpg  .jpeg  .png  .webp

One file per banner. Do not put both 01.jpg and 01.webp
unless you want them as two separate slides.


QUICK CHECKLIST
---------------
  [ ] Photo is about 1080 × 960 (9:8)
  [ ] Named 01, 02, 03… for order (match desktop if possible)
  [ ] Saved in THIS folder only (not carousel-homepage\)
  [ ] Ran start-jewelbazaari.bat OR sync-hero-carousel-mobile.js
  [ ] Ctrl+F5 on homepage in mobile view / real phone
  [ ] Before going live: sync + deploy public/ assets


DO NOT EDIT BY HAND
-------------------
  public\images\hero-carousel-mobile\     ← overwritten every sync
  public\js\hero-carousel-data-mobile.json

Edit mobile photos only in:
  mobile_carousel-homepage\   ← YOU ARE HERE (admin / project only)

Desktop photos stay in:
  carousel-homepage\          ← separate, leave as-is for desktop

============================================================
