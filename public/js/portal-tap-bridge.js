(function () {
    var PORTAL_VERSION = '20260708m';

    // Mirrors isIOSDevice() in device-utils.js — kept inline because this script
    // must load before ES modules to preserve mobile tap/gesture handling.
    function isIOSDevice() {
        var ua = navigator.userAgent || '';
        return /iPhone|iPad|iPod/i.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    function showTapMessage(message) {
        var vendorStatus = document.getElementById('vendor-login-status');
        var adminStatus = document.getElementById('admin-login-error');
        var target = vendorStatus || adminStatus;

        if (!target) {
            return;
        }

        target.textContent = message;
        target.classList.remove('hidden');
    }

    function invokeHandler(globalName) {
        var handler = window[globalName];
        if (typeof handler === 'function') {
            handler();
            return true;
        }

        showTapMessage('Login is still loading. Wait one second, then tap again.');
        return false;
    }

    function bindTapTarget(id, globalName) {
        var element = document.getElementById(id);
        if (!element || element.dataset.jbTapBound === '1') {
            return;
        }

        element.dataset.jbTapBound = '1';
        var tapLock = false;
        var touchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        function onActivate(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            if (tapLock) {
                return;
            }

            tapLock = true;
            window.setTimeout(function () {
                tapLock = false;
            }, 1000);

            invokeHandler(globalName);
        }

        if (touchDevice && !isIOSDevice()) {
            // Android: pointerup only — a follow-up click would fire signIn twice (auth/argument-error).
            element.addEventListener('pointerup', onActivate);
            element.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
            });
        } else {
            element.addEventListener('click', onActivate);
        }
    }

    function bindAll() {
        // Admin Google OAuth only — vendor login uses form submit (email/password).
        bindTapTarget('login-btn', '__jbAdminSignIn');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }

    window.addEventListener('load', bindAll);
    window.__jbPortalVersion = PORTAL_VERSION;
})();