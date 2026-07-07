(function () {
    function showTapMessage(message) {
        var vendorStatus = document.getElementById('vendor-login-status');
        var adminStatus = document.getElementById('admin-login-error');
        var googleStatus = document.getElementById('google-auth-status');
        var target = vendorStatus || adminStatus || googleStatus;

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

        function onActivate(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            invokeHandler(globalName);
        }

        element.addEventListener('click', onActivate);
        element.addEventListener('touchend', onActivate, false);
    }

    function bindAll() {
        bindTapTarget('vendor-login-btn', '__jbVendorLoginSubmit');
        bindTapTarget('login-btn', '__jbAdminSignIn');
        bindTapTarget('google-signin-btn', '__jbGoogleSignIn');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }

    window.addEventListener('load', bindAll);
})();