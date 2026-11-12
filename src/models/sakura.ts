import { Builder, base, shade } from './kit';

/**
 * Sakura Spring lineup: stone lantern to Sakura Spire. Dark timber, white
 * paper walls, stone bases and curved, flared roofs in the tier colour, with
 * blossom trees and lanterns. Pagodas and castles take over at the top.
 */
type Build = (H: number, color: string) => ReturnType<Builder['finish']>;

const WOOD = '#4a2c22';
const PAPER = '#fbf4e6';
const STONE = '#b9b3a8';
const PINK = '#ffb7d2';
const GOLD = '#e8c15a';
const VERMILION = '#d8452f';

function garden(b: Builder, y: number, r = 0.4) {
  b.cyl(r, r + 0.02, 0.02, 'matte', '#e9d9c6', { y }, 24);
  return y + 0.02;
}

/** A blossom tree: a crooked trunk and pink canopy puffs. */
function blossom(b: Builder, x: number, z: number, y: number, s = 1) {
  b.cyl(0.016 * s, 0.024 * s, 0.16 * s, 'wood', '#5a3a2a', { x, z, y, rz: 0.15 }, 6);
  b.sphere(0.075 * s, 'matte', PINK, { x: x - 0.02 * s, z, y: y + 0.18 * s }, 10);
  b.sphere(0.06 * s, 'matte', '#ffd1e3', { x: x + 0.05 * s, z: z + 0.02, y: y + 0.15 * s }, 10);
  b.sphere(0.055 * s, 'matte', '#ff9ec4', { x: x + 0.01 * s, z: z - 0.04, y: y + 0.22 * s }, 10);
}

/** A small paper lantern that glows. */
function lantern(b: Builder, x: number, z: number, y: number, s = 1) {
  b.cyl(0.03 * s, 0.03 * s, 0.05 * s, 'glow', '#ffd28a', { x, z, y }, 10);
  b.cyl(0.035 * s, 0.035 * s, 0.01 * s, 'matte', WOOD, { x, z, y: y + 0.05 * s }, 10);
}

/**
 * A flared Japanese roof: a wide thin eave slab, then a hip roof, then a dark
 * ridge. Returns the top height.
 */
function roof(b: Builder, w: number, d: number, y: number, color: string, h = 0.14, at: { x?: number; z?: number } = {}) {
  const x = at.x ?? 0;
  const z = at.z ?? 0;
  b.box(w + 0.14, 0.022, d + 0.14, 'roof', color, { x, z, y });
  b.box(w + 0.16, 0.012, d + 0.16, 'matte', shade(color, 0.65), { x, z, y: y - 0.008 });
  b.pyramid(w + 0.06, h, d + 0.06, 'roof', color, { x, z, y: y + 0.02 });
  b.box(Math.max(0.02, w * 0.4), 0.025, 0.03, 'matte', WOOD, { x, z, y: y + 0.02 + h * 0.85 });
  return y + 0.02 + h;
}

/** Timber-framed paper walls: white panels between dark posts and a mid rail. */
function paperWalls(b: Builder, w: number, h: number, d: number, y: number, at: { x?: number; z?: number } = {}) {
  const x = at.x ?? 0;
  const z = at.z ?? 0;
  b.box(w, h, d, 'plaster', PAPER, { x, z, y });
  const n = Math.max(2, Math.round(w / 0.12));
  for (let i = 0; i <= n; i++) b.box(0.018, h, 0.012, 'wood', WOOD, { x: x - w / 2 + (w * i) / n, z: z + d / 2 + 0.004, y });
  b.box(w, 0.018, 0.012, 'wood', WOOD, { x, z: z + d / 2 + 0.005, y: y + h * 0.55 });
  b.box(w + 0.01, 0.025, d + 0.01, 'wood', WOOD, { x, z, y: y + h - 0.025 });
}

/** 1 Stone Lantern: a toro garden lantern with a cap in the tier colour. */
const stoneLantern: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.cyl(0.16, 0.2, 0.06, 'matte', STONE, { y }, 6);
  b.cyl(0.06, 0.07, 0.12, 'matte', STONE, { y: y + 0.06 }, 8);
  b.box(0.2, 0.1, 0.2, 'glow', '#ffd28a', { y: y + 0.18 });
  b.box(0.22, 0.02, 0.22, 'matte', STONE, { y: y + 0.16 });
  b.pyramid(0.38, 0.12, 0.38, 'roof', color, { y: y + 0.28 });
  b.sphere(0.035, 'matte', shade(color, 0.8), { y: y + 0.41 }, 8);
  return b.finish();
};

