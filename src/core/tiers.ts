/**
 * The merge ladder. All balancing data for the 18 tiers lives here, so tuning
 * never touches game code.
 *
 * footprint: collider diameter on the table, in table-widths (before FOOTPRINT_SCALE).
 * height:    visual height, in table-widths.
 * mass:      physics mass (arbitrary units). Rises steeply so small pieces can't shove big ones.
 */
export type Era = 1 | 2 | 3 | 4;

export interface Tier {
  id: number;
  name: string;
  era: Era;
  footprint: number;
  height: number;
  color: string;
  mass: number;
  score: number;
  /** Semitone offset for the merge chime (pentatonic ladder). */
  pitch: number;
}

const PENTATONIC = [0, 2, 4, 7, 9];
const pitchFor = (i: number) => 12 * Math.floor(i / 5) + PENTATONIC[i % 5];

type Row = [name: string, era: Era, footprint: number, height: number, color: string];

// The ladder reads as an obvious progression: each tier is a building anyone
// recognises and is bigger and taller than the one before. Neighbouring tiers
// never share a dominant hue; the colour is the roof and base disc.
const ROWS: Row[] = [
  ['Brick', 1, 0.08, 0.035, '#d9542b'],
  ['Doghouse', 1, 0.1, 0.06, '#f4b400'],
  ['Garden Shed', 1, 0.12, 0.085, '#43a047'],
  ['Log Cabin', 1, 0.14, 0.1, '#8d5a33'],
  ['Cottage', 1, 0.16, 0.12, '#1e88e5'],
  ['House', 2, 0.18, 0.16, '#e53935'],
  ['Big House', 2, 0.2, 0.18, '#00897b'],
  ['Mansion', 2, 0.22, 0.21, '#ec5f9a'],
  ['Townhouses', 2, 0.24, 0.26, '#ff8f00'],
  ['Apartments', 2, 0.26, 0.32, '#5c6bc0'],
  ['Apartment Block', 3, 0.27, 0.42, '#26c6da'],
  ['Office Tower', 3, 0.28, 0.56, '#42a5f5'],
  ['Skyscraper', 3, 0.29, 0.74, '#e0a800'],
  ['Twisted Tower', 3, 0.3, 0.9, '#b0bec5'],
  ['Megatower', 3, 0.3, 1.05, '#ff7043'],
  ['Hero HQ', 4, 0.31, 1.15, '#7e57c2'],
  ['Sky Citadel', 4, 0.32, 1.25, '#2ecc71'],
  ['Space Elevator', 4, 0.32, 1.4, '#e0f7fa'],
];

/** Rank ring colour per era: bronze, silver, gold, diamond. */
export const ERA_RING: Record<Era, string> = { 1: '#c27a3a', 2: '#b8c2cc', 3: '#f5c542', 4: '#7ff3ff' };
export const ERA_NAME: Record<Era, string> = { 1: 'Bronze', 2: 'Silver', 3: 'Gold', 4: 'Diamond' };

export const TIERS: Tier[] = ROWS.map(([name, era, footprint, height, color], i) => ({
  id: i + 1,
  name,
  era,
  footprint,
  height,
  color,
  mass: Math.pow(1.55, i),
  score: Math.pow(2, i + 1),
  pitch: pitchFor(i),
}));

export const MAX_TIER = TIERS.length;

export function tier(id: number): Tier {
  const t = TIERS[id - 1];
  if (!t) throw new Error(`Unknown tier ${id}`);
  return t;
}
