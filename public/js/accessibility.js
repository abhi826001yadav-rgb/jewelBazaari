const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

const activeTraps = new Map();

function getFocusableElements(container) {
    if (!container) return [];
    return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter((el) => {
        if (el.getAttribute('aria-hidden') === 'true') return false;
        return el.offsetParent !== null || el === document.activeElement;
    });
}

function trapTabKey(event, container) {
    const focusable = getFocusableElements(container);
    if (!focusable.length) {
        event.preventDefault();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
    }

    if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

export function announce(message, priority = 'polite') {
    const region = ensureLiveRegion(priority);
    if (!region || !message) return;
    region.textContent = '';
    requestAnimationFrame(() => {
        region.textContent = message;
    });
}

function ensureLiveRegion(priority = 'polite') {
    const id = priority === 'assertive' ? 'jb-live-region-assertive' : 'jb-live-region-polite';
    let region = document.getElementById(id);
    if (region) return region;

    region = document.createElement('div');
    region.id = id;
    region.className = 'jb-live-region';
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    document.body.appendChild(region);
    return region;
}

export function ensureSkipLink() {
    if (document.getElementById('jb-skip-link')) return;

    const main = document.querySelector('main');
    if (!main) return;

    if (!main.id) {
        main.id = 'main-content';
    }

    const skip = document.createElement('a');
    skip.id = 'jb-skip-link';
    skip.href = `#${main.id}`;
    skip.className = 'jb-skip-link sr-only-focusable';
    skip.textContent = 'Skip to main content';
    document.body.insertBefore(skip, document.body.firstChild);
}

export function openAccessibleDialog({ panel, overlay, trigger, labelledBy, describedBy, initialFocus, onClose }) {
    if (!panel) return;

    const previousFocus = document.activeElement;

    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (labelledBy) panel.setAttribute('aria-labelledby', labelledBy);
    if (describedBy) panel.setAttribute('aria-describedby', describedBy);

    overlay?.classList.remove('hidden');
    panel.classList.remove('hidden');

    document.body.style.overflow = 'hidden';

    const focusTarget = initialFocus || getFocusableElements(panel)[0];
    requestAnimationFrame(() => focusTarget?.focus?.());

    const handleKeydown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeAccessibleDialog({ panel, overlay });
            return;
        }
        if (event.key === 'Tab') {
            trapTabKey(event, panel);
        }
    };

    document.addEventListener('keydown', handleKeydown);
    activeTraps.set(panel, { handleKeydown, previousFocus, trigger, overlay, onClose });
}

export function closeAccessibleDialog({ panel, overlay }) {
    if (!panel) return;

    const trap = activeTraps.get(panel);
    const resolvedOverlay = overlay ?? trap?.overlay;

    if (trap) {
        document.removeEventListener('keydown', trap.handleKeydown);
        trap.onClose?.();
        const restore = trap.trigger || trap.previousFocus;
        requestAnimationFrame(() => restore?.focus?.());
        activeTraps.delete(panel);
    }

    resolvedOverlay?.classList.add('hidden');
    panel.classList.add('hidden');
    document.body.style.overflow = '';
}

function markUnavailableLinks() {
    document.querySelectorAll('a[href="#"]').forEach((link) => {
        if (
            link.hasAttribute('data-mobile-gold-price') ||
            link.hasAttribute('data-gold-price-trigger') ||
            link.classList.contains('jb-more-toggle') ||
            link.getAttribute('onclick')
        ) {
            return;
        }
        link.setAttribute('aria-disabled', 'true');
        link.addEventListener('click', (event) => event.preventDefault());
    });
}

function enhanceCategorySearchInputs() {
    document.querySelectorAll('#search-input').forEach((input) => {
        if (input.getAttribute('aria-label') || input.labels?.length) return;
        const placeholder = input.getAttribute('placeholder') || 'Search products';
        input.setAttribute('aria-label', placeholder.replace(/\.\.\.$/, ''));
    });
}

function enhanceHeaderSearchInputs() {
    document.querySelectorAll('.home-search-input, .jb-header-search').forEach((input) => {
        if (input.getAttribute('aria-label')) return;
        const placeholder = input.getAttribute('placeholder') || 'Search jewellery';
        input.setAttribute('aria-label', placeholder.replace(/\.\.\.$/, ''));
    });
}

function wireGoldPriceTriggers() {
    document.querySelectorAll('[data-gold-price-trigger]').forEach((trigger) => {
        if (trigger.dataset.goldPriceWired) return;
        trigger.dataset.goldPriceWired = '1';
        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            if (typeof window.openGoldPriceModal === 'function') {
                window.openGoldPriceModal(trigger);
            }
        });
    });
}

export function initAccessibility() {
    ensureSkipLink();
    ensureLiveRegion('polite');
    markUnavailableLinks();
    enhanceCategorySearchInputs();
    enhanceHeaderSearchInputs();
    wireGoldPriceTriggers();

    document.addEventListener('jewelbazaari:components-loaded', () => {
        markUnavailableLinks();
        enhanceCategorySearchInputs();
        enhanceHeaderSearchInputs();
        wireGoldPriceTriggers();
    });
}

initAccessibility();

if (typeof window !== 'undefined') {
    window.jbA11y = {
        announce,
        openAccessibleDialog,
        closeAccessibleDialog,
        ensureSkipLink
    };
}