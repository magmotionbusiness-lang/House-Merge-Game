import { tier } from './tiers';

/**
 * Map themes. A run moves through them every few minutes so the eye never gets
 * used to the board: the backdrop, the rails and every building change style.
 * Tier identity never changes: the same tier keeps its colour, rank badge and
 * size in every theme, only its look and name differ.
 */
export type ThemeId = 'site' | 'beach' | 'alpine' | 'sweet' | 'neon';

export interface Theme {
  id: ThemeId;
  name: string;
  tagline: string;
  /** Building names per tier (index 0 = tier 1). */
  names: string[];
  /** Painted backdrop in public/bg, once the art exists. Otherwise a backdrop is drawn in code. */
  art: string | null;
  /** Rail steel, rail trim and the back beam's two stripe colours. */
  rail: string;
  frame: string;
  beam: [string, string];
  /** Banner and confetti colours for the arrival celebration. */
  accent: string;
  confetti: string[];
  /**
   * Board-edge glow per Heat level 1-5: three colours each that flow around
   * the stroke. Soft and picked from the scene, so the glow belongs to the map.
   */
  glow: [string, string, string][];
  /** The big celebration shout when a level is cleared (Candy Crush's "Sugar Crush!"). */
  shout: string;
}

const SITE_NAMES = Array.from({ length: 18 }, (_, i) => tier(i + 1).name);

export const THEMES: Record<ThemeId, Theme> = {
  site: {
    id: 'site',
    name: 'Construction Site',
    tagline: 'Where every skyline starts',
    names: SITE_NAMES,
    art: 'bg/site.webp',
    rail: '#8d99a8',
    frame: '#7a5634',
    beam: ['#f5c400', '#1e1e1e'],
    accent: '#ffd84d',
    confetti: ['#ffd84d', '#ff9a3d', '#4fc3f7', '#ffffff'],
    shout: 'Master Builder!',
    glow: [['#ffe08a', '#fff3c4', '#ffd36b'], ['#ffc94d', '#ffe08a', '#ffb347'], ['#ffa94d', '#ffd36b', '#ff8f4d'], ['#ff8a4d', '#ffc94d', '#ff6f5a'], ['#ffd84d', '#ffffff', '#ff9a3d']],
  },
  beach: {
    id: 'beach',
    name: 'Tropical Beach',
    tagline: 'Sun, sand and overwater villas',
    names: [
      'Sandcastle', 'Beach Hut', 'Lifeguard Tower', 'Tiki Hut', 'Surf Shack', 'Beach Cottage',
      'Stilt House', 'Overwater Bungalow', 'Bungalow Pier', 'Pool Villa', 'Seaside Apartments', 'Beach Resort',
      'Palm Hotel', 'Sail Tower', 'Lagoon Resort', 'Coral Palace', 'Island Citadel', 'Paradise Spire',
    ],
    art: 'bg/beach.webp',
    rail: '#e8d2a6',
    frame: '#b98a55',
    beam: ['#38c9e6', '#ffffff'],
    accent: '#38c9e6',
    confetti: ['#38c9e6', '#ffd84d', '#ff8fa3', '#7ee081', '#ffffff'],
    shout: 'Beach Blast!',
    glow: [['#8fe9f2', '#d4fbff', '#7fdcea'], ['#5ce0d0', '#bff7ff', '#8fe9f2'], ['#ffe27a', '#7fe6f0', '#fff3b8'], ['#ff9e7a', '#ffe27a', '#5ce0d0'], ['#5ce0d0', '#ffe27a', '#ff9e7a']],
  },
  alpine: {
    id: 'alpine',
    name: 'Alpine Peaks',
    tagline: 'From log cabins to mountain villas',
    names: [
      'Woodpile', 'Tent', "Hunter's Hut", 'A-Frame Cabin', 'Log Cabin', 'Big Log Cabin',
      'Luxury Log Cabin', 'Chalet', 'Ski Lodge', 'Mountain Villa', 'Grand Chalet', 'Alpine Hotel',
      'Cliff Villa', 'Peak Resort', 'Cable Car Station', 'Mountain Castle', 'Glacier Palace', 'Summit Observatory',
    ],
    art: 'bg/alpine.webp',
    rail: '#6d4c33',
    frame: '#4a3222',
    beam: ['#d6392f', '#ffffff'],
    accent: '#8fd8ff',
    confetti: ['#ffffff', '#8fd8ff', '#d6392f', '#7ee081', '#ffd84d'],
    shout: 'Peak Power!',
    glow: [['#cdeeff', '#ffffff', '#b8e2ff'], ['#9fd8ff', '#ffffff', '#cdeeff'], ['#8fd0ff', '#d9f2ff', '#a8c8ff'], ['#b7a8ff', '#bfe6ff', '#9ff5df'], ['#7fffd4', '#8fd0ff', '#c8a8ff']],
  },
  sweet: {
    id: 'sweet',
    name: 'Sweet Town',
    tagline: 'Candy, cake and gingerbread',
    names: [
      'Sugar Cube', 'Cupcake Hut', 'Candy Kiosk', 'Gingerbread Cabin', 'Cookie Cottage', 'Gingerbread House',
      'Donut House', 'Layer Cake Manor', 'Macaron Row', 'Ice Cream Parlour', 'Chocolate Block', 'Lollipop Tower',
      'Candy Cane Tower', 'Soft-Serve Swirl', 'Wedding Cake Tower', 'Candy Castle', 'Sundae Citadel', 'Rainbow Spire',
    ],
    art: 'bg/sweet.webp',
    rail: '#ffb3cf',
    frame: '#8a4b2a',
    beam: ['#ff5e8a', '#ffffff'],
    accent: '#ff5e8a',
    confetti: ['#ff5e8a', '#ffd84d', '#6fd6ff', '#7ee081', '#b48cff', '#ffffff'],
    shout: 'Sugar Rush!',
    glow: [['#ffc2dc', '#ffe3f0', '#ffb3d1'], ['#ffa3c8', '#b8f0d8', '#ffc2dc'], ['#ff8fbf', '#ffe08a', '#ffb3d1'], ['#ff7fb5', '#c9b3ff', '#9be3c9'], ['#ff8fbf', '#9be3c9', '#ffe08a']],
  },
  neon: {
    id: 'neon',
    name: 'Neon City',
    tagline: 'Glowing homes of the future',
    names: [
      'Power Cube', 'Capsule Hut', 'Neon Garage', 'Cube Home', 'Smart Cottage', 'Neon House', 'Hover House', 'Glass Villa', 'Neon Townhouses', 'Neon Apartments', 'Arcology', 'Neon Tower', 'Holo Skyscraper', 'Helix Tower', 'Mega Spire', 'Cyber HQ', 'Sky Dome', 'Orbital Tower',
    ],
    art: 'bg/neon.webp',
    rail: '#3a4256',
    frame: '#1d2233',
    beam: ['#ff3df2', '#1d2233'],
    accent: '#3df5ff',
    confetti: ['#3df5ff', '#ff3df2', '#b48cff', '#7dff6b', '#ffffff'],
    shout: 'Neon Overdrive!',
    glow: [['#3df5ff', '#9ffbff', '#3dc8ff'], ['#3df5ff', '#b48cff', '#3dc8ff'], ['#ff3df2', '#3df5ff', '#b48cff'], ['#ff3df2', '#b48cff', '#3df5ff'], ['#3df5ff', '#ff3df2', '#7dff6b']],
  },
};

