import { isNative } from './platform';

/**
 * Public pages (served from the Vercel site): Apple requires a privacy policy
 * URL and a support URL in App Store Connect, and the app links to both.
 * Set SITE to your production domain.
 */
export const SITE = 'https://house-merge-game.vercel.app';
export const PRIVACY_URL = `${isNative ? SITE : ''}/privacy.html`;
export const SUPPORT_URL = `${isNative ? SITE : ''}/support.html`;
export const APP_VERSION = __APP_VERSION__;
