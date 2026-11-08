import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { Combo, mergeResult, WONDER_BONUS } from '../src/core/scoring';
import { nextSpawn, SPAWN_WEIGHTS } from '../src/core/spawn';
import { MAX_TIER, TIERS } from '../src/core/tiers';

describe('tiers', () => {
  it('has 18 tiers with ids 1..18', () => {
    expect(TIERS).toHaveLength(18);
    TIERS.forEach((t, i) => expect(t.id).toBe(i + 1));
  });
  it('neighbouring tiers never share a colour', () => {
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].color).not.toBe(TIERS[i - 1].color);
  });
  it('mass and footprint never shrink up the ladder', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].mass).toBeGreaterThan(TIERS[i - 1].mass);
      expect(TIERS[i].footprint).toBeGreaterThanOrEqual(TIERS[i - 1].footprint);
    }
  });
});

describe('merge rules', () => {
  it('two of a tier make the next tier, scoring 2^tier x combo', () => {
    expect(mergeResult(1, 1)).toEqual({ newTier: 2, points: 4 });
    expect(mergeResult(5, 3)).toEqual({ newTier: 6, points: 64 * 3 });
  });
  it('two top tiers complete a Wonder', () => {
    expect(mergeResult(MAX_TIER, 1)).toEqual({ newTier: null, points: WONDER_BONUS });
  });
});

describe('combo', () => {
  it('stacks within the window and resets after', () => {
    const c = new Combo();
    expect(c.hit(0)).toBe(1);
    expect(c.hit(1)).toBe(2);
    expect(c.hit(2)).toBe(3);
    expect(c.hit(4)).toBe(1);
  });
});

describe('spawn', () => {
  it('only spawns tiers 1-5 and respects the table cap', () => {
    const rng = new Rng(42);
    let prev: number | null = null;
    for (let i = 0; i < 5000; i++) {
      const t = nextSpawn(rng, prev, 1);
      expect(t).toBeGreaterThanOrEqual(1);
      expect(t).toBeLessThanOrEqual(3); // highest on table 1 -> cap 3
      prev = t;
    }
  });
  it('roughly follows the configured weights', () => {
    const rng = new Rng(7);
    const counts = [0, 0, 0, 0, 0];
    const N = 40000;
    for (let i = 0; i < N; i++) counts[nextSpawn(rng, null, 10) - 1]++;
    const total = SPAWN_WEIGHTS.reduce((a, b) => a + b, 0);
    counts.forEach((c, i) => expect(Math.abs(c / N - SPAWN_WEIGHTS[i] / total)).toBeLessThan(0.02));
  });
  it('is deterministic for a seed', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    const seqA = Array.from({ length: 50 }, () => nextSpawn(a, null, 10));
    const seqB = Array.from({ length: 50 }, () => nextSpawn(b, null, 10));
    expect(seqA).toEqual(seqB);
  });
});
