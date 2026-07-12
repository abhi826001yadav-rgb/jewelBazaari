@echo off
cd /d "%~dp0.."
set PORT=5500
echo Syncing desktop carousel from carousel-homepage\ ...
node scripts\sync-hero-carousel.js
echo Syncing mobile carousel from mobile_carousel-homepage\ ...
node scripts\sync-hero-carousel-mobile.js
echo.
echo Starting jewelBazaari on http://localhost:%PORT%
echo (Clean URLs like /vendor-upload and /admin work on this server)
echo If port 5500 is busy, stop VS Code Live Server first (Go Live button).
echo Desktop banners: carousel-homepage\   Mobile banners: mobile_carousel-homepage\
node scripts\start-server.js
