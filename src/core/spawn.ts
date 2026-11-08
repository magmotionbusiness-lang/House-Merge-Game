import { Rng } from './rng';

export const SPAWN_WEIGHTS = [40, 28, 18, 10, 4]; // tiers 1..5
export const REPEAT_BIAS = 0.15; // extra chance to repeat the previous piece
export const STEP_UP_BIAS = 0.08; // extra chance to give previous + 1

/**
 * Picks the next launcher piece.
 * - Only tiers 1-5 spawn.
 * - Never more than 2 tiers above the highest tier on the table.
 * - Soft bias toward repeating the previous piece (or the one above it), as Suika does.
 */
export function nextSpawn(rng: Rng, prev: number | null, highestOnTable: number): number {
  const cap = Math.min(SPAWN_WEIGHTS.length, Math.max(1, highestOnTable) + 2);
  const r = rng.next();
  if (prev !== null) {
    if (r < REPEAT_BIAS && prev <= cap) return prev;
    if (r < REPEAT_BIAS + STEP_UP_BIAS && prev + 1 <= cap) return prev + 1;
  }
  const weights = SPAWN_WEIGHTS.slice(0, cap);
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i + 1;
  }
  return weights.length;
}
