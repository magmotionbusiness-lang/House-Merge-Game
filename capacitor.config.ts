import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The iOS app wraps the built game (dist/) so it runs offline from the app
 * bundle. Change appId to your own reverse-domain ID before the first
 * TestFlight upload; it must match the bundle ID registered in App Store Connect.
 */
const config: CapacitorConfig = {
  appId: 'com.blueprintmerge.game',
  appName: 'Blueprint Merge',
  webDir: 'dist',
  backgroundColor: '#0f2a4a',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0f2a4a',
    // The game handles its own safe areas (env(safe-area-inset-*)).
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0f2a4a',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
    },
  },
};

export default config;
