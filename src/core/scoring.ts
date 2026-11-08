import { MAX_TIER, tier } from './tiers';

export const COMBO_WINDOW = 1.2; // seconds between merges to keep a combo alive
export const WONDER_BONUS = 1_000_000;

export interface MergeResult {
  /** Tier produced, or null when two top-tier pieces complete a Wonder. */
  newTier: number | null;
  points: number;
}

/** Score per merge = 2^newTier x combo multiplier. Two top tiers complete a Wonder. */
export function mergeResult(tierId: number, combo: number): MergeResult {
  const mult = Math.max(1, combo);
  if (tierId >= MAX_TIER) return { newTier: null, points: WONDER_BONUS * mult };
  const newTier = tierId + 1;
  return { newTier, points: tier(newTier).score * mult };
}

/** Tracks merge combos: merges within COMBO_WINDOW of each other stack. */
export class Combo {
  count = 0;
  private last = -Infinity;
  hit(now: number): number {
    this.count = now - this.last <= COMBO_WINDOW ? this.count + 1 : 1;
    this.last = now;
    return this.count;
  }
  update(now: number) {
    if (now - this.last > COMBO_WINDOW) this.count = 0;
  }
  reset() {
    this.count = 0;
    this.last = -Infinity;
  }
}