/** 2 Tea Stall: a little open stall with a coloured roof, a noren curtain and a lantern. */
const teaStall: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  for (const [x, z] of [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.14], [0.2, 0.14]] as const) b.box(0.03, 0.24, 0.03, 'wood', WOOD, { x, z, y });
  b.box(0.42, 0.1, 0.28, 'wood', '#8a5a3a', { y });
  b.box(0.44, 0.02, 0.3, 'wood', WOOD, { y: y + 0.1 });
  for (let i = 0; i < 3; i++) b.box(0.12, 0.08, 0.008, 'matte', i === 1 ? color : PAPER, { x: -0.13 + i * 0.13, z: 0.155, y: y + 0.15 });
  roof(b, 0.42, 0.28, y + 0.24, color, 0.1);
  lantern(b, 0.24, 0.17, y + 0.12);
  return b.finish();
};

/** 3 Shrine Gate: a torii gate in the tier colour on stone footings, a lantern either side. */
const shrineGate: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  for (const x of [-0.17, 0.17]) {
    b.cyl(0.04, 0.04, 0.03, 'matte', STONE, { x, y }, 10);
    b.cyl(0.028, 0.032, 0.36, 'gloss', color, { x, y: y + 0.03 }, 10);
  }
  b.box(0.42, 0.03, 0.05, 'gloss', color, { y: y + 0.28 });
  b.box(0.56, 0.035, 0.06, 'gloss', color, { y: y + 0.36 });
  b.box(0.6, 0.025, 0.07, 'matte', '#2a1d18', { y: y + 0.395 });
  b.box(0.05, 0.08, 0.02, 'matte', '#2a1d18', { y: y + 0.29, z: 0.03 });
  for (const x of [-0.32, 0.32]) {
    b.cyl(0.02, 0.025, 0.1, 'matte', STONE, { x, z: 0.12, y }, 6);
    lantern(b, x, 0.12, y + 0.1, 0.8);
  }
  return b.finish();
};

/** 4 Garden Teahouse: a small square teahouse with paper walls and a flared roof. */
const teahouse: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.box(0.46, 0.04, 0.4, 'matte', STONE, { y });
  paperWalls(b, 0.38, 0.2, 0.32, y + 0.04);
  roof(b, 0.38, 0.32, y + 0.24, color, 0.14);
  b.box(0.12, 0.14, 0.012, 'glow', '#ffe6b0', { y: y + 0.04, z: 0.168 });
  blossom(b, 0.3, 0.22, y, 0.75);
  return b.finish();
};

/** 5 Paper House: a long low house with sliding paper walls and a veranda. */
const paperHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.box(0.66, 0.05, 0.46, 'wood', '#8a5a3a', { y });
  paperWalls(b, 0.56, 0.22, 0.34, y + 0.05, { z: -0.04 });
  roof(b, 0.56, 0.34, y + 0.27, color, 0.15, { z: -0.04 });
  for (let i = 0; i < 3; i++) b.box(0.1, 0.12, 0.012, 'glow', '#ffe6b0', { x: -0.17 + i * 0.17, z: 0.136, y: y + 0.08 });
  lantern(b, 0.3, 0.2, y + 0.05, 0.8);
  return b.finish();
};

/** 6 Machiya: a two-storey wooden townhouse with lattice front and two roof tiers. */
const machiya: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  paperWalls(b, 0.56, 0.2, 0.4, y);
  for (let i = 0; i < 8; i++) b.box(0.012, 0.14, 0.012, 'wood', WOOD, { x: -0.2 + i * 0.057, z: 0.21, y: y + 0.03 });
  roof(b, 0.56, 0.4, y + 0.2, color, 0.04);
  paperWalls(b, 0.46, 0.16, 0.32, y + 0.26, { z: -0.03 });
  roof(b, 0.46, 0.32, y + 0.42, color, 0.13, { z: -0.03 });
  b.box(0.12, 0.08, 0.008, 'matte', color, { x: -0.16, z: 0.214, y: y + 0.1 });
  return b.finish();
};

