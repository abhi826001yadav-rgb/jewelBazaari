await import('./portal-admin-login.js');
await import('./admin-dashboard.js');
import('./instagram-browser-banner.js').then(({ initInstagramBrowserBanner }) => {
    initInstagramBrowserBanner();
});