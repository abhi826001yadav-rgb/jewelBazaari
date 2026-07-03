export const ADMIN_EMAILS = [
    'abhi826001yadav@gmail.com',
    'priankasuresh97@gmail.com'
];

export function isAdminEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalized);
}