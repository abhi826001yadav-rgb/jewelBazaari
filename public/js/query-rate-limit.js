const SESSION_KEY = 'jb_query_submitted';
const STORAGE_KEY = 'jb_query_last_submit';

export const QUERY_RATE_LIMIT_MESSAGE =
    'You can only submit one query per day. Please try again tomorrow or contact us directly.';

export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

export function getEpochDay(date = new Date()) {
    return Math.floor(date.getTime() / 86400000);
}

export function buildQueryDocId(email, epochDay = getEpochDay()) {
    return `${normalizeEmail(email)}_${epochDay}`;
}

export function isBlockedByClientRateLimit() {
    const today = String(getEpochDay());
    return sessionStorage.getItem(SESSION_KEY) === today
        || localStorage.getItem(STORAGE_KEY) === today;
}

export function markClientRateLimitUsed() {
    const today = String(getEpochDay());
    sessionStorage.setItem(SESSION_KEY, today);
    localStorage.setItem(STORAGE_KEY, today);
}