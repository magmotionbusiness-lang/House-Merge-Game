import { Builder, base, shade } from './kit';
import { house } from './parts';
import { neonBox, neonRings, panes } from './themekit';

/**
 * Neon City lineup: power cube to orbital tower. Futuristic homes that still
 * read instantly as houses: white and light-glass walls, the tier colour on
 * every roof and main surface (so tiers read by colour like everywhere else),
 * and glowing neon trim in a lighter tint of that colour.
 */
type Build = (H: number, color: string) => ReturnType<Builder['finish']>;

const WHITE = '#eef3fa';
const PALE = '#dfe8f5';
const GLASS = '#a9d8ff';
const DECK = '#2a3150';

/** A glow strip in a lighter version of the tier colour, so dark tier colours still glow. */
const lit = (c: string) => shade(c, 1.4);

function deck(b: Builder, y: number, color: string, r = 0.4) {
  b.cyl(r, r + 0.02, 0.02, 'gloss', DECK, { y }, 24);
  b.torus(r - 0.03, 0.007, 'glow', lit(color), { y: y + 0.02 });
  return y + 0.02;
}

/** A glowing door with a lit frame. */
function door(b: Builder, x: number, z: number, y: number, color: string, w = 0.11, h = 0.18) {
  b.box(w, h, 0.016, 'glow', '#ffffff', { x, z, y });
  b.box(w + 0.03, 0.014, 0.02, 'glow', lit(color), { x, z: z + 0.004, y: y + h });
}

/** 1 Power Cube: a solid block in the tier colour with a glowing band (the neon "brick"). */
const powerCube: Build = (_H, color) => {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.5, 0.3, 0.42, 'gloss', color, { y }, 0.05);
  b.box(0.52, 0.035, 0.44, 'glow', lit(color), { y: y + 0.13 });
  for (const x of [-0.13, 0.13]) b.box(0.12, 0.014, 0.12, 'glow', '#ffffff', { x, y: y + 0.3 });
  return b.finish();
};

/** 2 Capsule Hut: a tiny white hut with a rounded roof in the tier colour and a round window. */
const capsuleHut: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.5, 0.2, 0.38, 'plaster', WHITE, { y });
  // Barrel roof: a cylinder lying along x, half sunk into the walls.
  b.cyl(0.2, 0.2, 0.56, 'gloss', color, { y: y + 0.2, x: -0.28, rz: -Math.PI / 2 }, 18);
  b.cyl(0.205, 0.205, 0.02, 'glow', lit(color), { y: y + 0.2, x: -0.29, rz: -Math.PI / 2 }, 18);
  b.cyl(0.205, 0.205, 0.02, 'glow', lit(color), { y: y + 0.2, x: 0.27, rz: -Math.PI / 2 }, 18);
  door(b, -0.1, 0.19, y, color, 0.1, 0.16);
  b.cyl(0.05, 0.05, 0.016, 'pane', '#ffffff', { x: 0.12, z: 0.19, y: y + 0.1, rx: Math.PI / 2 }, 16);
  return b.finish();
};

/** 3 Neon Garage: a small garage with a sloped roof and a glowing striped door. */
const garage: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.56, 0.26, 0.44, 'plaster', WHITE, { y });
  b.box(0.62, 0.04, 0.52, 'gloss', color, { y: y + 0.27, rx: 0.16 });
  for (let i = 0; i < 4; i++) b.box(0.3, 0.025, 0.016, 'glow', i % 2 ? '#ffffff' : lit(color), { x: -0.08, z: 0.225, y: y + 0.03 + i * 0.045 });
  b.box(0.1, 0.1, 0.016, 'pane', GLASS, { x: 0.18, z: 0.225, y: y + 0.1 });
  b.box(0.58, 0.012, 0.012, 'glow', lit(color), { y: y + 0.26, z: 0.23 });
  return b.finish();
};

/** 4 Cube Home: two stacked offset white cubes with roof slabs in the tier colour and big windows. */
const cubeHome: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.56, 0.2, 0.42, 'plaster', WHITE, { y, z: 0.02 });
  b.box(0.6, 0.035, 0.46, 'gloss', color, { y: y + 0.2, z: 0.02 });
  b.box(0.36, 0.17, 0.3, 'plaster', WHITE, { y: y + 0.235, x: 0.08, z: -0.04 });
  b.box(0.4, 0.035, 0.34, 'gloss', color, { y: y + 0.405, x: 0.08, z: -0.04 });
  b.box(0.26, 0.11, 0.016, 'pane', GLASS, { x: 0.1, z: 0.235, y: y + 0.05 });
  b.box(0.24, 0.1, 0.016, 'pane', GLASS, { x: 0.08, z: 0.112, y: y + 0.27 });
  door(b, -0.17, 0.235, y, color, 0.1, 0.16);
  neonBox(b, 0.56, 0.2, 0.42, y, lit(color), { z: 0.02 });
  return b.finish();
};

