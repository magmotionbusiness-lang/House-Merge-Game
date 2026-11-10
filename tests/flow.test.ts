import { describe, expect, it } from 'vitest';
import { endlessContract, isComplete, makeContract, recordBuild } from '../src/core/contracts';
import { starsFor, validateDistrict, type District } from '../src/core/levels';
import { Rng } from '../src/core/rng';
import { boosterPrice } from '../src/core/boosters';
import district1 from '../levels/district-01.json';
import district2 from '../levels/district-02.json';
import district3 from '../levels/district-03.json';
import district4 from '../levels/district-04.json';
import district5 from '../levels/district-05.json';
const ALL = [district1, district2, district3, district4, district5] as District[];

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
    for (const d of ALL) expect(() => validateDistrict(d)).not.toThrow();
  });
  it('five districts of 33 levels with a Big Build every 11th', () => {
    expect(ALL).toHaveLength(5);
    for (const d of ALL) {
      expect(d.levels).toHaveLength(33);
      d.levels.forEach((l, i) => expect(l.name.startsWith('Big Build')).toBe((i + 1) % 11 === 0));
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

describe('music playlist', () => {
  it('shuffles every track exactly once and never repeats at the seam', async () => {
    const { shuffle, GAME_TRACKS } = await import('../src/audio/music');
    for (let i = 0; i < 200; i++) {
      const a = shuffle(GAME_TRACKS);
      expect([...a].sort()).toEqual([...GAME_TRACKS].sort());
      const b = shuffle(GAME_TRACKS, a[a.length - 1]);
      expect(b[0]).not.toBe(a[a.length - 1]);
    }
  });
});

describe('meta: login calendar and daily', async () => {
  const { loginStatus, claimLogin, LOGIN_REWARDS, dailySeed, dailyShareText } = await import('../src/core/meta');
  it('first claim is day 1', () => {
    expect(loginStatus({ lastClaim: null, day: 0 }, '2026-11-08')).toEqual({ day: 1, claimable: true });
  });
  it('claims once per day and advances the streak on consecutive days', () => {
    let s = { lastClaim: null as string | null, day: 0 };
    const days = ['2026-11-08', '2026-11-09', '2026-11-10'];
    days.forEach((d, i) => {
      const c = claimLogin(s, d)!;
      expect(c.reward).toBe(LOGIN_REWARDS[i]);
      s = c.state;
      expect(claimLogin(s, d)).toBeNull();
    });
  });
  it('a missed day restarts the streak, and day 7 wraps to day 1', () => {
    expect(loginStatus({ lastClaim: '2026-11-08', day: 3 }, '2026-11-10').day).toBe(1);
    expect(loginStatus({ lastClaim: '2026-11-08', day: 7 }, '2026-11-09').day).toBe(1);
  });
  it('daily seed is the same for everyone on a day and differs between days', () => {
    expect(dailySeed('2026-11-08')).toBe(dailySeed('2026-11-08'));
    expect(dailySeed('2026-11-08')).not.toBe(dailySeed('2026-11-09'));
  });
  it('share text shows a grid of reached tiers', () => {
    const t = dailyShareText('2026-11-08', 12345, 7, new Set([1, 2, 3, 4, 5, 6, 7]));
    expect(t).toContain('Score 12,345');
    expect(t.split('\n')).toHaveLength(4);
  });
});

describe('heat levels', async () => {
  const { heatFor, heatProgress, MAX_HEAT } = await import('../src/core/heat');
  it('climbs with the score and never goes past the top', () => {
    expect(heatFor(0)).toBe(0);
    expect(heatFor(600)).toBe(1);
    expect(heatFor(10_000_000)).toBe(MAX_HEAT);
    let last = 0;
    for (let s = 0; s < 100000; s += 500) {
      expect(heatFor(s)).toBeGreaterThanOrEqual(last);
      last = heatFor(s);
    }
  });
  it('progress runs 0 to 1 within a level', () => {
    expect(heatProgress(0)).toBe(0);
    expect(heatProgress(300)).toBeCloseTo(0.5);
    expect(heatProgress(10_000_000)).toBe(1);
  });
});
