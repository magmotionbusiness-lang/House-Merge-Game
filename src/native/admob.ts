import { AdMob, AdmobConsentStatus, type AdMobRewardItem } from '@capacitor-community/admob';
import type { AdService } from '../ads/ads';
import type { RewardPlacement } from '../ads/policy';
import { NATIVE_IDS, USING_TEST_ADS } from './ids';

/**
 * Real ads in the iOS app via Google AdMob, behind the same AdService the web
 * mock implements. On start it asks Apple's App Tracking Transparency question
 * and runs Google's UMP consent flow (shown only where the law requires it,
 * e.g. EU/UK). Ads are preloaded so a rewarded ad opens instantly.
 */
export class AdMobService implements AdService {
  readonly name = 'admob';
  private ready: Promise<void>;
  private npa = false;
  private rewardedLoaded = false;
  private interstitialLoaded = false;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    try {
      // Apple's "Allow tracking?" prompt first, then Google's consent form if needed.
      const att = await AdMob.trackingAuthorizationStatus();
      if (att.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      await AdMob.initialize({ initializeForTesting: USING_TEST_ADS });
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
      const after = await AdMob.trackingAuthorizationStatus();
      this.npa = after.status !== 'authorized';
    } catch {
      /* ads simply won't load; the game never depends on them */
    }
    void this.loadRewarded();
    void this.loadInterstitial();
  }

  private opts(adId: string) {
    return { adId, isTesting: USING_TEST_ADS, npa: this.npa };
  }

  private async loadRewarded() {
    try {
      await AdMob.prepareRewardVideoAd(this.opts(NATIVE_IDS.admobRewarded));
      this.rewardedLoaded = true;
    } catch {
      this.rewardedLoaded = false;
    }
  }

  private async loadInterstitial() {
    try {
      await AdMob.prepareInterstitial(this.opts(NATIVE_IDS.admobInterstitial));
      this.interstitialLoaded = true;
    } catch {
      this.interstitialLoaded = false;
    }
  }

  async showRewarded(_placement: RewardPlacement): Promise<boolean> {
    await this.ready;
    if (!this.rewardedLoaded) await this.loadRewarded();
    if (!this.rewardedLoaded) {
      noAdToast();
      return false;
    }
    this.rewardedLoaded = false;
    try {
      const reward: AdMobRewardItem = await AdMob.showRewardVideoAd();
      return !!reward && reward.amount >= 0;
    } catch {
      return false;
    } finally {
      void this.loadRewarded();
    }
  }

  async showInterstitial() {
    await this.ready;
    if (!this.interstitialLoaded) return;
    this.interstitialLoaded = false;
    try {
      await AdMob.showInterstitial();
    } catch {
      /* skipped */
    } finally {
      void this.loadInterstitial();
    }
  }

  /** Settings → Privacy & ads: Google's privacy options form, where required. */
  async privacyOptions() {
    await this.ready;
    try {
      await AdMob.showPrivacyOptionsForm();
    } catch {
      /* not required in this region */
    }
  }
}

/** No ad available right now (offline, no fill): say so instead of silently doing nothing. */
function noAdToast() {
  const t = document.createElement('div');
  t.className = 'hint';
  t.textContent = 'No ad available right now. Try again in a moment.';
  (document.getElementById('hud') ?? document.body).append(t);
  window.setTimeout(() => t.remove(), 2600);
}
