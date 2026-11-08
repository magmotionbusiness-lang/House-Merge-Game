/**
 * Pure rules for the meta layer: daily seeds, the 7-day login calendar, the
 * Daily Blueprint share text, and the collection's fun facts.
 */
import { MAX_TIER, TIERS } from './tiers';
import { seedFromString } from './rng';

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysBetween(a: string, b: string) {
  const t = (k: string) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
  return Math.round((t(b) - t(a)) / 86400000);
}

/** Everyone gets the same piece sequence on the same day. */
export function dailySeed(day: string) {
  return seedFromString(`blueprint-daily-${day}`);
}

/** Daily Blueprint number, counted from launch day. */
export function dailyNumber(day: string) {
  return daysBetween('2026-11-01', day) + 1;
}

// ------------------------------------------------------------- login calendar

/** Coins for each day of the 7-day streak; day 7 is the big one. */
export const LOGIN_REWARDS = [100, 150, 200, 300, 400, 500, 1200];

export interface LoginState {
  lastClaim: string | null; // day key of the last claim
  day: number; // streak day claimed last (1-7)
}

/**
 * What today's calendar offers: which day of the streak it is and whether it
 * can be claimed. Missing a day restarts the streak at day 1; after day 7 it
 * starts again at day 1.
 */
export function loginStatus(s: LoginState, today: string): { day: number; claimable: boolean } {
  if (!s.lastClaim) return { day: 1, claimable: true };
  const gap = daysBetween(s.lastClaim, today);
  if (gap <= 0) return { day: s.day, claimable: false };
  if (gap === 1) return { day: s.day >= 7 ? 1 : s.day + 1, claimable: true };
  return { day: 1, claimable: true };
}

export function claimLogin(s: LoginState, today: string): { state: LoginState; reward: number } | null {
  const st = loginStatus(s, today);
  if (!st.claimable) return null;
  return { state: { lastClaim: today, day: st.day }, reward: LOGIN_REWARDS[st.day - 1] };
}

// ------------------------------------------------------------- sharing

export const TIER_EMOJI = ['🧱', '🐶', '🛖', '🪵', '🏠', '🏡', '🏘️', '🏰', '🏬', '🏢', '🏨', '🏦', '🌆', '🌀', '🗼', '🦸', '🏝️', '🚀'];

/** Spoiler-free result: the tiers reached this run as a grid (⬜ = not reached). */
export function dailyShareText(day: string, score: number, highest: number, built: Set<number>) {
  const rows: string[] = [];
  const upTo = Math.max(12, Math.min(MAX_TIER, Math.ceil(highest / 6) * 6));
  for (let r = 0; r < upTo; r += 6) {
    let row = '';
    for (let t = r + 1; t <= r + 6; t++) row += built.has(t) ? TIER_EMOJI[t - 1] : '⬜';
    rows.push(row);
  }
  const top = highest ? `${TIER_EMOJI[highest - 1]} ${TIERS[highest - 1].name}` : 'none';
  return `Blueprint Merge · Daily #${dailyNumber(day)}\nScore ${score.toLocaleString('en-US')} · Top build ${top}\n${rows.join('\n')}`;
}

// ------------------------------------------------------------- collection

export const FUN_FACTS = [
  'The oldest fired bricks are more than 5,000 years old.',
  'A good doghouse sits off the ground so it stays dry and warm.',
  'Sheds are the most popular backyard building in the world.',
  'Thick log walls keep cabins cool in summer and warm in winter.',
  '"Cottage" once meant a small home for farm workers.',
  'Two floors fit a family on half the land of a bungalow.',
  'Big windows facing the sun can warm a home for free.',
  'Grand houses were built around a central hall for parties.',
  'Terraced houses share their walls, saving land and heat.',
  'Before lifts, the top-floor flats were the cheapest.',
  'Balconies give city dwellers a slice of the outdoors.',
  'Glass "curtain walls" hang off the frame like a curtain.',
  'Art Deco towers step back so sunlight reaches the street.',
  'A twist helps a tall tower shrug off strong winds.',
  'A Y-shaped plan keeps a very tall tower steady and full of views.',
  'Every hero needs a landing pad on the roof.',
  'Planning permission for a floating island is tricky.',
  'Engineers dream of a cable to orbit, and you just built one.',
];
