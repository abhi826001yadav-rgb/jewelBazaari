import { PORTAL_VERSION } from './portal-version.js';

export {
    isIOSDevice,
    bindTapButton,
    bindVendorLoginForm,
    bindAdminLoginButton,
    installIOSVendorLoginFixes,
    installPortalIOSFixes,
    markVendorLoginReady,
    markAdminLoginReady,
    showVendorBootError,
    showAdminBootError,
    installPortalBootGuards,
    installVendorBootGuards,
    installAdminBootGuards
} from `./ios-vendor-login-fix.js?v=${PORTAL_VERSION}`;