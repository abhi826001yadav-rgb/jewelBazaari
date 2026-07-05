export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function prefersSaveData() {
    return Boolean(navigator.connection?.saveData);
}

export function isSlowDevice() {
    return prefersReducedMotion() || prefersSaveData() || window.matchMedia('(max-width: 767px)').matches;
}

export function getSwiperAutoplayOptions(defaultDelay = 6000) {
    if (prefersReducedMotion() || prefersSaveData()) {
        return false;
    }
    return {
        delay: defaultDelay,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
    };
}

export function initMobilePerfHints() {
    if (!isSlowDevice()) return;

    document.querySelectorAll('.jb-shadow-card').forEach((card) => {
        card.style.willChange = 'auto';
    });
}