import { loginVendor } from './vendor-service.js?v=20260707c';
import { safeGetItem, safeSetItem } from './safe-storage.js?v=20260707c';
import {
    installIOSVendorLoginFixes,
    bindVendorLoginButton,
    markVendorLoginReady,
    showVendorBootError
} from './ios-vendor-login-fix.js?v=20260707c';

window.__jbShowVendorBootError = showVendorBootError;

const vendorLoginStatus = document.getElementById('vendor-login-status');
const loginVendorEmailInput = document.getElementById('login-vendor-email');
const loginVendorPasswordInput = document.getElementById('login-vendor-password');

function setStatus(message, type = 'info') {
    if (!vendorLoginStatus) {
        return;
    }

    vendorLoginStatus.textContent = message;
    vendorLoginStatus.classList.remove('hidden', 'status-success', 'status-error', 'status-info');
    vendorLoginStatus.classList.add(`status-${type}`);
}

function clearStatus() {
    if (!vendorLoginStatus) {
        return;
    }

    vendorLoginStatus.textContent = '';
    vendorLoginStatus.classList.add('hidden');
    vendorLoginStatus.classList.remove('status-success', 'status-error', 'status-info');
}

if (loginVendorEmailInput) {
    const rememberedVendorEmail = safeGetItem(localStorage, 'jb_last_vendor_email');
    if (rememberedVendorEmail) {
        loginVendorEmailInput.value = rememberedVendorEmail;
    }
}

async function submitVendorLogin() {
    clearStatus();

    const email = loginVendorEmailInput?.value.trim() || '';
    const password = loginVendorPasswordInput?.value || '';
    const loginBtn = document.getElementById('vendor-login-btn');

    if (!email || !password) {
        setStatus('Enter your registered email and vendor password.', 'error');
        return;
    }

    try {
        if (loginBtn) {
            loginBtn.disabled = true;
        }

        const vendor = await loginVendor({
            email,
            password,
            onStatus: (message) => setStatus(message, 'info')
        });

        safeSetItem(localStorage, 'jb_last_vendor_email', vendor.email || email);
        if (loginVendorPasswordInput) {
            loginVendorPasswordInput.value = '';
        }
        if (loginVendorEmailInput) {
            loginVendorEmailInput.value = vendor.email || email;
        }

        window.dispatchEvent(new CustomEvent('jb:vendor-authenticated', {
            detail: { vendor }
        }));
    } catch (error) {
        console.error('Vendor login error:', error);
        if (error.code === 'vendor/pending-approval') {
            setStatus(error.message, 'info');
        } else if (error.code === 'permission-denied') {
            setStatus('Login blocked by database permissions. Ask admin to deploy the latest Firestore rules.', 'error');
        } else {
            setStatus(error.message || 'Login failed.', 'error');
        }
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
        }
    }
}

installIOSVendorLoginFixes();
bindVendorLoginButton(submitVendorLogin);
window.__jbVendorLoginSubmit = submitVendorLogin;
markVendorLoginReady();