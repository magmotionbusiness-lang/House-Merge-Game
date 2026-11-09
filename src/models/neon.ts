import { Builder, base, shade } from './kit';
import { neonBox, neonRings, panes } from './themekit';

/**
 * Neon City lineup: power cell to orbital tower. Dark glass and chrome with
 * glowing trims in the tier colour, so every building still reads by colour.
 */
type Build = (H: number, color: string) => ReturnType<Builder['finish']>;

const DARK = '#2b3245';
const CHROME = '#c9d3e0';
const GLASS = '#7fd8ff';

function deck(b: Builder, y: number, color: string, r = 0.4) {
  b.cyl(r, r + 0.02, 0.02, 'gloss', '#20263a', { y }, 24);
  b.torus(r - 0.03, 0.007, 'glow', color, { y: y + 0.02 });
  return y + 0.02;
}

/** A glow strip in a lighter version of the tier colour, so dark tier colours still glow. */
const lit = (c: string) => shade(c, 1.35);

/** 1 Power Cell: a glowing battery cell. */
const powerCell: Build = (_H, color) => {
  const b = new Builder();
  const y = base(b, color);
  b.cyl(0.2, 0.2, 0.3, 'gloss', DARK, { y }, 18);
  b.cyl(0.205, 0.205, 0.16, 'glow', lit(color), { y: y + 0.03 }, 18);
  b.cyl(0.08, 0.08, 0.05, 'gloss', CHROME, { y: y + 0.3 }, 12);
  b.cyl(0.21, 0.21, 0.02, 'gloss', CHROME, { y: y + 0.28 }, 18);
  return b.finish();
};

/** 2 Sleep Pod: a capsule pod with a glowing visor. */
const pod: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.sphere(0.24, 'gloss', '#e9eef7', { y: y + 0.12, sx: 1.3, sy: 0.85 }, 18);
  b.box(0.3, 0.07, 0.02, 'glow', lit(color), { y: y + 0.13, z: 0.2 }, 0.02);
  b.box(0.36, 0.05, 0.3, 'gloss', DARK, { y }, 0.02);
  return b.finish();
};

/** 3 Dome Hut: a glass dome home with a neon ring. */
const domeHut: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.cyl(0.3, 0.3, 0.06, 'gloss', DARK, { y }, 20);
  b.sphere(0.27, 'gloss', GLASS, { y: y + 0.06, sy: 0.8 }, 18);
  b.torus(0.28, 0.012, 'glow', lit(color), { y: y + 0.08 });
  b.box(0.12, 0.16, 0.02, 'glow', '#ffffff', { y: y + 0.06, z: 0.27 });
  b.cyl(0.01, 0.01, 0.12, 'gloss', CHROME, { y: y + 0.27 }, 5);
  b.sphere(0.02, 'glow', lit(color), { y: y + 0.4 }, 6);
  return b.finish();
};

/** 4 Cube Home: a dark cube with a glowing window band and outlines. */
const cubeHome: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.46, 0.36, 0.42, 'gloss', DARK, { y });
  neonBox(b, 0.46, 0.36, 0.42, y, lit(color));
  b.box(0.34, 0.1, 0.014, 'pane', GLASS, { y: y + 0.18, z: 0.212 });
  b.box(0.1, 0.16, 0.014, 'glow', '#ffffff', { y, x: -0.13, z: 0.212 });
  return b.finish();
};

/** 5 Smart Cottage: a futurist gable home with solar roof and light seams. */
const smartCottage: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.56, 0.28, 0.42, 'gloss', '#e9eef7', { y, z: -0.02 });
  b.gable(0.56, 0.2, 0.42, 'gloss', '#1d2233', { y: y + 0.28, z: -0.02 }, 0.04);
  b.box(0.58, 0.012, 0.012, 'glow', lit(color), { y: y + 0.28, z: 0.2 });
  b.box(0.012, 0.28, 0.012, 'glow', lit(color), { y, x: -0.28, z: 0.2 });
  b.box(0.012, 0.28, 0.012, 'glow', lit(color), { y, x: 0.28, z: 0.2 });
  b.box(0.3, 0.14, 0.014, 'pane', GLASS, { y: y + 0.08, x: 0.08, z: 0.195 });
  b.box(0.1, 0.18, 0.014, 'glow', '#ffffff', { y, x: -0.17, z: 0.195 });
  return b.finish();
};

