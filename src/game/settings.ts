import type { AimMode } from '../core/config';
import { store } from './storage';

/** Player settings, persisted on the device. */
export interface Settings {
  sound: boolean;
  aim: AimMode;
  calm: boolean; // less screen shake and no white flashes
  largeText: boolean;
}

const KEY = 'bm.settings';

function load(): Settings {
  const d: Settings = {
    sound: store.str('bm.sound', 'on') !== 'off',
    aim: store.str('bm.mode', 'slide') === 'sling' ? 'sling' : 'slide',
    calm: false,
    largeText: false,
  };
  try {
    return { ...d, ...(JSON.parse(store.str(KEY, '{}')) as Partial<Settings>) };
  } catch {
    return d;
  }
}

const listeners = new Set<(s: Settings) => void>();
export const settings: Settings = load();

export function updateSettings(patch: Partial<Settings>) {
  Object.assign(settings, patch);
  store.set(KEY, JSON.stringify(settings));
  listeners.forEach((l) => l(settings));
}

export function onSettings(l: (s: Settings) => void) {
  listeners.add(l);
  l(settings);
}

/** Saved campaign progress: best stars per level id, and coins. */
export const progress = {
  stars(): Record<string, number> {
    try {
      return JSON.parse(store.str('bm.stars', '{}')) as Record<string, number>;
    } catch {
      return {};
    }
  },
  setStars(id: string, stars: number) {
    const all = progress.stars();
    if ((all[id] ?? 0) >= stars) return;
    all[id] = stars;
    store.set('bm.stars', JSON.stringify(all));
  },
  coins(): number {
    return store.num('bm.coins', 0);
  },
  addCoins(n: number) {
    const c = progress.coins() + n;
    store.set('bm.coins', c);
    return c;
  },
};
