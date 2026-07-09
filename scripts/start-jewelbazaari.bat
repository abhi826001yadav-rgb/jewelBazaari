@echo off
cd /d "%~dp0.."
set PORT=5500
echo Starting jewelBazaari on http://localhost:%PORT%
echo (Clean URLs like /vendor-upload and /admin work on this server)
echo If port 5500 is busy, stop VS Code Live Server first (Go Live button).
node scripts\start-server.js
