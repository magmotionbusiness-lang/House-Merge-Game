import { describe, expect, it } from 'vitest';
import { endlessContract, isComplete, makeContract, recordBuild } from '../src/core/contracts';
import { starsFor, validateDistrict, type District } from '../src/core/levels';
import { Rng } from '../src/core/rng';
import { boosterPrice } from '../src/core/boosters';
import district1 from '../levels/district-01.json';
import district2 from '../levels/district-02.json';
import district3 from '../levels/district-03.json';

describe('contracts', () => {
  it('counts builds of the right tier and completes once', () => {
    const cs = [makeContract(3, 2), makeContract(4, 1)];
    expect(recordBuild(cs, 3)).toEqual([]);
    expect(recordBuild(cs, 2)).toEqual([]);
    const done = recordBuild(cs, 3);
    expect(done).toHaveLength(1);
    expect(isComplete(cs[0])).toBe(true);
    expect(recordBuild(cs, 3)).toEqual([]);
  });
  it('higher tiers pay more', () => {
    expect(makeContract(8, 1).reward).toBeGreaterThan(makeContract(4, 1).reward);
  });
  it('endless contracts stay near the player and in range', () => {
    const rng = new Rng(5);
    for (let h = 1; h <= 18; h++)
      for (let i = 0; i < 50; i++) {
        const c = endlessContract(rng, h);
        expect(c.tier).toBeGreaterThanOrEqual(3);
        expect(c.tier).toBeLessThanOrEqual(18);
        expect(c.tier).toBeLessThanOrEqual(Math.max(5, h + 2));
      }
  });
});

describe('levels', () => {
  it('every district is valid', () => {
    for (const d of [district1, district2, district3]) expect(() => validateDistrict(d as District)).not.toThrow();
  });
  it('each district has 15 levels with a Big Build every 5th', () => {
    for (const d of [district1, district2, district3] as District[]) {
      expect(d.levels).toHaveLength(15);
      d.levels.forEach((l, i) => expect(l.name.startsWith('Big Build')).toBe((i + 1) % 5 === 0));
    }
  });
  it('rejects bad configs', () => {
    const bad = { id: 9, name: 'x', time: 'noon', levels: [{ id: '9-1', name: 'x', shots: 10, contracts: [{ tier: 30, count: 1 }] }] } as District;
    expect(() => validateDistrict(bad)).toThrow();
  });
  it('stars follow the brief', () => {
    const l = { id: 't', name: 't', shots: 20, contracts: [{ tier: 3, count: 1 }] };
    expect(starsFor(l, 19, 1)).toBe(1);
    expect(starsFor(l, 14, 1)).toBe(2);
    expect(starsFor(l, 10, 3)).toBe(3);
    expect(starsFor(l, 10, 2)).toBe(2);
  });
});

describe('boosters', () => {
  it('get more expensive with each use in a round', () => {
    expect(boosterPrice('swap', 0)).toBe(250);
    expect(boosterPrice('swap', 1)).toBe(400);
    expect(boosterPrice('upgrade', 2)).toBeGreaterThan(boosterPrice('upgrade', 1));
  });
});