/** 7 Ryokan Inn: an L-shaped inn around a little pond, lanterns along the front. */
const ryokan: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  paperWalls(b, 0.66, 0.22, 0.26, y, { z: -0.12 });
  roof(b, 0.66, 0.26, y + 0.22, color, 0.13, { z: -0.12 });
  paperWalls(b, 0.22, 0.2, 0.26, y, { x: -0.22, z: 0.16 });
  roof(b, 0.22, 0.26, y + 0.2, color, 0.11, { x: -0.22, z: 0.16 });
  b.cyl(0.13, 0.13, 0.012, 'gloss', '#7fd0e0', { x: 0.17, z: 0.17, y }, 18);
  for (const x of [-0.05, 0.12, 0.29]) lantern(b, x, 0.02, y + 0.06, 0.7);
  return b.finish();
};

/** 8 Samurai House: a house on a stone platform behind a walled gate. */
const samuraiHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.box(0.7, 0.06, 0.4, 'matte', STONE, { y, z: -0.06 });
  paperWalls(b, 0.6, 0.24, 0.32, y + 0.06, { z: -0.06 });
  roof(b, 0.6, 0.32, y + 0.3, color, 0.18, { z: -0.06 });
  b.box(0.7, 0.1, 0.03, 'plaster', PAPER, { y, z: 0.24 });
  b.box(0.72, 0.03, 0.06, 'roof', color, { y: y + 0.1, z: 0.24 });
  b.box(0.14, 0.13, 0.04, 'wood', WOOD, { y, z: 0.25 });
  b.box(0.2, 0.03, 0.08, 'roof', color, { y: y + 0.13, z: 0.25 });
  return b.finish();
};

/** 9 Temple Hall: a large temple hall on a raised base with a huge sweeping roof and vermilion posts. */
const templeHall: Build = (_H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.box(0.74, 0.07, 0.5, 'matte', STONE, { y });
  b.box(0.2, 0.04, 0.12, 'matte', STONE, { y, z: 0.3 });
  b.box(0.58, 0.24, 0.36, 'plaster', PAPER, { y: y + 0.07 });
  for (const x of [-0.27, -0.09, 0.09, 0.27]) b.cyl(0.02, 0.02, 0.24, 'gloss', VERMILION, { x, z: 0.2, y: y + 0.07 }, 8);
  b.box(0.14, 0.17, 0.012, 'glow', '#ffe6b0', { y: y + 0.07, z: 0.186 });
  const t = roof(b, 0.58, 0.36, y + 0.31, color, 0.12);
  roof(b, 0.3, 0.18, t - 0.02, color, 0.1);
  return b.finish();
};

/** 10 Moon Pavilion: a two-level pavilion over a pond, a round moon window glowing. */
const moonPavilion: Build = (H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.cyl(0.36, 0.36, 0.012, 'gloss', '#7fd0e0', { y }, 22);
  for (const [x, z] of [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.14], [0.2, 0.14]] as const) b.cyl(0.02, 0.02, 0.1, 'gloss', VERMILION, { x, z, y }, 8);
  const h1 = Math.max(0.2, H * 0.3);
  paperWalls(b, 0.46, h1, 0.34, y + 0.1);
  b.cyl(0.08, 0.08, 0.02, 'glow', '#ffe6b0', { y: y + 0.1 + h1 * 0.5, z: 0.172, rx: Math.PI / 2 }, 20);
  b.torus(0.085, 0.012, 'wood', WOOD, { y: y + 0.1 + h1 * 0.5, z: 0.18, rx: Math.PI / 2 });
  const t = roof(b, 0.46, 0.34, y + 0.1 + h1, color, 0.04);
  paperWalls(b, 0.3, 0.14, 0.22, t);
  roof(b, 0.3, 0.22, t + 0.14, color, 0.14);
  b.box(0.2, 0.012, 0.06, 'gloss', VERMILION, { y: y + 0.06, x: 0.28, z: 0.24, ry: 0.4 });
  return b.finish();
};

