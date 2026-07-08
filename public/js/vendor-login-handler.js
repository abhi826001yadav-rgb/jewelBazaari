import { loginVendor } from './vendor-service.js';
import { safeGetItem, safeSetItem } from './safe-storage.js';

export function restoreRememberedVendorEmail(input) {
    if (!input) {
        return;
    }

    const rememberedVendorEmail = safeGetItem(localStorage, 'jb_last_vendor_email');
    if (rememberedVendorEmail) {
        input.value = rememberedVendorEmail;
    }
}

export function formatVendorLoginError(error) {
    if (error.code === 'vendor/pending-approval') {
        return { message: error.message, type: 'info' };
    }

    if (error.code === 'permission-denied') {
        return {
            message: 'Login blocked by database permissions. Ask admin to deploy the latest Firestore rules.',
            type: 'error'
        };
    }

    const message = error.message || 'Login failed.';
    if (/approved vendor registration|not authorized|not approved|under admin review/i.test(message)) {
        return { message, type: 'info' };
    }

    return { message, type: 'error' };
}

export async function submitVendorLogin({
    email,
    password,
    onStatus,
    onSuccess,
    emailInput,
    passwordInput
}) {
    const cleanEmail = email?.trim() || '';
    const cleanPassword = password || '';

    if (!cleanEmail || !cleanPassword) {
        return { ok: false, error: { message: 'Enter your registered email and vendor password.', type: 'error' } };
    }

    try {
        const vendor = await loginVendor({
            email: cleanEmail,
            password: cleanPassword,
            onStatus
        });

        safeSetItem(localStorage, 'jb_last_vendor_email', vendor.email || cleanEmail);

        if (passwordInput) {
            passwordInput.value = '';
        }

        if (emailInput) {
            emailInput.value = vendor.email || cleanEmail;
        }

        if (typeof onSuccess === 'function') {
            await onSuccess(vendor);
        }

        return { ok: true, vendor };
    } catch (error) {
        console.error('Vendor login error:', error);
        return { ok: false, error: formatVendorLoginError(error) };
    }
}