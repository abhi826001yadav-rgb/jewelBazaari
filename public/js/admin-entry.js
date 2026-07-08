import { consumeRedirectResult } from './google-auth.js?v=20260708a';

await consumeRedirectResult();
await import('./portal-admin-login.js?v=20260708a');
await import('./admin-dashboard.js?v=20260708a');