/** A pagoda: stacked shrinking storeys, each with a flared roof in the tier colour, and a gold finial. */
function pagoda(b: Builder, y: number, color: string, storeys: number, h: number, w0 = 0.46) {
  let ty = y;
  const sh = h / storeys;
  for (let i = 0; i < storeys; i++) {
    const w = w0 - i * (w0 * 0.12);
    paperWalls(b, w, sh * 0.62, w, ty);
    ty = roof(b, w, w, ty + sh * 0.62, color, sh * 0.3) - sh * 0.3 * 0.55;
  }
  b.cyl(0.012, 0.012, 0.22, 'gloss', GOLD, { y: ty + 0.04 }, 6);
  for (let i = 0; i < 4; i++) b.torus(0.03 - i * 0.004, 0.006, 'gloss', GOLD, { y: ty + 0.08 + i * 0.03 });
  return ty;
}

/** 11 Three-Tier Pagoda. */
const pagoda3: Build = (H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.box(0.6, 0.05, 0.6, 'matte', STONE, { y });
  pagoda(b, y + 0.05, color, 3, Math.max(0.7, H - 0.3));
  blossom(b, -0.34, 0.26, y, 0.8);
  return b.finish();
};

/** 12 Five-Tier Pagoda. */
const pagoda5: Build = (H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.box(0.62, 0.06, 0.62, 'matte', STONE, { y });
  pagoda(b, y + 0.06, color, 5, Math.max(1.0, H - 0.35), 0.48);
  return b.finish();
};

/** 13 Castle Keep: a white keep on sloped stone walls, roofs in the tier colour, golden fish on top. */
const castleKeep: Build = (H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  const sh = Math.max(0.25, H * 0.22);
  b.cyl(0.32, 0.44, sh, 'matte', STONE, { y, ry: Math.PI / 4 }, 4);
  let ty = y + sh;
  const levels = 4;
  const lh = Math.max(0.18, (H - sh - 0.3) / levels);
  for (let i = 0; i < levels; i++) {
    const w = 0.44 - i * 0.07;
    b.box(w, lh * 0.7, w * 0.8, 'plaster', PAPER, { y: ty });
    for (const x of [-w * 0.25, w * 0.25]) b.box(0.05, lh * 0.25, 0.012, 'wood', WOOD, { x, z: w * 0.4 + 0.004, y: ty + lh * 0.25 });
    ty = roof(b, w, w * 0.8, ty + lh * 0.7, color, lh * 0.3) - lh * 0.15;
  }
  for (const x of [-0.06, 0.06]) b.box(0.03, 0.06, 0.02, 'gloss', GOLD, { x, y: ty + 0.02, rz: x > 0 ? -0.4 : 0.4 });
  return b.finish();
};

/** 14 Blossom Tower: a slim tower wrapped in blossom terraces, roofs in the tier colour. */
const blossomTower: Build = (H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  const h = Math.max(1.3, H - 0.35);
  const n = 6;
  let ty = y;
  for (let i = 0; i < n; i++) {
    const w = 0.36 - i * 0.025;
    paperWalls(b, w, (h / n) * 0.7, w, ty);
    ty = roof(b, w, w, ty + (h / n) * 0.7, color, 0.03) + (h / n) * 0.3 - 0.05;
    if (i % 2 === 0) blossom(b, (i % 4 === 0 ? 1 : -1) * (w / 2 + 0.06), w / 2, ty - (h / n) * 0.3, 0.6);
  }
  roof(b, 0.2, 0.2, ty, color, 0.2);
  return b.finish();
};

/** 15 Golden Pavilion: a three-storey gold pavilion over a pond, coloured roofs, a phoenix on top. */
const goldenPavilion: Build = (H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  b.cyl(0.42, 0.42, 0.014, 'gloss', '#7fd0e0', { y }, 24);
  const h = Math.max(1.2, H - 0.45);
  let ty = y + 0.014;
  for (let i = 0; i < 3; i++) {
    const w = 0.5 - i * 0.08;
    b.box(w, h * 0.22, w * 0.8, i ? 'gloss' : 'plaster', i ? GOLD : PAPER, { y: ty });
    for (const x of [-w * 0.3, 0, w * 0.3]) b.box(0.06, h * 0.12, 0.012, 'glow', '#ffe6b0', { x, z: w * 0.4 + 0.004, y: ty + h * 0.05 });
    ty = roof(b, w, w * 0.8, ty + h * 0.22, color, 0.05) + 0.02;
  }
  roof(b, 0.26, 0.22, ty - 0.02, color, 0.18);
  b.box(0.06, 0.08, 0.02, 'gloss', GOLD, { y: ty + 0.16, rz: 0.3 });
  return b.finish();
};