/** 6 Glass House: a two-floor glass box on a dark plinth with glowing floors. */
const glassHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.6, 0.05, 0.44, 'gloss', DARK, { y });
  b.box(0.54, 0.38, 0.38, 'window', '#bfe6ff', { y: y + 0.05 });
  b.box(0.58, 0.015, 0.42, 'glow', lit(color), { y: y + 0.23 });
  b.box(0.62, 0.04, 0.46, 'gloss', DARK, { y: y + 0.43 });
  neonBox(b, 0.58, 0.38, 0.42, y + 0.05, lit(color));
  return b.finish();
};

/** 7 Hover House: a sleek house floating over a glowing pad. */
const hoverHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.cyl(0.28, 0.3, 0.02, 'glow', lit(color), { y }, 22);
  b.animated(
    (s) => {
      s.box(0.6, 0.22, 0.4, 'gloss', '#e9eef7', {}, 0.04);
      s.box(0.5, 0.1, 0.014, 'pane', GLASS, { y: 0.07, z: 0.2 });
      s.box(0.44, 0.14, 0.32, 'gloss', DARK, { y: 0.22, x: 0.06 }, 0.03);
      s.box(0.46, 0.012, 0.34, 'glow', lit(color), { y: 0.22, x: 0.06 });
      s.box(0.3, 0.06, 0.014, 'pane', GLASS, { y: 0.26, x: 0.06, z: 0.162 });
    },
    { type: 'bob', amp: 0.02, speed: 1.8 },
    { y: y + 0.1 },
  );
  return b.finish();
};

/** 8 Holo Villa: a stacked villa with a holographic pool and light strips. */
const holoVilla: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.box(0.7, 0.2, 0.38, 'gloss', DARK, { y, z: -0.06 });
  b.box(0.6, 0.12, 0.014, 'pane', GLASS, { y: y + 0.04, z: 0.13 });
  b.box(0.48, 0.2, 0.34, 'gloss', '#e9eef7', { y: y + 0.2, x: -0.08, z: -0.08 });
  b.box(0.36, 0.12, 0.014, 'pane', GLASS, { y: y + 0.24, x: -0.08, z: 0.092 });
  neonBox(b, 0.7, 0.2, 0.38, y, lit(color), { z: -0.06 });
  neonBox(b, 0.48, 0.2, 0.34, y + 0.2, lit(color), { x: -0.08, z: -0.08 });
  b.box(0.5, 0.012, 0.12, 'glow', '#7ff3ff', { y, z: 0.24 });
  return b.finish();
};

/** 9 Pod Stack: capsule apartments stacked at angles. */
const podStack: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.cyl(0.08, 0.08, 0.62, 'gloss', CHROME, { y }, 10);
  const pods: [number, number, number, number][] = [[-0.16, 0.12, 0.06, 0.3], [0.17, 0.08, 0.18, -0.5], [-0.1, -0.12, 0.32, 0.9], [0.14, -0.08, 0.44, -0.2]];
  for (const [x, z, py, ry] of pods) {
    b.box(0.3, 0.14, 0.2, 'gloss', '#e9eef7', { x, z, y: y + py, ry }, 0.05);
    b.box(0.2, 0.05, 0.012, 'glow', lit(color), { x: x + Math.sin(ry) * 0.104, z: z + Math.cos(ry) * 0.104, y: y + py + 0.05, ry });
  }
  b.sphere(0.04, 'glow', lit(color), { y: y + 0.66 }, 8);
  return b.finish();
};

/** 10 Ring Apartments: a donut of apartments around a glowing core. */
const ringApts: Build = (_H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  b.cyl(0.08, 0.1, 0.62, 'glow', lit(color), { y }, 12);
  const floors = 4;
  for (let f = 0; f < floors; f++) {
    const fy = y + 0.04 + f * 0.13;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.box(0.14, 0.11, 0.1, 'gloss', i % 2 ? '#e9eef7' : DARK, { x: Math.sin(a) * 0.32, z: Math.cos(a) * 0.32, y: fy, ry: a });
      if (i % 2 === 0) b.box(0.08, 0.05, 0.01, 'pane', GLASS, { x: Math.sin(a) * 0.372, z: Math.cos(a) * 0.372, y: fy + 0.03, ry: a });
    }
    if (f % 2 === 1) b.torus(0.32, 0.008, 'glow', lit(color), { y: fy + 0.12 });
  }
  return b.finish();
};

