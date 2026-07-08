(function () {
    var PORTAL_VERSION = '20260708c';

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
        if (id === 'login-btn') {
            return;
        }

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

        if (touchDevice) {
            element.addEventListener('pointerup', onActivate);
        } else {
            element.addEventListener('click', onActivate);
        }
    }

    function bindAll() {
        bindTapTarget('vendor-login-btn', '__jbVendorLoginSubmit');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }

    window.addEventListener('load', bindAll);
    window.__jbPortalVersion = PORTAL_VERSION;
})();