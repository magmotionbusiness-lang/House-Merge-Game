import { store } from '../game/storage';
import { askConsent, consentGiven, type Consent } from './consent';
import { interstitialAllowed, type RewardPlacement } from './policy';

/**
 * Ads sit behind one interface so the game never knows which network runs
 * them. The web build uses a mock (a 3-second test "ad"); the Capacitor build
 * will plug in AdMob behind the same interface.
 */
export interface AdService {
  readonly name: string;
  /** Resolves true when the player earned the reward. */
  showRewarded(placement: RewardPlacement): Promise<boolean>;
  showInterstitial(): Promise<void>;
}

const el = (tag: string, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const REWARD_TEXT: Record<RewardPlacement, string> = {
  continue: 'Second chance unlocked',
  double_coins: 'Coins doubled',
  booster: 'Free booster unlocked',
  daily_refill: 'Extra Daily attempt unlocked',
};

/** Web stand-in: a full-screen test ad that runs for 3 seconds, then can be closed. */
export class MockAdService implements AdService {
  readonly name = 'mock';

  private run(kind: 'rewarded' | 'interstitial', placement?: RewardPlacement): Promise<boolean> {
    return new Promise((resolve) => {
      const layer = el('div', 'ad-layer');
      const card = el('div', 'ad-card');
      const tag = el('div', 'ad-tag', kind === 'rewarded' ? 'Rewarded ad · test' : 'Ad · test');
      const art = el('div', 'ad-art');
      art.append(el('div', 'ad-brand', 'Your ad here'), el('div', 'ad-small', 'Real ads arrive with the app build. This test ad lasts 3 seconds.'));
      const ring = el('div', 'ad-count', '3');
      const close = el('button', 'btn big green ad-close', kind === 'rewarded' ? 'Claim reward' : 'Close') as HTMLButtonElement;
      close.disabled = true;
      card.append(tag, art, ring);
      if (kind === 'rewarded' && placement) card.append(el('div', 'ad-reward', REWARD_TEXT[placement]));
      card.append(close);
      layer.append(card);
      (document.getElementById('app') ?? document.body).append(layer);
      requestAnimationFrame(() => layer.classList.add('in'));
      let left = 3;
      const timer = window.setInterval(() => {
        left--;
        ring.textContent = String(Math.max(0, left));
        if (left <= 0) {
          window.clearInterval(timer);
          ring.classList.add('done');
          ring.textContent = '✓';
          close.disabled = false;
          card.classList.add('ready');
        }
      }, 1000);
      close.onclick = () => {
        layer.classList.remove('in');
        window.setTimeout(() => layer.remove(), 250);
        resolve(true);
      };
    });
  }

  showRewarded(placement: RewardPlacement) {
    return this.run('rewarded', placement);
  }

  async showInterstitial() {
    await this.run('interstitial');
  }
}

export interface AdHooks {
  /** An ad takes over the screen: mute music and pause the game. */
  onStart(): void;
  onEnd(): void;
}

const now = () => performance.now() / 1000;

/**
 * The game's single entry point for ads: consent first, the interstitial
 * rules, and the "Remove Ads" flag (set by the store in the native build, or
 * `?noads` in the URL for testing).
 */
export class Ads {
  private lastInterstitial = -Infinity;
  private lastRewarded = -Infinity;
  private busy = false;

  constructor(
    private service: AdService,
    private hooks: AdHooks,
  ) {}

  get noAds() {
    return store.num('bm.noads', 0) === 1 || new URLSearchParams(location.search).has('noads');
  }

  /** Shows the consent prompt once, before the first ad of any kind. */
  private async ensureConsent(): Promise<Consent> {
    return consentGiven() ?? (await askConsent());
  }

  /** Changes the consent choice (Settings → Privacy & ads). */
  async reviewConsent() {
    await askConsent(true);
  }

  /** A rewarded ad the player chose to watch. Resolves true if the reward was earned. */
  async rewarded(placement: RewardPlacement): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    try {
      await this.ensureConsent();
      this.hooks.onStart();
      const ok = await this.service.showRewarded(placement);
      this.lastRewarded = now();
      return ok;
    } finally {
      this.hooks.onEnd();
      this.busy = false;
    }
  }

  /** Between rounds: maybe shows an interstitial (see policy.ts), then continues. */
  async betweenRounds(roundsFinished: number) {
    if (this.busy) return;
    const ok = interstitialAllowed({ now: now(), lastInterstitial: this.lastInterstitial, lastRewarded: this.lastRewarded, roundsFinished, noAds: this.noAds });
    if (!ok) return;
    this.busy = true;
    try {
      await this.ensureConsent();
      this.hooks.onStart();
      await this.service.showInterstitial();
      this.lastInterstitial = now();
    } finally {
      this.hooks.onEnd();
      this.busy = false;
    }
  }

  /** A purchase counts like a rewarded ad: no interstitial right after it. */
  purchased() {
    this.lastRewarded = now();
  }
}

export function createAds(hooks: AdHooks) {
  return new Ads(new MockAdService(), hooks);
}
