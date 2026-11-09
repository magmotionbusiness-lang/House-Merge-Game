/**
 * Heat: the run gets progressively flashier as the score climbs, the way
 * Block Blast escalates its effects over a session. Each level permanently
 * adds a layer of visual and audio intensity for the rest of the run.
 */
export const HEAT_THRESHOLDS = [0, 600, 2500, 8000, 22000, 60000];
export const HEAT_NAMES = ['', 'Warming up!', 'On a roll!', 'On fire!', 'Unstoppable!', 'Legendary!'];
export const HEAT_COLORS = ['#ffffff', '#6fd6ff', '#5cffb0', '#ff9a3d', '#ff5ec4', '#ffd84d'];
export const MAX_HEAT = HEAT_THRESHOLDS.length - 1;

export function heatFor(score: number) {
  let l = 0;
  for (let i = 1; i < HEAT_THRESHOLDS.length; i++) if (score >= HEAT_THRESHOLDS[i]) l = i;
  return l;
}

/** Progress (0-1) from the current heat level toward the next one. */
export function heatProgress(score: number) {
  const l = heatFor(score);
  if (l >= MAX_HEAT) return 1;
  const a = HEAT_THRESHOLDS[l];
  const b = HEAT_THRESHOLDS[l + 1];
  return Math.min(1, (score - a) / (b - a));
}
