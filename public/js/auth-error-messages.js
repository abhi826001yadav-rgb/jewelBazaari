export function getAuthErrorMessage(error) {
    const code = error?.code || '';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'your-domain';

    const messages = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'Invalid email or password.',
        'auth/wrong-password': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/unauthorized-domain': `This site (${host}) is not authorized for Google sign-in. In Firebase Console → Authentication → Settings → Authorized domains, click Add domain and enter: ${host}. Also add jewelbazaari.com if you use a custom domain.`,
        'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Google sign-in is blocked. On your Browser API key → API restrictions → add Identity Toolkit API and Token Service API → Save. Wait 5 minutes, then hard refresh.',
        'auth/operation-not-allowed': 'Email/password sign-in is disabled. In Firebase Console → Authentication → Sign-in method, enable Email/Password.',
        'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
        'auth/popup-blocked': 'Pop-up blocked. Allow pop-ups for this site and try again.',
        'auth/cancelled-popup-request': 'Sign-in cancelled. Please try again.',
        'auth/redirect-cancelled-by-user': 'Sign-in cancelled. Please try again.',
        'auth/redirect-operation-pending': 'Sign-in is already in progress. Please wait a moment and try again.',
        'auth/internal-error': 'Google sign-in failed. Hard refresh (Ctrl+Shift+R), then confirm Firebase authorized domains include your Cloudflare URL, Google sign-in is enabled, and the Browser API key allows Identity Toolkit API.',
        'auth/operation-not-supported-in-this-environment': 'Google sign-in is not supported in this browser view. Open the page in Safari or Chrome instead of an in-app browser.',
        'auth/network-request-failed': 'Network error during sign-in. Check your connection, disable Private Browsing, then try again.',
        'auth/missing-or-invalid-nonce': 'Sign-in session expired. Close this tab, reopen the page, and try Google sign-in again.',
        'auth/invalid-credential': 'Sign-in could not be completed. Check your credentials, hard refresh the page, and try again.',
        'auth/account-exists-with-different-credential': 'This email is linked to a different sign-in method. Use the method you registered with.',
        'auth/argument-error': 'Google sign-in could not start. Hard refresh the page (Ctrl+Shift+R) and try again.'
    };

    if (code === 'auth/internal-error' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
        return 'Google sign-in failed on this iPhone. Disable Private Browsing, close all Safari tabs for this site, reopen the page, and try again.';
    }

    return messages[code] || error?.message || 'Something went wrong. Please try again.';
}