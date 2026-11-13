import * as THREE from 'three';
import { Builder, base, shade } from './kit';
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

/** Thick neon strip (reads at small sizes). */
function strip(b: Builder, w: number, h: number, d: number, color: string, at: { x?: number; y: number; z?: number; rx?: number; ry?: number; rz?: number }) {
  b.box(w, h, d, 'glow', color, at);
}

/** 1 Neon Cube: a block in the tier colour, outlined in neon, with a glowing visor slit. */
const neonCube: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.42, 0.32, 0.42, 'gloss', color, { y }, 0.02);
  neonBox(b, 0.42, 0.32, 0.42, y, lit(color));
  strip(b, 0.3, 0.05, 0.02, '#ffffff', { y: y + 0.19, z: 0.21 });
  b.cyl(0.008, 0.008, 0.1, 'gloss', WHITE, { y: y + 0.32, x: 0.12 }, 5);
  b.sphere(0.022, 'glow', lit(color), { y: y + 0.43, x: 0.12 }, 8);
  return b.finish();
};

/** 2 Pod Home: a tiny white pod with a tilted roof in the tier colour, a porthole and a glowing door. */
const podHome: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.48, 0.24, 0.4, 'plaster', WHITE, { y }, 0.03);
  b.box(0.56, 0.05, 0.48, 'gloss', color, { y: y + 0.22, rz: 0.18 });
  strip(b, 0.5, 0.022, 0.022, lit(color), { y: y + 0.2, z: 0.21 });
  door(b, -0.12, 0.2, y, color, 0.1, 0.16);
  b.cyl(0.055, 0.055, 0.02, 'pane', GLASS, { x: 0.1, z: 0.2, y: y + 0.11, rx: Math.PI / 2 }, 16);
  b.torus(0.06, 0.01, 'glow', lit(color), { x: 0.1, z: 0.212, y: y + 0.11, rx: Math.PI / 2 });
  return b.finish();
};

/** 3 A-Frame Pod: a steep triangle house in the tier colour with a glowing glass front. */
const aFramePod: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.gable(0.48, 0.44, 0.5, 'gloss', color, { y, ry: Math.PI / 2 }, 0.03);
  b.extrude([[-0.19, 0], [0.19, 0], [0, -0.36]], 0.016, 'pane', GLASS, { y: y + 0.015, z: 0.262, rx: Math.PI / 2 });
  // Neon along both front roof edges.
  for (const s of [-1, 1]) strip(b, 0.024, 0.52, 0.024, lit(color), { x: s * 0.27, y: y + 0.005, z: 0.275, rz: s * Math.atan2(0.27, 0.44) });
  door(b, 0, 0.275, y, color, 0.09, 0.15);
  return b.finish();
};

/** 4 Hexa Home: a six-sided white home with a hex roof in the tier colour and a glass top room. */
const hexaHome: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const r = Math.PI / 6;
  b.cyl(0.29, 0.29, 0.24, 'plaster', WHITE, { y, ry: r }, 6);
  b.cyl(0.35, 0.32, 0.05, 'gloss', color, { y: y + 0.24, ry: r }, 6);
  b.torus(0.33, 0.012, 'glow', lit(color), { y: y + 0.245 });
  b.cyl(0.17, 0.17, 0.12, 'window', GLASS, { y: y + 0.29, ry: r }, 6);
  b.cyl(0.2, 0.17, 0.04, 'gloss', color, { y: y + 0.41, ry: r }, 6);
  door(b, 0, 0.255, y, color, 0.1, 0.17);
  for (const a of [-1, 1]) b.box(0.08, 0.08, 0.016, 'pane', GLASS, { x: Math.sin(a * 1.05) * 0.255, z: Math.cos(a * 1.05) * 0.255, y: y + 0.09, ry: a * 1.05 });
  return b.finish();
};

/** 5 Wedge House: a modern house whose roof in the tier colour sweeps up into a glass wall. */
const wedgeHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const prof = new THREE.Shape([new THREE.Vector2(-0.3, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0.3, 0.42), new THREE.Vector2(-0.3, 0.2)]);
  const g = new THREE.ExtrudeGeometry(prof, { depth: 0.44, bevelEnabled: false });
  g.translate(0, 0, -0.22);
  b.add(g, 'plaster', WHITE, { y });
  const slope = Math.atan2(0.22, 0.6);
  b.box(0.68, 0.04, 0.52, 'gloss', color, { y: y + 0.3, rz: slope });
  strip(b, 0.68, 0.022, 0.022, lit(color), { y: y + 0.34, z: 0.26, rz: slope });
  b.box(0.22, 0.26, 0.016, 'pane', GLASS, { x: 0.15, y: y + 0.04, z: 0.222 });
  door(b, -0.13, 0.222, y, color, 0.1, 0.16);
  return b.finish();
};

/** 6 Stack House: a glass ground floor with a long box in the tier colour cantilevered across it. */
const stackHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.56, 0.18, 0.34, 'window', GLASS, { y, z: -0.04 });
  b.box(0.6, 0.03, 0.38, 'gloss', WHITE, { y: y + 0.18, z: -0.04 });
  b.box(0.3, 0.2, 0.64, 'gloss', color, { y: y + 0.21, x: 0.1 });
  b.box(0.22, 0.08, 0.016, 'pane', GLASS, { y: y + 0.27, x: 0.1, z: 0.322 });
  neonBox(b, 0.3, 0.2, 0.64, y + 0.21, lit(color), { x: 0.1 });
  neonBox(b, 0.56, 0.18, 0.34, y, lit(color), { z: -0.04 });
  return b.finish();
};

