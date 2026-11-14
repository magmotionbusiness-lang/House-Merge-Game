/**
 * Store and ad network IDs for the native app. Replace the placeholders with
 * your own before submitting (see docs/APP-STORE.md):
 * - AdMob: create an iOS app and two ad units (Rewarded, Interstitial) at
 *   admob.google.com. Also put the AdMob *app* ID in ios/App/App/Info.plist
 *   (GADApplicationIdentifier).
 * - Remove Ads: create a non-consumable in-app purchase in App Store Connect
 *   with this product ID.
 *
 * While the ad unit IDs are Google's public test IDs, the app shows test ads
 * (safe to use in development and TestFlight; never earns money).
 */
export const NATIVE_IDS = {
  admobRewarded: 'ca-app-pub-3940256099942544/1712485313', // Google test ID: replace
  admobInterstitial: 'ca-app-pub-3940256099942544/4411468910', // Google test ID: replace
  removeAdsProduct: 'com.blueprintmerge.game.removeads',
};

export const USING_TEST_ADS = NATIVE_IDS.admobRewarded.startsWith('ca-app-pub-3940256099942544');
