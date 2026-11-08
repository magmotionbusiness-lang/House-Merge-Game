import { MAX_TIER } from './tiers';

/** A campaign level, defined in levels/district-NN.json. */
export interface LevelDef {
  id: string; // e.g. "1-3"
  name: string;
  contracts: { tier: number; count: number; reward?: number }[];
  shots: number | null; // shot limit, or null for unlimited
  start?: [tier: number, x: number, y: number][]; // pre-placed pile
  spawn?: number[]; // spawn weights for tiers 1..n (defaults to the global weights)
  hint?: string; // one-line tip shown at the start
}

export interface District {
  id: number;
  name: string;
  time: 'morning' | 'noon' | 'golden' | 'dusk' | 'night';
  levels: LevelDef[];
}

/** Validates a district file; throws with a clear message so bad configs fail the build tests. */
export function validateDistrict(d: District): District {
  if (!d.levels?.length) throw new Error(`District ${d.id} has no levels`);
  for (const l of d.levels) {
    if (!l.contracts.length) throw new Error(`Level ${l.id} has no contracts`);
    for (const c of l.contracts) {
      if (c.tier < 2 || c.tier > MAX_TIER) throw new Error(`Level ${l.id}: contract tier ${c.tier} out of range`);
      if (c.count < 1) throw new Error(`Level ${l.id}: contract count must be at least 1`);
    }
    if (l.shots !== null && l.shots < 1) throw new Error(`Level ${l.id}: shots must be null or positive`);
    for (const [t, x, y] of l.start ?? []) {
      if (t < 1 || t > MAX_TIER) throw new Error(`Level ${l.id}: start tier ${t} out of range`);
      if (Math.abs(x) > 0.5 || y < 0.5 || y > 1.8) throw new Error(`Level ${l.id}: start piece at (${x}, ${y}) is off the table`);
    }
  }
  return d;
}

/**
 * Stars, as the brief defines them:
 * 1 = contracts done; 2 = done with 30% of shots left; 3 = done with 50% left and a combo of 3+.
 * Unlimited levels give 2 stars for finishing, 3 with a 3+ combo.
 */
export function starsFor(level: LevelDef, shotsUsed: number, bestCombo: number): 1 | 2 | 3 {
  if (level.shots === null) return bestCombo >= 3 ? 3 : 2;
  const left = (level.shots - shotsUsed) / level.shots;
  if (left >= 0.5 && bestCombo >= 3) return 3;
  if (left >= 0.3) return 2;
  return 1;
}

/** Coins paid on completing a level: the contract rewards plus a star bonus. */
export function levelCoins(_level: LevelDef, stars: number, contractCoins: number) {
  return contractCoins + stars * 25;
}