/** 5 Smart Cottage: a classic gable cottage with a coloured solar roof and neon eaves. */
const smartCottage: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const top = house(b, { y, w: 0.6, d: 0.44, floors: 1, fh: 0.24, wall: WHITE, roof: color, roofH: 0.22, windows: 3, wallMat: 'plaster', trim: lit(color) });
  for (const z of [0.25, -0.25]) b.box(0.68, 0.012, 0.012, 'glow', lit(color), { y: top, z });
  b.box(0.012, 0.012, 0.5, 'glow', lit(color), { y: top + 0.22, x: 0 });
  b.box(0.06, 0.18, 0.06, 'gloss', PALE, { y: top + 0.04, x: 0.18, z: -0.08 });
  b.sphere(0.025, 'glow', lit(color), { y: top + 0.24, x: 0.18, z: -0.08 }, 8);
  return b.finish();
};

/** 6 Neon House: a two-storey gable house with lit windows and a neon outline. */
const neonHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = 0.4;
  const top = house(b, { y, w: 0.64, d: 0.48, floors: 2, fh: 0.2, wall: WHITE, roof: color, roofH: 0.24, windows: 3, wallMat: 'plaster', trim: lit(color) });
  neonBox(b, 0.64, h, 0.48, y, lit(color));
  for (const z of [0.27, -0.27]) b.box(0.72, 0.012, 0.012, 'glow', lit(color), { y: top, z });
  return b.finish();
};

/** 7 Hover House: a modern two-storey house floating over a glowing pad. */
const hoverHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.cyl(0.3, 0.32, 0.02, 'glow', lit(color), { y }, 22);
  b.animated(
    (s) => {
      s.box(0.64, 0.2, 0.44, 'plaster', WHITE, {}, 0.03);
      s.box(0.54, 0.1, 0.016, 'pane', GLASS, { y: 0.05, z: 0.222 });
      s.box(0.68, 0.035, 0.48, 'gloss', color, { y: 0.2 });
      s.box(0.42, 0.16, 0.34, 'plaster', WHITE, { y: 0.235, x: 0.08 });
      s.box(0.32, 0.09, 0.016, 'pane', GLASS, { y: 0.27, x: 0.08, z: 0.172 });
      s.box(0.46, 0.035, 0.38, 'gloss', color, { y: 0.395, x: 0.08 });
      s.box(0.66, 0.012, 0.46, 'glow', lit(color), { y: -0.012 });
    },
    { type: 'bob', amp: 0.02, speed: 1.8 },
    { y: y + 0.09 },
  );
  return b.finish();
};

/** 8 Glass Villa: a wide modern villa with a glass ground floor, coloured roofs and a glowing pool. */
const glassVilla: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.72, 0.2, 0.36, 'window', GLASS, { y, z: -0.06 });
  b.box(0.76, 0.035, 0.4, 'gloss', color, { y: y + 0.2, z: -0.06 });
  b.box(0.44, 0.18, 0.32, 'plaster', WHITE, { y: y + 0.235, x: -0.12, z: -0.08 });
  b.box(0.3, 0.1, 0.016, 'pane', GLASS, { y: y + 0.27, x: -0.12, z: 0.082 });
  b.box(0.48, 0.035, 0.36, 'gloss', color, { y: y + 0.415, x: -0.12, z: -0.08 });
  b.box(0.5, 0.014, 0.14, 'glow', '#7ff3ff', { y, x: 0.08, z: 0.25 });
  b.box(0.54, 0.02, 0.18, 'gloss', PALE, { y: y - 0.004, x: 0.08, z: 0.25 });
  neonBox(b, 0.72, 0.2, 0.36, y, lit(color), { z: -0.06 });
  return b.finish();
};

/** 9 Neon Townhouses: three narrow gabled townhouses, each outlined in neon. */
const townhouses: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const walls = [WHITE, PALE, WHITE];
  [-0.26, 0, 0.26].forEach((x, i) => {
    const floors = i === 1 ? 3 : 2;
    const top = house(b, { y, x, w: 0.24, d: 0.42, floors, fh: 0.17, wall: walls[i], roof: i === 1 ? color : shade(color, 0.85), roofH: 0.16, windows: 1, door: i !== 1, wallMat: 'plaster', trim: lit(color) });
    b.box(0.012, top - y, 0.012, 'glow', lit(color), { y, x: x - 0.12, z: 0.22 });
    b.box(0.26, 0.012, 0.012, 'glow', lit(color), { y: top, x, z: 0.22 });
  });
  return b.finish();
};

