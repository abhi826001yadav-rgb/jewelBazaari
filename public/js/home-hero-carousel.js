/**
 * Homepage hero carousel — loads up to 10 slides from hero-carousel-data.json
 * (desktop: scripts/sync-hero-carousel.js ← carousel-homepage/)
 * and optional mobile-optimized slides from hero-carousel-data-mobile.json
 * (mobile: scripts/sync-hero-carousel-mobile.js ← mobile_carousel-homepage/).
 *
 * Layout: always shows left peek | center featured | right peek when 3+ slides.
 * With 1 slide: center only. With 2: left + center (or center + right via rotation).
 * Screens ≤ 639px use mobile sources via <picture> when available.
 */

const MANIFEST_URL = 'js/hero-carousel-data.json';
const MANIFEST_MOBILE_URL = 'js/hero-carousel-data-mobile.json';
const HOLD_MS = 5000;
const FALLBACK_SLIDES = [
  {
    src: 'images/photo1.jpg',
    alt: 'Premium gold and diamond jewellery collection at jewelBazaari'
  },
  {
    src: 'images/photo3.jpg',
    alt: 'Designer gemstone earrings and necklaces'
  },
  {
    src: 'images/photo4.jpg',
    alt: 'Luxury diamond rings and fine jewellery'
  }
];

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchManifest(url) {
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const slides = Array.isArray(data?.slides) ? data.slides : [];
    return slides.slice(0, 10).map((s, i) => ({
      src: s.src,
      alt: s.alt || `jewelBazaari featured collection ${i + 1}`
    }));
  } catch {
    return [];
  }
}

async function loadSlides() {
  const [desktop, mobile] = await Promise.all([
    fetchManifest(MANIFEST_URL),
    fetchManifest(MANIFEST_MOBILE_URL)
  ]);

  const base = desktop.length > 0 ? desktop : FALLBACK_SLIDES;

  return base.map((slide, i) => ({
    src: slide.src,
    alt: slide.alt,
    /* Pair by index; missing mobile slide falls back to desktop src */
    mobileSrc: mobile[i]?.src || null,
    mobileAlt: mobile[i]?.alt || slide.alt
  }));
}

const ALL_JEWELLERY_HREF = 'all-jewellery.html';

function buildCard(slide, index, total) {
  /* Slide 2 starts in center when possible (index 1); eager-load it for LCP */
  const isCenterCandidate = total === 1 ? index === 0 : index === 1;
  const loading = isCenterCandidate ? 'eager' : 'lazy';
  const priority = isCenterCandidate ? ' fetchpriority="high"' : '';
  const alt = escapeAttr(slide.alt);
  const desktopSrc = escapeAttr(slide.src);

  let media;
  if (slide.mobileSrc) {
    const mobileSrc = escapeAttr(slide.mobileSrc);
    media = `
      <picture>
        <source media="(max-width: 639px)" srcset="${mobileSrc}">
        <img src="${desktopSrc}" alt="${alt}" width="1920" height="800" loading="${loading}" decoding="async"${priority}>
      </picture>
    `.trim();
  } else {
    media = `<img src="${desktopSrc}" alt="${alt}" width="1920" height="800" loading="${loading}" decoding="async"${priority}>`;
  }

  return `
    <button type="button" class="jb-hero-card" data-index="${index}" aria-label="Banner ${index + 1} of ${total} — view all jewellery">
      <div class="jb-hero-frame">
        ${media}
      </div>
    </button>
  `.trim();
}

function buildDots(total, activeIndex) {
  return Array.from({ length: total }, (_, i) => {
    const current = i === activeIndex ? ' aria-current="true"' : '';
    return `<button type="button" class="jb-hero-dot" data-dot="${i}" aria-label="Go to banner ${i + 1}"${current}></button>`;
  }).join('');
}