/** The order a run travels through the themes (then it loops). */
export const THEME_ORDER: ThemeId[] = ['site', 'beach', 'alpine', 'sweet', 'neon'];

let current: ThemeId = 'site';
const listeners = new Set<(t: Theme) => void>();

export const currentTheme = () => THEMES[current];

export function setTheme(id: ThemeId) {
  if (id === current) return;
  current = id;
  for (const l of listeners) l(THEMES[id]);
}

export function onTheme(fn: (t: Theme) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function nextTheme(id: ThemeId): ThemeId {
  return THEME_ORDER[(THEME_ORDER.indexOf(id) + 1) % THEME_ORDER.length];
}

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && v in THEMES;
}

/** A tier's building name in a theme (the current one by default). */
export function tierName(tierId: number, theme: ThemeId = current) {
  return THEMES[theme].names[tierId - 1] ?? tier(tierId).name;
}

/** Campaign districts each have a home theme. */
export function themeForDistrict(district: number): ThemeId {
  return THEME_ORDER[(Math.max(1, district) - 1) % THEME_ORDER.length];
}

/** How long a run stays in one theme before the next flashy moment can switch it (seconds of play). */
export const THEME_MIN_TIME = 45;
/** After this long any merge switches the theme. */
export const THEME_MAX_TIME = 150;

/** The glow colour for a Heat level (1-5) in a theme, for trails, sparks and banners. */
export function heatGlow(level: number, theme: ThemeId = current) {
  return THEMES[theme].glow[Math.max(0, Math.min(4, level - 1))][0];
}
