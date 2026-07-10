@echo off
cd /d "%~dp0.."
set PORT=5500
echo Syncing homepage carousel from carousel-homepage\ ...
node scripts\sync-hero-carousel.js
echo.
echo Starting jewelBazaari on http://localhost:%PORT%
echo (Clean URLs like /vendor-upload and /admin work on this server)
echo If port 5500 is busy, stop VS Code Live Server first (Go Live button).
echo Drop up to 10 photos in carousel-homepage\ then restart to update banners.
node scripts\start-server.js