/** 11 Arcology: a stepped megablock with light bands on every floor. */
const arcology: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const levels = 5;
  const lh = Math.max(0.18, (H - 0.2) / levels);
  for (let i = 0; i < levels; i++) {
    const w = 0.76 - i * 0.1;
    const ly = y + i * lh;
    b.box(w, lh, w * 0.65, 'window', '#5aa7d6', { y: ly });
    b.box(w + 0.02, 0.015, w * 0.65 + 0.02, 'glow', lit(color), { y: ly + lh - 0.015 });
  }
  b.cone(0.05, 0.25, 'gloss', CHROME, { y: y + levels * lh }, 8);
  return b.finish();
};

/** 12 Neon Tower: a dark tower with vertical neon edges and a glowing crown. */
const neonTower: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.0, H - 0.3);
  b.box(0.5, h, 0.5, 'window', '#3c6e9e', { y });
  neonBox(b, 0.5, h, 0.5, y, lit(color));
  for (let i = 1; i < 6; i++) b.box(0.52, 0.01, 0.52, 'glow', shade(color, 1.6), { y: y + (h * i) / 6 });
  b.box(0.36, 0.12, 0.36, 'gloss', DARK, { y: y + h });
  b.box(0.38, 0.03, 0.38, 'glow', lit(color), { y: y + h + 0.12 });
  b.cyl(0.01, 0.01, 0.25, 'gloss', CHROME, { y: y + h + 0.15 }, 5);
  return b.finish();
};

/** 13 Holo Skyscraper: a tapering glass tower with floating hologram rings. */
const holoSky: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.3, H - 0.35);
  const n = 4;
  let sy = y;
  for (let i = 0; i < n; i++) {
    const w = 0.56 - i * 0.1;
    const sh = (h / n) * (1 - i * 0.05);
    b.box(w, sh, w, 'window', '#4b8fc2', { y: sy });
    neonBox(b, w, sh, w, sy, lit(color));
    sy += sh;
  }
  b.animated((s) => s.torus(0.34, 0.01, 'glow', lit(color)), { type: 'spin', speed: 0.8 }, { y: y + h * 0.55 });
  b.animated((s) => s.torus(0.26, 0.01, 'glow', '#7ff3ff'), { type: 'bob', amp: 0.05, speed: 1.2 }, { y: y + h * 0.8 });
  b.cone(0.04, 0.3, 'gloss', CHROME, { y: sy }, 8);
  return b.finish();
};

/** 14 Helix Tower: a double-helix of glowing floors around a glass core. */
const helix: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.5, H - 0.35);
  b.cyl(0.13, 0.15, h, 'window', '#4b8fc2', { y }, 12);
  const n = 22;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const a = t * Math.PI * 5;
    for (const off of [0, Math.PI]) {
      b.box(0.24, 0.04, 0.12, 'gloss', off ? DARK : '#e9eef7', { y: y + t * h, x: Math.sin(a + off) * 0.18, z: Math.cos(a + off) * 0.18, ry: a + off });
      b.box(0.24, 0.008, 0.124, 'glow', lit(color), { y: y + t * h + 0.04, x: Math.sin(a + off) * 0.18, z: Math.cos(a + off) * 0.18, ry: a + off });
    }
  }
  b.cone(0.05, 0.35, 'glow', lit(color), { y: y + h }, 8);
  return b.finish();
};

/** 15 Mega Spire: a triangular megatower with fins and a pulsing tip. */
const megaSpire: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.8, H - 0.4);
  b.cyl(0.12, 0.3, h, 'window', '#3c6e9e', { y }, 3);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    b.box(0.03, h * 0.85, 0.16, 'gloss', DARK, { y, x: Math.sin(a) * 0.22, z: Math.cos(a) * 0.22, ry: a });
    b.box(0.012, h * 0.85, 0.012, 'glow', lit(color), { y, x: Math.sin(a) * 0.3, z: Math.cos(a) * 0.3, ry: a });
  }
  neonRings(b, 0.22, y, h * 0.6, 4, lit(color));
  b.cone(0.1, 0.5, 'gloss', CHROME, { y: y + h }, 3);
  b.sphere(0.04, 'pulse', lit(color), { y: y + h + 0.5 }, 8);
  return b.finish();
};

