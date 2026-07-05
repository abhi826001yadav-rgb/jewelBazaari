export function getAuthErrorMessage(error) {
    const code = error?.code || '';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'your-domain';

    const messages = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'Invalid email or password.',
        'auth/wrong-password': 'Invalid email or password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/unauthorized-domain': `This site (${host}) is not authorized for Google sign-in. In Firebase Console → Authentication → Settings → Authorized domains, click Add domain and enter: ${host}. Also add jewelbazaari.com if you use a custom domain.`,
        'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Google sign-in is blocked. On your Browser API key → API restrictions → add Identity Toolkit API and Token Service API → Save. Wait 5 minutes, then hard refresh.',
        'auth/operation-not-allowed': 'Google sign-in is disabled. In Firebase Console → Authentication → Sign-in method, enable Google.',
        'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
        'auth/popup-blocked': 'Pop-up blocked. Allow pop-ups for this site and try again.',
        'auth/cancelled-popup-request': 'Sign-in cancelled. Please try again.',
        'auth/internal-error': 'Google sign-in failed. Hard refresh (Ctrl+Shift+R), then confirm Firebase authorized domains include your Cloudflare URL, Google sign-in is enabled, and the Browser API key allows Identity Toolkit API.'
    };

    return messages[code] || error?.message || 'Something went wrong. Please try again.';
}