/** 10 Neon Apartments: a five-storey white block with coloured balconies and lit windows. */
const apartments: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const floors = 5;
  const fh = Math.max(0.12, (H - 0.2) / floors);
  b.box(0.66, fh * floors, 0.44, 'plaster', WHITE, { y, z: -0.03 });
  for (let f = 0; f < floors; f++) {
    const fy = y + f * fh;
    panes(b, -0.28, 0.28, fy + fh * 0.25, 0.195, 4, fh * 0.5, GLASS);
    if (f > 0) {
      b.box(0.7, 0.02, 0.08, 'gloss', color, { y: fy, z: 0.22 });
      b.box(0.7, 0.012, 0.012, 'glow', lit(color), { y: fy + fh * 0.32, z: 0.26 });
    }
  }
  b.box(0.7, 0.04, 0.48, 'gloss', color, { y: y + floors * fh, z: -0.03 });
  door(b, 0, 0.195, y, color, 0.12, fh * 0.8);
  return b.finish();
};

/** 11 Arcology: a stepped megablock of light glass with coloured terraces. */
const arcology: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const levels = 5;
  const lh = Math.max(0.18, (H - 0.2) / levels);
  for (let i = 0; i < levels; i++) {
    const w = 0.76 - i * 0.1;
    const ly = y + i * lh;
    b.box(w, lh, w * 0.66, 'window', GLASS, { y: ly });
    b.box(w + 0.03, 0.03, w * 0.66 + 0.03, 'gloss', color, { y: ly + lh - 0.03 });
    b.box(w + 0.035, 0.01, w * 0.66 + 0.035, 'glow', lit(color), { y: ly + lh });
  }
  b.cone(0.05, 0.25, 'gloss', color, { y: y + levels * lh }, 8);
  return b.finish();
};

/** 12 Neon Tower: a glass office tower with coloured fins, a crown and a glowing helipad. */
const neonTower: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.0, H - 0.3);
  b.box(0.52, h, 0.52, 'window', GLASS, { y });
  for (const [x, z] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]] as const) b.box(0.05, h, 0.05, 'gloss', color, { y, x, z });
  for (let i = 1; i < 6; i++) b.box(0.54, 0.012, 0.54, 'glow', lit(color), { y: y + (h * i) / 6 });
  b.box(0.56, 0.08, 0.56, 'gloss', color, { y: y + h });
  b.cyl(0.2, 0.2, 0.02, 'gloss', DECK, { y: y + h + 0.08 }, 20);
  b.torus(0.17, 0.012, 'glow', lit(color), { y: y + h + 0.1 });
  return b.finish();
};

/** 13 Holo Skyscraper: a setback glass skyscraper with coloured bands and a floating holo ring. */
const holoSky: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.3, H - 0.35);
  const n = 4;
  let sy = y;
  for (let i = 0; i < n; i++) {
    const w = 0.58 - i * 0.1;
    const sh = (h / n) * (1 - i * 0.05);
    b.box(w, sh, w, 'window', GLASS, { y: sy });
    b.box(w + 0.03, 0.035, w + 0.03, 'gloss', color, { y: sy + sh - 0.035 });
    neonBox(b, w, sh, w, sy, lit(color));
    sy += sh;
  }
  b.animated((s) => s.torus(0.36, 0.012, 'glow', lit(color)), { type: 'spin', speed: 0.8 }, { y: y + h * 0.55 });
  b.cone(0.04, 0.32, 'gloss', color, { y: sy }, 8);
  return b.finish();
};

/** 14 Helix Tower: glass floor plates twisting up, every few floors a coloured band. */
const helix: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.4, H - 0.3);
  const n = 22;
  const ph = h / n;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = 0.5 - t * 0.1;
    b.box(w, ph * 0.8, w, 'window', GLASS, { y: y + i * ph, ry: t * Math.PI * 0.8 });
    b.box(w + 0.03, ph * 0.2, w + 0.03, i % 3 === 0 ? 'glow' : 'gloss', i % 3 === 0 ? lit(color) : color, { y: y + i * ph + ph * 0.8, ry: t * Math.PI * 0.8 });
  }
  b.cone(0.05, 0.3, 'gloss', color, { y: y + h }, 8);
  return b.finish();
};

/** 15 Mega Spire: a triangular glass megatower with coloured fins and a glowing tip. */
const megaSpire: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.8, H - 0.4);
  b.cyl(0.12, 0.32, h, 'window', GLASS, { y }, 3);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    b.box(0.04, h * 0.85, 0.16, 'gloss', color, { y, x: Math.sin(a) * 0.22, z: Math.cos(a) * 0.22, ry: a });
    b.box(0.012, h * 0.85, 0.012, 'glow', lit(color), { y, x: Math.sin(a) * 0.3, z: Math.cos(a) * 0.3, ry: a });
  }
  neonRings(b, 0.24, y, h * 0.6, 4, lit(color));
  b.cone(0.1, 0.5, 'gloss', color, { y: y + h }, 3);
  b.sphere(0.045, 'pulse', lit(color), { y: y + h + 0.5 }, 8);
  return b.finish();
};

