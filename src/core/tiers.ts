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

// Neighbouring tiers never share a dominant hue.
const ROWS: Row[] = [
  ['Brick', 1, 0.08, 0.03, '#d2643c'],
  ['Brick Stack', 1, 0.1, 0.06, '#f2b134'],
  ['Wall', 1, 0.12, 0.08, '#8b8f99'],
  ['Corner Frame', 1, 0.14, 0.1, '#b9773e'],
  ['Foundation Kit', 1, 0.16, 0.1, '#e8d84a'],
  ['Garden Shed', 2, 0.18, 0.14, '#7fae6e'],
  ['Tiny House', 2, 0.2, 0.18, '#c8382f'],
  ['Cozy Cottage', 2, 0.22, 0.2, '#3d78c9'],
  ['Family Home', 2, 0.24, 0.26, '#f5e08f'],
  ['Townhouse Row', 2, 0.26, 0.3, '#e0619a'],
  ['Apartment Block', 3, 0.27, 0.4, '#2fa7a0'],
  ['Office Tower', 3, 0.28, 0.55, '#6fb6ff'],
  ['Art Deco Spire', 3, 0.29, 0.75, '#d9a521'],
  ['Twisted Supertall', 3, 0.3, 0.9, '#c9ced8'],
  ['Desert Needle', 3, 0.3, 1.1, '#e88a4c'],
  ['Hero HQ', 4, 0.31, 1.2, '#6b4fd8'],
  ['Sky Citadel', 4, 0.32, 1.2, '#4fd88b'],
  ['Orbital Elevator', 4, 0.32, 1.4, '#ffffff'],
];

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
