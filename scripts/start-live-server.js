/**
 * Local dev server with clean-URL support (replaces plain VS Code Live Server).
 * Usage: node scripts/start-live-server.js
 * Opens http://localhost:5500 with /vendor-upload → vendor-upload.html rewrites.
 */
process.env.PORT = process.env.PORT || '5500';
require('./start-server.js');