/** 16 Cyber HQ: twin towers joined by a glowing skybridge, a logo ring between them. */
const cyberHQ: Build = (H, color) => {
  const b = new Builder();
  const y = deck(b, base(b, color), color);
  const h = Math.max(1.8, H - 0.5);
  for (const [x, k] of [[-0.2, 1], [0.2, 0.86]] as const) {
    b.box(0.26, h * k, 0.36, 'window', '#3c6e9e', { y, x });
    neonBox(b, 0.26, h * k, 0.36, y, lit(color), { x });
    b.box(0.2, 0.08, 0.3, 'gloss', DARK, { y: y + h * k, x });
  }
  for (const k of [0.45, 0.7]) {
    b.box(0.2, 0.08, 0.2, 'gloss', '#e9eef7', { y: y + h * k });
    b.box(0.2, 0.012, 0.21, 'glow', lit(color), { y: y + h * k + 0.08 });
  }
  b.animated((s) => s.torus(0.12, 0.016, 'glow', lit(color), { rx: Math.PI / 2 }), { type: 'spin', speed: 1 }, { y: y + h * 0.88 });
  return b.finish();
};

/** 17 Sky Dome: a floating city disc under a glass dome. */
const skyDome: Build = (H, color) => {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.3, 0.34, 0.02, 'glow', lit(color), { y: y0 }, 24);
  const lift = Math.max(0.35, H * 0.3);
  b.animated(
    (s) => {
      s.cyl(0.45, 0.2, 0.14, 'gloss', DARK, { y: -0.14 }, 20);
      s.torus(0.44, 0.012, 'glow', lit(color), { y: -0.02 });
      s.cyl(0.45, 0.45, 0.03, 'gloss', '#3a4256', { y: 0 }, 22);
      const towers: [number, number, number][] = [[0, 0, 0.42], [-0.18, 0.1, 0.26], [0.17, 0.12, 0.3], [0.1, -0.18, 0.22], [-0.14, -0.15, 0.18]];
      for (const [x, z, th] of towers) {
        s.box(0.1, th, 0.1, 'window', '#4b8fc2', { x, z, y: 0.03 });
        s.box(0.11, 0.012, 0.11, 'glow', lit(color), { x, z, y: 0.03 + th });
      }
      s.sphere(0.43, 'beam', '#7ff3ff', { y: 0.03, sy: 1.1 }, 20);
      for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) s.torus(0.43, 0.006, 'glow', lit(color), { y: 0.03, rx: Math.PI / 2, ry: a });
    },
    { type: 'bob', amp: 0.035, speed: 1.4 },
    { y: y0 + lift },
  );
  return b.finish();
};

/** 18 Orbital Tower: a launch tower whose beam climbs to orbit. */
const orbital: Build = (H, color) => {
  const b = new Builder();
  const y0 = deck(b, base(b, '#a9c4ff'), '#7ff3ff');
  const h = Math.max(1.9, H - 0.6);
  b.cyl(0.38, 0.42, 0.08, 'gloss', DARK, { y: y0 }, 6);
  b.torus(0.36, 0.014, 'glow', '#7ff3ff', { y: y0 + 0.085 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.box(0.05, h * 0.5, 0.05, 'gloss', CHROME, { y: y0 + 0.08, x: Math.sin(a) * 0.2, z: Math.cos(a) * 0.2, rx: Math.cos(a) * -0.12, rz: Math.sin(a) * 0.12 });
  }
  b.cyl(0.07, 0.12, h, 'gloss', color, { y: y0 + 0.08 }, 12);
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
  panes(b, -0.1, 0.1, y0 + 0.02, 0.43, 1, 0.04, '#7ff3ff', 'glow');
  return b.finish();
};

export const NEON: Build[] = [
  powerCell, pod, domeHut, cubeHome, smartCottage, glassHouse, hoverHouse, holoVilla, podStack,
  ringApts, arcology, neonTower, holoSky, helix, megaSpire, cyberHQ, skyDome, orbital,
];
