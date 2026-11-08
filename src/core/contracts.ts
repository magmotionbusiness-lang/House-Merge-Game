import { MAX_TIER } from './tiers';
import { Rng } from './rng';

/** A contract ticket pinned on the back wall: "Build 2 Cottages" for a coin reward. */
export interface Contract {
  id: number;
  tier: number;
  count: number;
  done: number;
  reward: number;
}

let nextId = 1;

export function makeContract(tier: number, count: number, reward?: number): Contract {
  return { id: nextId++, tier, count, done: 0, reward: reward ?? contractReward(tier, count) };
}

/** Coins for a contract: grows with tier, so higher builds are worth chasing. */
export function contractReward(tier: number, count: number) {
  return Math.round((20 + tier * tier * 6) * count / 10) * 10;
}

export function isComplete(c: Contract) {
  return c.done >= c.count;
}

/**
 * Records a newly built tier against the open contracts. Returns the
 * contracts that this build completed (each counts toward one contract only).
 */
export function recordBuild(contracts: Contract[], tier: number): Contract[] {
  const open = contracts.find((c) => c.tier === tier && !isComplete(c));
  if (!open) return [];
  open.done++;
  return isComplete(open) ? [open] : [];
}

/**
 * Endless mode: a fresh contract a little above what the player has reached,
 * so it is reachable this session but pulls them upward.
 */
export function endlessContract(rng: Rng, highestReached: number, avoidTiers: number[] = []): Contract {
  const lo = Math.max(3, Math.min(highestReached, MAX_TIER - 1) - 1);
  const hi = Math.min(MAX_TIER, Math.max(lo + 1, highestReached + 2));
  let tier = lo;
  for (let i = 0; i < 8; i++) {
    tier = lo + Math.floor(rng.next() * (hi - lo + 1));
    if (!avoidTiers.includes(tier)) break;
  }
  const count = tier <= highestReached - 1 && rng.next() < 0.5 ? 2 : 1;
  return makeContract(tier, count);
}
