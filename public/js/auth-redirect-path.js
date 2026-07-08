(function () {
    var path = window.location.pathname || '';
    if (!/\.html$/i.test(path)) {
        return;
    }

    var normalized = path.replace(/\.html$/i, '');
    var next = normalized + (window.location.search || '') + (window.location.hash || '');
    window.history.replaceState(null, '', next);
})();