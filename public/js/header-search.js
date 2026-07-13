import { escapeHtml } from './security-utils.js';

const SEARCH_DESTINATIONS = [
    { label: 'Gold', url: 'gold.html', emoji: '✨', keywords: ['gold', 'go', 'gol', '22kt', '22k', '22 karat', '22kt gold'] },
    { label: 'Gemstones', url: 'gemstones.html', emoji: '💎', keywords: ['gemstone', 'gemstones', 'gem', 'ruby', 'emerald', 'sapphire'] },
    { label: 'Earrings', url: 'earrings.html', emoji: '👂', keywords: ['earring', 'earrings', 'jhumka', 'stud'] },
    { label: 'Rings', url: 'rings.html', emoji: '💍', keywords: ['ring', 'rings', 'engagement'] },
    { label: 'Bangles', url: 'bangles.html', emoji: '💫', keywords: ['bangle', 'bangles', 'kada', 'kadas', 'bracelet'] },
    { label: 'All Jewellery', url: 'all-jewellery.html', emoji: '💎', keywords: ['jewellery', 'jewelry', 'all', 'browse', 'shop'] },
    { label: 'Wedding', url: 'wedding.html', emoji: '💒', keywords: ['wedding', 'bridal', 'mangalsutra', 'haram'] },
    { label: 'Combos', url: 'combos.html', emoji: '🎁', keywords: ['combo', 'combos', 'set', 'bundle'] }
];

function normalizeQuery(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function scoreDestination(query, destination) {
    const label = destination.label.toLowerCase();
    let best = 0;

    if (label === query) return 100;
    if (label.startsWith(query)) best = Math.max(best, 90);
    if (label.includes(query)) best = Math.max(best, 75);

    for (const keyword of destination.keywords) {
        if (keyword === query) best = Math.max(best, 95);
        else if (keyword.startsWith(query)) best = Math.max(best, 85);
        else if (query.startsWith(keyword)) best = Math.max(best, 80);
        else if (keyword.includes(query)) best = Math.max(best, 60);
    }

    return best;
}

export function getSearchSuggestions(query, limit = 6) {
    const normalized = normalizeQuery(query);
    if (!normalized) return [];

    return SEARCH_DESTINATIONS
        .map((destination) => ({ destination, score: scoreDestination(normalized, destination) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.destination.label.localeCompare(b.destination.label))
        .slice(0, limit)
        .map((entry) => entry.destination);
}

export function resolveSearchDestination(query) {
    const suggestions = getSearchSuggestions(query, 1);
    return suggestions[0] || null;
}

function navigateToDestination(destination) {
    if (!destination?.url) return;
    window.location.href = destination.url;
}

function ensureSuggestionsList(input) {
    const wrap = input.closest('.jb-header-search-wrap, .home-search-bar, form[role="search"]');
    if (!wrap) return null;

    let list = wrap.querySelector('.jb-search-suggestions');
    if (!list) {
        list = document.createElement('div');
        list.className = 'jb-search-suggestions hidden';
        list.id = `${input.id || 'header-search-input'}-suggestions`;
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', 'Search suggestions');
        wrap.appendChild(list);
    }

    return list;
}

function renderSuggestions(input, list) {
    const query = input.value;
    const matches = getSearchSuggestions(query);

    if (!matches.length) {
        list.innerHTML = '';
        list.classList.add('hidden');
        input.setAttribute('aria-expanded', 'false');
        return;
    }

    list.innerHTML = matches.map((item, index) => `
        <button
            type="button"
            class="jb-search-suggestion"
            role="option"
            data-search-url="${escapeHtml(item.url)}"
            data-search-index="${index}"
        >
            <span class="jb-search-suggestion-emoji" aria-hidden="true">${item.emoji}</span>
            <span class="jb-search-suggestion-label">${escapeHtml(item.label)}</span>
        </button>
    `).join('');

    list.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', list.id);
}

function wireHeaderSearchInput(input) {
    if (!input || input.dataset.headerSearchWired === '1') return;
    input.dataset.headerSearchWired = '1';

    const form = input.closest('form[role="search"]');
    const submitBtn = form?.querySelector('.home-search-submit, .jb-header-search-submit');
    const list = ensureSuggestionsList(input);

    input.setAttribute('enterkeyhint', 'search');
    input.setAttribute('inputmode', 'search');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');

    function runSearch() {
        const destination = resolveSearchDestination(input.value);
        if (destination) {
            navigateToDestination(destination);
            return;
        }

        const query = normalizeQuery(input.value);
        window.location.href = query ? `all-jewellery.html?q=${encodeURIComponent(query)}` : 'all-jewellery';
    }

    function hideSuggestions() {
        if (!list) return;
        list.classList.add('hidden');
        input.setAttribute('aria-expanded', 'false');
    }

    input.addEventListener('input', () => {
        if (!list) return;
        renderSuggestions(input, list);
    });

    input.addEventListener('focus', () => {
        if (!list || !input.value.trim()) return;
        renderSuggestions(input, list);
    });

    input.addEventListener('blur', () => {
        window.setTimeout(hideSuggestions, 180);
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideSuggestions();
            return;
        }

        if (event.key !== 'Enter') return;

        event.preventDefault();

        const active = list?.querySelector('.jb-search-suggestion.is-active');
        if (active?.dataset.searchUrl) {
            window.location.href = active.dataset.searchUrl;
            return;
        }

        runSearch();
    });

    list?.addEventListener('mousedown', (event) => {
        event.preventDefault();
    });

    list?.addEventListener('click', (event) => {
        const button = event.target.closest('.jb-search-suggestion');
        if (!button?.dataset.searchUrl) return;
        window.location.href = button.dataset.searchUrl;
    });

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        runSearch();
    });

    submitBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        runSearch();
    });
}

export function initHeaderSearch(root = document) {
    root.querySelectorAll('#header-search-input').forEach(wireHeaderSearchInput);
}

document.addEventListener('jewelbazaari:components-loaded', () => initHeaderSearch());