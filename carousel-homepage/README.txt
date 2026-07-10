============================================================
  ADMIN ONLY — Homepage Hero Carousel Guide
  (This folder is NOT on the public website.
   Visitors never see this file or this folder.)
============================================================

HOW PHOTOS GET ON THE WEBSITE EVERY TIME
----------------------------------------
Browsers cannot read this folder by themselves. A small sync
step copies your photos into the public website assets.

  1. You put / replace / delete photos in THIS folder.
  2. Sync runs (automatically when you start the local server,
     or when you run the sync script, or on predeploy).
  3. Sync copies up to 10 images into:
        public\images\hero-carousel\
     and writes the list file:
        public\js\hero-carousel-data.json
  4. Homepage loads that list and shows the carousel.

YOU DO NOT upload banners one-by-one in the admin panel.
Just manage files here, then sync + refresh.

When does sync run automatically?
  • scripts\start-jewelbazaari.bat   (every local start)
  • node scripts\start-server.js     (every local start)
  • scripts\predeploy-check.js       (before deploy checks)

Manual sync only (no server):
  node scripts\sync-hero-carousel.js

After sync: hard-refresh the homepage (Ctrl+F5).

Production / live site:
  Before you deploy, sync must have run so
  public\images\hero-carousel\ and the JSON are up to date.
  Deploy those public files with the rest of the site.
  (Do not deploy only carousel-homepage\ without syncing.)


BEST PHOTO DIMENSIONS (for a perfect fit)
----------------------------------------
The carousel uses object-fit: cover (image fills the frame;
edges may crop slightly if aspect ratio differs).

  ★ RECOMMENDED (best match for this site):
      Width:   1920 px
      Height:  800 px
      Ratio:   2.4 : 1   (or 12 : 5)
      Format:  .jpg or .webp
      Size:    under ~400–500 KB each (for fast loading)

  Also good:
      1920 × 720   (wider / more cinematic)
      1600 × 667   (same 2.4:1 ratio, slightly smaller file)

  Avoid:
      Tall / portrait photos (they will crop heavily left/right
      or look wrong in the wide center banner)
      Tiny images under ~1000px wide (look soft on desktop)
      Huge files over ~1.5 MB (slow mobile load)

Tips for a premium look (like Tanishq):
  • Keep the main subject near the CENTER of the image
    (sides get partially hidden on peeks / small screens)
  • Leave a little safe margin on left/right edges
  • Prefer soft, high-quality jewellery photography
  • Same ratio for all banners = smoothest carousel


FILE NAMES = ORDER ON HOMEPAGE
------------------------------
  01.jpg  → first slide  (starts LEFT peek)
  02.jpg  → second slide (starts CENTER — featured)
  03.jpg  → third slide  (starts RIGHT peek)
  04.jpg … 10.jpg

Max 10 photos. Extra files beyond 10 are ignored.
Supported: .jpg  .jpeg  .png  .webp

One file per banner. Do not put both 01.jpg and 01.webp
unless you want them as two separate slides.


QUICK CHECKLIST
---------------
  [ ] Photo is about 1920 × 800 (2.4:1)
  [ ] Named 01, 02, 03… for order
  [ ] Saved in this folder only
  [ ] Ran start-jewelbazaari.bat OR sync-hero-carousel.js
  [ ] Ctrl+F5 on homepage
  [ ] Before going live: sync + deploy public/ assets


DO NOT EDIT BY HAND
-------------------
  public\images\hero-carousel\     ← overwritten every sync
  public\js\hero-carousel-data.json

Edit photos only in:
  carousel-homepage\   ← YOU ARE HERE (admin / project only)

============================================================