/** 7 Hover House: a house in the tier colour floating on four glowing thrusters. */
const hoverHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.cyl(0.3, 0.32, 0.02, 'glow', lit(color), { y }, 22);
  b.animated(
    (s) => {
      for (const [x, z] of [[-0.22, -0.14], [0.22, -0.14], [-0.22, 0.14], [0.22, 0.14]] as const) {
        s.cyl(0.05, 0.035, 0.05, 'gloss', WHITE, { x, z, y: -0.05 }, 10);
        s.cone(0.035, 0.08, 'glow', lit(color), { x, z, y: -0.05, rx: Math.PI }, 8);
      }
      s.box(0.62, 0.22, 0.42, 'gloss', color, {}, 0.05);
      s.box(0.5, 0.08, 0.016, 'pane', GLASS, { y: 0.1, z: 0.212 });
      s.box(0.46, 0.12, 0.32, 'plaster', WHITE, { y: 0.22, x: -0.04 }, 0.03);
      s.box(0.3, 0.06, 0.016, 'pane', GLASS, { y: 0.25, x: -0.04, z: 0.162 });
      s.box(0.64, 0.022, 0.022, 'glow', lit(color), { y: 0.02, z: 0.215 });
    },
    { type: 'bob', amp: 0.02, speed: 1.8 },
    { y: y + 0.13 },
  );
  return b.finish();
};

/** 8 Sky Villa: a wide villa with a glass ground floor, an upper volume in the tier colour and a glowing pool deck. */
const skyVilla: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.72, 0.18, 0.38, 'window', GLASS, { y, z: -0.08 });
  b.box(0.76, 0.03, 0.42, 'gloss', WHITE, { y: y + 0.18, z: -0.08 });
  b.box(0.5, 0.2, 0.36, 'gloss', color, { y: y + 0.21, x: -0.1, z: -0.06 });
  b.box(0.36, 0.08, 0.016, 'pane', GLASS, { y: y + 0.27, x: -0.1, z: 0.122 });
  b.box(0.26, 0.03, 0.39, 'gloss', WHITE, { y: y + 0.21, x: 0.24, z: -0.085 });
  b.box(0.2, 0.012, 0.32, 'glow', '#7ff3ff', { y: y + 0.24, x: 0.24, z: -0.08 });
  neonBox(b, 0.5, 0.2, 0.36, y + 0.21, lit(color), { x: -0.1, z: -0.06 });
  strip(b, 0.74, 0.022, 0.022, lit(color), { y: y + 0.18, z: 0.12 });
  return b.finish();
};

/** 9 Neon Rowhouses: three tall narrow homes with zig-zag roofs and vertical neon signs. */
const rowhouses: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  [-0.24, 0, 0.24].forEach((x, i) => {
    const h = [0.42, 0.5, 0.38][i];
    b.box(0.22, h, 0.4, i === 1 ? 'gloss' : 'plaster', i === 1 ? color : WHITE, { y, x });
    b.box(0.26, 0.04, 0.44, 'gloss', i === 1 ? WHITE : color, { y: y + h, x, rz: i % 2 ? -0.35 : 0.35 });
    panes(b, x - 0.08, x + 0.08, y + h * 0.55, 0.205, 1, 0.1, GLASS);
    strip(b, 0.03, h * 0.5, 0.02, lit(color), { y: y + h * 0.2, x: x + 0.085, z: 0.21 });
    door(b, x - 0.03, 0.205, y, color, 0.07, 0.13);
  });
  return b.finish();
};

/** 10 Pod Tower: capsule homes in the tier colour stacked in a spiral around a white core. */
const podTower: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(0.7, H - 0.2);
  b.cyl(0.09, 0.1, h, 'gloss', WHITE, { y }, 12);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = i * 2.2;
    const py = y + 0.02 + (h - 0.16) * (i / (n - 1));
    const x = Math.sin(a) * 0.2;
    const z = Math.cos(a) * 0.2;
    b.box(0.26, 0.13, 0.18, 'gloss', i % 2 ? color : shade(color, 1.15), { x, z, y: py, ry: a });
    b.box(0.14, 0.05, 0.012, 'pane', GLASS, { x: x + Math.sin(a) * 0.092, z: z + Math.cos(a) * 0.092, y: py + 0.045, ry: a });
    b.box(0.2, 0.014, 0.014, 'glow', lit(color), { x: x + Math.sin(a) * 0.095, z: z + Math.cos(a) * 0.095, y: py + 0.012, ry: a });
  }
  b.cyl(0.008, 0.008, 0.18, 'gloss', WHITE, { y: y + h }, 5);
  b.sphere(0.025, 'glow', lit(color), { y: y + h + 0.18 }, 8);
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
    b.box(w + 0.03, 0.03, w * 0.66 + 0.03, 'gloss', color, { y: ly + lh - 0.026 });
    b.box(w + 0.035, 0.01, w * 0.66 + 0.035, 'glow', lit(color), { y: ly + lh + 0.004 });
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
    b.box(w + 0.03, 0.035, w + 0.03, 'gloss', color, { y: sy + sh - 0.028 });
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
  neonCube, podHome, aFramePod, hexaHome, wedgeHouse, stackHouse, hoverHouse, skyVilla, rowhouses,
  podTower, arcology, neonTower, holoSky, helix, megaSpire, cyberHQ, skyDome, orbital,
];
