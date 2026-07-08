const REWRITES = new Map([
  ['/admin', '/admin.html'],
  ['/vendor-upload', '/vendor-upload.html']
]);

module.exports = function setup(app) {
  app.use((req, res, next) => {
    const [pathname, ...searchParts] = (req.url || '').split('?');
    const rewritten = REWRITES.get(pathname);

    if (rewritten) {
      const search = searchParts.length ? `?${searchParts.join('?')}` : '';
      req.url = `${rewritten}${search}`;
    }

    next();
  });
};