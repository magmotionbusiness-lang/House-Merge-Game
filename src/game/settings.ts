import type { AimMode } from '../core/config';
import { store } from './storage';

/** Player settings, persisted on the device. */
export interface Settings {
  sfxVolume: number; // 0-1
  gameMusic: number; // 0-1
  homeMusic: number; // 0-1
  aim: AimMode;
  calm: boolean; // less screen shake and no white flashes
  largeText: boolean;
  haptics: boolean; // vibration on merges and big moments
}

const KEY = 'bm.settings';

function load(): Settings {
  const d: Settings = {
    sfxVolume: store.str('bm.sound', 'on') === 'off' ? 0 : 0.8,
    gameMusic: 0.5,
    homeMusic: 0.6,
    aim: store.str('bm.mode', 'slide') === 'sling' ? 'sling' : 'slide',
    calm: false,
    largeText: false,
    haptics: true,
  };
  try {
    const saved = JSON.parse(store.str(KEY, '{}')) as Partial<Settings> & { sound?: boolean };
    // Older saves had a single on/off sound switch.
    if (saved.sound === false && saved.sfxVolume === undefined) saved.sfxVolume = 0;
    delete saved.sound;
    return { ...d, ...saved };
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
  /** How many of each tier the player has ever built (the collection book). */
  builtCounts(): Record<number, number> {
    try {
      return JSON.parse(store.str('bm.built', '{}')) as Record<number, number>;
    } catch {
      return {};
    }
  },
  addBuilt(tier: number) {
    const all = progress.builtCounts();
    all[tier] = (all[tier] ?? 0) + 1;
    store.set('bm.built', JSON.stringify(all));
  },
  /** My Skyline: buildings from completed contracts, in the player's chosen order. */
  skyline(): number[] {
    try {
      return JSON.parse(store.str('bm.skyline', '[]')) as number[];
    } catch {
      return [];
    }
  },
  setSkyline(list: number[]) {
    store.set('bm.skyline', JSON.stringify(list.slice(-80)));
  },
  addToSkyline(tier: number) {
    progress.setSkyline([...progress.skyline(), tier]);
  },
  login(): { lastClaim: string | null; day: number } {
    try {
      return JSON.parse(store.str('bm.login', '{"lastClaim":null,"day":0}'));
    } catch {
      return { lastClaim: null, day: 0 };
    }
  },
  setLogin(s: { lastClaim: string | null; day: number }) {
    store.set('bm.login', JSON.stringify(s));
  },
  /** Daily Blueprint result for a day, if played. */
  daily(day: string): { score: number; highest: number; built: number[] } | null {
    try {
      return JSON.parse(store.str(`bm.daily.${day}`, 'null'));
    } catch {
      return null;
    }
  },
  setDaily(day: string, r: { score: number; highest: number; built: number[] }) {
    store.set(`bm.daily.${day}`, JSON.stringify(r));
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
