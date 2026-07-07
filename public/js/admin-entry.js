import { consumeRedirectResult } from './google-auth.js?v=20260707l';

await consumeRedirectResult();
await import('./portal-admin-login.js?v=20260707l');
await import('./admin-dashboard.js?v=20260707l');