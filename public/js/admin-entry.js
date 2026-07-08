import { consumeRedirectResult } from './google-auth.js';

await consumeRedirectResult();
await import('./portal-admin-login.js');
await import('./admin-dashboard.js');