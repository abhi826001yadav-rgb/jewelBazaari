/** Gold purity options shown after Metal Type = Gold */
export const GOLD_PURITIES = [
    { value: '9kt', label: '9kt' },
    { value: '14kt', label: '14kt' },
    { value: '18kt', label: '18kt' },
    { value: '22kt', label: '22kt' }
];

/** Gold colour options shown after purity is chosen */
export const GOLD_COLORS = [
    { value: 'rose gold', label: 'Rose Gold' },
    { value: 'white gold', label: 'White Gold' },
    { value: 'yellow gold', label: 'Yellow Gold' }
];

/**
 * Build stored metalType value.
 * Gold → e.g. "14kt rose gold"; other metals keep their base value.
 */
export function composeMetalType(base, purity = '', color = '') {
    const metal = String(base || '').trim().toLowerCase();
    if (!metal) return '';
    if (metal === 'gold') {
        const kt = String(purity || '').trim().toLowerCase();
        const colour = String(color || '').trim().toLowerCase();
        if (!kt || !colour) return '';
        return `${kt} ${colour}`;
    }
    return metal;
}

/**
 * Parse a stored metalType back into form fields.
 * Supports legacy "gold" and detailed "14kt rose gold".
 */
export function parseMetalType(metalType) {
    const raw = String(metalType || '').trim().toLowerCase();
    if (!raw) {
        return { base: '', purity: '', color: '' };
    }
    if (raw === 'none' || raw === 'silver' || raw === 'platinum') {
        return { base: raw, purity: '', color: '' };
    }

    const purityMatch = raw.match(/\b(9|14|18|22)\s*k\s*t\b/i);
    const purity = purityMatch ? `${purityMatch[1]}kt` : '';

    let color = '';
    if (raw.includes('rose gold')) color = 'rose gold';
    else if (raw.includes('white gold')) color = 'white gold';
    else if (raw.includes('yellow gold')) color = 'yellow gold';

    if (raw === 'gold' || raw.includes('gold') || purity || color) {
        return { base: 'gold', purity, color };
    }

    return { base: raw, purity: '', color: '' };
}

/** True if metalType is gold or a gold variant (e.g. 18kt yellow gold). */
export function isGoldMetalType(metalType) {
    const raw = String(metalType || '').trim().toLowerCase();
    if (!raw) return false;
    return raw === 'gold' || raw.includes('gold');
}

/** Human-readable metal label for previews. */
export function formatMetalTypeLabel(metalType) {
    const raw = String(metalType || '').trim();
    if (!raw || raw.toLowerCase() === 'none') return '';
    return raw
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => {
            if (/^\d+kt$/i.test(part)) return part.toLowerCase();
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join(' ');
}
