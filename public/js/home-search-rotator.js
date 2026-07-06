const HOME_SEARCH_PLACEHOLDERS = [
    { text: 'Search your jewellery here', emoji: '💍' },
    { text: '22KT gold jewellery', emoji: '✨' }
];

const ROTATE_MS = 3000;

function formatPlaceholder({ emoji, text }) {
    return `${emoji} ${text}`;
}

export function initHomeSearchRotator() {
    const input = document.querySelector('.home-search-input');
    if (!input || input.dataset.rotatorWired === '1') return;

    input.dataset.rotatorWired = '1';

    let index = 0;
    let timerId = null;

    function applyPlaceholder(nextIndex) {
        const item = HOME_SEARCH_PLACEHOLDERS[nextIndex];
        if (!item || document.activeElement === input || input.value.trim()) return;

        const placeholder = formatPlaceholder(item);
        input.setAttribute('placeholder', placeholder);
        input.setAttribute('aria-label', item.text);
    }

    function rotate() {
        index = (index + 1) % HOME_SEARCH_PLACEHOLDERS.length;
        applyPlaceholder(index);
    }

    function start() {
        stop();
        applyPlaceholder(index);
        timerId = window.setInterval(rotate, ROTATE_MS);
    }

    function stop() {
        if (timerId !== null) {
            window.clearInterval(timerId);
            timerId = null;
        }
    }

    input.addEventListener('focus', stop);
    input.addEventListener('blur', () => {
        if (!input.value.trim()) start();
    });

    start();
}

document.addEventListener('jewelbazaari:components-loaded', initHomeSearchRotator);