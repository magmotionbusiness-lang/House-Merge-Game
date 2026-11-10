/**
 * When a between-rounds (interstitial) ad may show. Pure rules, unit tested.
 *
 * - Only between rounds, never during play.
 * - Never in a player's first rounds (the brief: "never before level 6").
 * - At least 2 minutes apart.
 * - Never right after the player chose to watch a rewarded ad (or bought something).
 * - Never for players who removed ads.
 */
export const INTERSTITIAL_GAP = 120; // seconds between interstitials
export const AFTER_REWARDED_GAP = 120; // seconds of quiet after a rewarded ad or purchase
export const FIRST_ROUNDS_FREE = 5; // rounds that never see an interstitial

export interface AdClock {
  now: number; // seconds
  lastInterstitial: number; // seconds, or -Infinity
  lastRewarded: number; // seconds, or -Infinity (also set by purchases)
  roundsFinished: number;
  noAds: boolean;
}

export function interstitialAllowed(c: AdClock): boolean {
  if (c.noAds) return false;
  if (c.roundsFinished <= FIRST_ROUNDS_FREE) return false;
  if (c.now - c.lastInterstitial < INTERSTITIAL_GAP) return false;
  if (c.now - c.lastRewarded < AFTER_REWARDED_GAP) return false;
  return true;
}

/** What a rewarded ad was for (analytics later; also limits per round). */
export type RewardPlacement = 'continue' | 'double_coins' | 'booster' | 'daily_refill';
