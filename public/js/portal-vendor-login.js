import {
    restoreRememberedVendorEmail,
    submitVendorLogin as runVendorLogin
} from './vendor-login-handler.js';
import {
    installIOSVendorLoginFixes,
    bindVendorLoginForm,
    markVendorLoginReady,
    installVendorBootGuards
} from './vendor-login-fix.js';

const vendorLoginStatus = document.getElementById('vendor-login-status');
const loginVendorEmailInput = document.getElementById('login-vendor-email');
const loginVendorPasswordInput = document.getElementById('login-vendor-password');
const loginBtn = document.getElementById('vendor-login-btn');

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

restoreRememberedVendorEmail(loginVendorEmailInput);

if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.setAttribute('aria-busy', 'true');
}

let vendorLoginInFlight = false;

async function submitVendorLogin() {
    if (vendorLoginInFlight) {
        return;
    }

    vendorLoginInFlight = true;
    clearStatus();

    try {
        if (loginBtn) {
            loginBtn.disabled = true;
        }

        const result = await runVendorLogin({
            email: loginVendorEmailInput?.value,
            password: loginVendorPasswordInput?.value,
            emailInput: loginVendorEmailInput,
            passwordInput: loginVendorPasswordInput,
            onStatus: (message) => setStatus(message, 'info'),
            onSuccess: (vendor) => {
                window.dispatchEvent(new CustomEvent('jb:vendor-authenticated', {
                    detail: { vendor }
                }));
            }
        });

        if (!result.ok) {
            setStatus(result.error.message, result.error.type);
        }
    } finally {
        vendorLoginInFlight = false;
        if (loginBtn) {
            loginBtn.disabled = false;
        }
    }
}

installIOSVendorLoginFixes();
installVendorBootGuards({
    scriptPattern: /portal-vendor-login|vendor-service|vendor-login-handler|firebase-config/i
});
bindVendorLoginForm(submitVendorLogin);
window.__jbVendorLoginSubmit = submitVendorLogin;

if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.removeAttribute('aria-busy');
    loginBtn.textContent = 'Login to Dashboard';
}

markVendorLoginReady();