/** 16 Cyber HQ: twin glass towers joined by coloured skybridges, a logo ring spinning between them. */
const cyberHQ: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.8, H - 0.5);
  for (const [x, k] of [[-0.2, 1], [0.2, 0.86]] as const) {
    b.box(0.26, h * k, 0.36, 'window', GLASS, { y, x });
    neonBox(b, 0.26, h * k, 0.36, y, lit(color), { x });
    b.box(0.3, 0.08, 0.4, 'gloss', color, { y: y + h * k, x });
  }
  for (const k of [0.4, 0.65]) {
    b.box(0.18, 0.09, 0.22, 'gloss', color, { y: y + h * k });
    b.box(0.18, 0.012, 0.23, 'glow', lit(color), { y: y + h * k + 0.09 });
  }
  b.animated((s) => s.torus(0.12, 0.018, 'glow', lit(color), { rx: Math.PI / 2 }), { type: 'spin', speed: 1 }, { y: y + h * 0.88 });
  return b.finish();
};

/** 17 Sky Dome: a floating disc city under a glowing force-field dome. */
const skyDome: Build = (H, color) => {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.3, 0.34, 0.02, 'glow', lit(color), { y: y0 }, 24);
  const lift = Math.max(0.35, H * 0.3);
  b.animated(
    (s) => {
      s.cyl(0.45, 0.2, 0.14, 'gloss', color, { y: -0.14 }, 20);
      s.torus(0.44, 0.012, 'glow', lit(color), { y: -0.02 });
      s.cyl(0.45, 0.45, 0.03, 'gloss', PALE, { y: 0 }, 22);
      const towers: [number, number, number][] = [[0, 0, 0.42], [-0.18, 0.1, 0.26], [0.17, 0.12, 0.3], [0.1, -0.18, 0.22], [-0.14, -0.15, 0.18]];
      for (const [x, z, th] of towers) {
        s.box(0.1, th, 0.1, 'window', GLASS, { x, z, y: 0.03 });
        s.box(0.11, 0.025, 0.11, 'gloss', color, { x, z, y: 0.03 + th });
      }
      s.sphere(0.43, 'beam', '#9ff3ff', { y: 0.03, sy: 1.1 }, 20);
      for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) s.torus(0.43, 0.006, 'glow', lit(color), { y: 0.03, rx: Math.PI / 2, ry: a });
    },
    { type: 'bob', amp: 0.035, speed: 1.4 },
    { y: y0 + lift },
  );
  return b.finish();
};

/** 18 Orbital Tower: a white launch tower with coloured rings whose beam climbs to orbit. */
const orbital: Build = (H, color) => {
  const b = new Builder();
  const y0 = deck(b, base(b, '#a9c4ff'), '#7ff3ff');
  const h = Math.max(1.9, H - 0.6);
  b.cyl(0.38, 0.42, 0.08, 'gloss', color, { y: y0 }, 6);
  b.torus(0.36, 0.014, 'glow', '#7ff3ff', { y: y0 + 0.085 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.box(0.05, h * 0.5, 0.05, 'gloss', WHITE, { y: y0 + 0.08, x: Math.sin(a) * 0.2, z: Math.cos(a) * 0.2, rx: Math.cos(a) * -0.12, rz: Math.sin(a) * 0.12 });
  }
  b.cyl(0.07, 0.12, h, 'gloss', WHITE, { y: y0 + 0.08 }, 12);
  for (let i = 1; i <= 6; i++) b.cyl(0.13 - i * 0.008, 0.13 - i * 0.008, 0.04, 'gloss', color, { y: y0 + 0.08 + (h * i) / 7 }, 12);
  neonRings(b, 0.1, y0 + 0.08, h, 6, '#7ff3ff');
  b.cyl(0.08, 0.04, 8, 'beam', '#9ff3ff', { y: y0 + 0.1 + h }, 12, true);
  b.animated(
    (s) => {
      s.cyl(0.06, 0.06, 0.08, 'gloss', '#ffffff', {}, 8);
      s.torus(0.07, 0.01, 'glow', lit(color), { y: 0.04 });
    },
    { type: 'bob', amp: 0.35, speed: 0.6 },
    { y: y0 + h + 0.5 },
  );
  return b.finish();
};

export const NEON: Build[] = [
  powerCube, capsuleHut, garage, cubeHome, smartCottage, neonHouse, hoverHouse, glassVilla, townhouses,
  apartments, arcology, neonTower, holoSky, helix, megaSpire, cyberHQ, skyDome, orbital,
];
