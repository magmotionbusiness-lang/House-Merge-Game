/** Boosters, bought with coins (rewarded ads come with the monetization phase). */
export type BoosterId = 'wreck' | 'swap' | 'upgrade' | 'crane';

export interface BoosterDef {
  id: BoosterId;
  name: string;
  cost: number;
  prompt: string; // shown while choosing a target
}

// Base prices. Each use in the same round costs 60% more than the last,
// so boosters rescue a tough moment but can't carry a whole run.
export const BOOSTERS: BoosterDef[] = [
  { id: 'wreck', name: 'Wrecking Ball', cost: 700, prompt: 'Tap a building to demolish it' },
  { id: 'swap', name: 'Swap', cost: 250, prompt: '' },
  { id: 'upgrade', name: 'Upgrade Stamp', cost: 1200, prompt: 'Tap a building to upgrade it one tier' },
  { id: 'crane', name: 'Crane Lift', cost: 500, prompt: 'Tap a building to lift it' },
];

export const PRICE_GROWTH = 1.6;

/** Price of a booster after `uses` uses this round. */
export function boosterPrice(id: BoosterId, uses: number) {
  return Math.round((booster(id).cost * Math.pow(PRICE_GROWTH, uses)) / 10) * 10;
}

export const booster = (id: BoosterId) => BOOSTERS.find((b) => b.id === id)!;