/** 16 Shogun Castle: a grand keep with side turrets on a high stone base. */
const shogun: Build = (H, color) => {
  const b = new Builder();
  const y = garden(b, base(b, color));
  const sh = Math.max(0.28, H * 0.2);
  b.cyl(0.36, 0.48, sh, 'matte', STONE, { y, ry: Math.PI / 4 }, 4);
  const top = y + sh;
  for (const x of [-0.24, 0.24]) {
    b.box(0.16, 0.16, 0.16, 'plaster', PAPER, { x, z: 0.12, y: top });
    roof(b, 0.16, 0.16, top + 0.16, color, 0.1, { x, z: 0.12 });
  }
  let ty = top;
  const levels = 5;
  const lh = Math.max(0.17, (H - sh - 0.35) / levels);
  for (let i = 0; i < levels; i++) {
    const w = 0.4 - i * 0.055;
    b.box(w, lh * 0.7, w * 0.8, 'plaster', PAPER, { y: ty, z: -0.05 });
    ty = roof(b, w, w * 0.8, ty + lh * 0.7, color, lh * 0.3, { z: -0.05 }) - lh * 0.15;
  }
  for (const x of [-0.05, 0.05]) b.box(0.03, 0.07, 0.02, 'gloss', GOLD, { x, z: -0.05, y: ty + 0.02, rz: x > 0 ? -0.4 : 0.4 });
  return b.finish();
};

/** 17 Cloud Palace: a floating island with a pagoda and blossom trees, petals drifting from it. */
const cloudPalace: Build = (H, color) => {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.3, 0.34, 0.02, 'glow', '#ffd1e6', { y: y0 }, 24);
  const lift = Math.max(0.35, H * 0.3);
  b.animated(
    (s) => {
      s.cyl(0.43, 0.08, 0.3, 'matte', '#8a7a6a', { y: -0.3 }, 9);
      s.cyl(0.45, 0.43, 0.05, 'matte', '#e9d9c6', { y: 0 }, 22);
      pagoda(s, 0.05, color, 3, 0.6, 0.32);
      blossom(s, -0.3, 0.14, 0.05, 0.9);
      blossom(s, 0.3, 0.1, 0.05, 0.8);
      blossom(s, 0.05, 0.32, 0.05, 0.7);
      for (const [x, z] of [[-0.38, 0.24], [0.36, -0.2], [0.1, 0.4]] as const) s.sphere(0.06, 'matte', '#ffffff', { x, z, y: -0.02, sy: 0.5 }, 10);
    },
    { type: 'bob', amp: 0.035, speed: 1.2 },
    { y: y0 + lift },
  );
  return b.finish();
};

/** 18 Sakura Spire: a towering golden-tipped pagoda spire wreathed in blossom, a beam of light above. */
const sakuraSpire: Build = (H, color) => {
  const b = new Builder();
  const y0 = garden(b, base(b, '#ffd1e6'));
  b.box(0.6, 0.06, 0.6, 'matte', STONE, { y: y0 });
  const h = Math.max(1.9, H - 0.6);
  const top = pagoda(b, y0 + 0.06, color, 7, h, 0.42);
  b.cyl(0.08, 0.04, 8, 'beam', '#ffd1e6', { y: top + 0.3 }, 12, true);
  blossom(b, -0.34, 0.26, y0, 0.9);
  blossom(b, 0.34, 0.26, y0, 0.85);
  return b.finish();
};

export const SAKURA: Build[] = [
  stoneLantern, teaStall, shrineGate, teahouse, paperHouse, machiya, ryokan, samuraiHouse, templeHall,
  moonPavilion, pagoda3, pagoda5, castleKeep, blossomTower, goldenPavilion, shogun, cloudPalace, sakuraSpire,
];