export async function initHomeHeroCarousel() {
  const stage = document.getElementById('jb-hero-stage');
  const dotsRoot = document.getElementById('jb-hero-dots');
  const prevBtn = document.getElementById('jb-hero-prev');
  const nextBtn = document.getElementById('jb-hero-next');
  if (!stage || !dotsRoot) return;

  const slides = await loadSlides();
  const total = slides.length;
  if (total === 0) {
    stage.innerHTML = '';
    dotsRoot.innerHTML = '';
    return;
  }

  /* Start with slide 2 in center when possible (index 1); else first slide */
  let centerIndex = total >= 2 ? 1 : 0;

  stage.innerHTML = slides.map((s, i) => buildCard(s, i, total)).join('');
  dotsRoot.innerHTML = buildDots(total, centerIndex);

  const cards = Array.from(stage.querySelectorAll('.jb-hero-card'));
  const dots = Array.from(dotsRoot.querySelectorAll('.jb-hero-dot'));

  let timer = null;
  let pointerId = null;
  let touchStartX = 0;
  let swiped = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const autoplayOn = !reduceMotion && !saveData && total > 1;

  function applyPositions() {
    if (total === 1) {
      cards[0].dataset.pos = 'center';
      cards[0].setAttribute('aria-current', 'true');
      return;
    }

    const leftIndex = (centerIndex - 1 + total) % total;
    const rightIndex = (centerIndex + 1) % total;

    cards.forEach((card, i) => {
      let pos = 'hidden';
      if (i === centerIndex) pos = 'center';
      else if (i === leftIndex) pos = 'left';
      else if (i === rightIndex) pos = 'right';

      const prevPos = card.dataset.pos;
      const wraps =
        (prevPos === 'left' && pos === 'right') ||
        (prevPos === 'right' && pos === 'left');
      if (wraps) card.style.transition = 'none';

      card.dataset.pos = pos;
      card.setAttribute('aria-current', pos === 'center' ? 'true' : 'false');
      card.setAttribute('tabindex', pos === 'hidden' ? '-1' : '0');
      card.setAttribute('aria-hidden', pos === 'hidden' ? 'true' : 'false');

      if (wraps) {
        void card.offsetWidth;
        card.style.transition = '';
      }
    });

    dots.forEach((dot, i) => {
      if (i === centerIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function goTo(index) {
    centerIndex = ((index % total) + total) % total;
    applyPositions();
    restartTimer();
  }

  function next() {
    goTo(centerIndex + 1);
  }

  function prev() {
    goTo(centerIndex - 1);
  }

  function restartTimer() {
    if (timer) clearInterval(timer);
    timer = null;
    if (!autoplayOn) return;
    timer = setInterval(next, HOLD_MS);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  prevBtn?.addEventListener('click', () => prev());
  nextBtn?.addEventListener('click', () => next());

  if (total <= 1) {
    prevBtn?.setAttribute('hidden', '');
    nextBtn?.setAttribute('hidden', '');
  } else {
    prevBtn?.removeAttribute('hidden');
    nextBtn?.removeAttribute('hidden');
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const i = Number(dot.dataset.dot);
      if (!Number.isNaN(i)) goTo(i);
    });
  });

  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (swiped) {
        e.preventDefault();
        return;
      }
      /* Any banner tap → All Jewellery (swipe still changes slides) */
      window.location.href = ALL_JEWELLERY_HREF;
    });
  });

  stage.addEventListener('pointerdown', (e) => {
    if (total <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerId = e.pointerId;
    touchStartX = e.clientX;
    swiped = false;
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    stopTimer();
  });

  stage.addEventListener('pointerup', (e) => {
    if (total <= 1) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    const dx = e.clientX - touchStartX;
    pointerId = null;
    touchStartX = 0;
    if (Math.abs(dx) > 40) {
      swiped = true;
      if (dx < 0) next();
      else prev();
      setTimeout(() => {
        swiped = false;
      }, 50);
    } else {
      restartTimer();
    }
  });

  stage.addEventListener('pointercancel', () => {
    pointerId = null;
    touchStartX = 0;
    restartTimer();
  });

  stage.addEventListener('mouseenter', stopTimer);
  stage.addEventListener('mouseleave', restartTimer);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTimer();
    else restartTimer();
  });

  applyPositions();
  restartTimer();
}
