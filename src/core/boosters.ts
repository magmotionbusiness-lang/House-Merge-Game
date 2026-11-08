/** Boosters, bought with coins (rewarded ads come with the monetization phase). */
export type BoosterId = 'wreck' | 'swap' | 'upgrade' | 'crane';

export interface BoosterDef {
  id: BoosterId;
  name: string;
  cost: number;
  prompt: string; // shown while choosing a target
}

export const BOOSTERS: BoosterDef[] = [
  { id: 'wreck', name: 'Wrecking Ball', cost: 100, prompt: 'Tap a building to demolish it' },
  { id: 'swap', name: 'Swap', cost: 40, prompt: '' },
  { id: 'upgrade', name: 'Upgrade Stamp', cost: 150, prompt: 'Tap a building to upgrade it one tier' },
  { id: 'crane', name: 'Crane Lift', cost: 80, prompt: 'Tap a building to lift it' },
];

export const booster = (id: BoosterId) => BOOSTERS.find((b) => b.id === id)!;
