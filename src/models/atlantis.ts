import { Builder, base, shade } from './kit';
import { panes, star } from './themekit';

/**
 * Atlantis lineup: seashell to Atlantis Spire. White marble, gold trim and
 * columns, sea-floor sand, coral and kelp; the tier colour sits on every dome
 * and roof, so tiers still read by colour.
 */
type Build = (H: number, color: string) => ReturnType<Builder['finish']>;

const MARBLE = '#f1eadb';
const STONE = '#ddd2ba';
const GOLD = '#e8c15a';
const SAND = '#efe0bb';
const SEA = '#5fd3e6';

function seabed(b: Builder, y: number, r = 0.4) {
  b.cyl(r, r + 0.02, 0.02, 'plaster', SAND, { y }, 24);
  return y + 0.02;
}

/** Branching coral: a few tapered sticks in a fan. */
function coral(b: Builder, x: number, z: number, y: number, color: string, h = 0.12) {
  b.cyl(0.012, 0.018, h, 'matte', color, { x, z, y }, 6);
  for (const s of [-1, 1]) {
    b.cyl(0.009, 0.013, h * 0.7, 'matte', color, { x: x + s * 0.012, z, y: y + h * 0.35, rz: -s * 0.6 }, 5);
    b.sphere(0.014, 'matte', shade(color, 1.2), { x: x + s * 0.045, z, y: y + h * 0.88 }, 6);
  }
  b.sphere(0.016, 'matte', shade(color, 1.2), { x, z, y: y + h }, 6);
}

/** Kelp: a tall wavy green ribbon that sways. */
function kelp(b: Builder, x: number, z: number, y: number, h = 0.3) {
  b.animated(
    (s) => {
      const n = 5;
      for (let i = 0; i < n; i++) s.box(0.03, h / n + 0.005, 0.012, 'matte', i % 2 ? '#3f9a5a' : '#4fb36a', { y: (h * i) / n, x: Math.sin(i * 1.3) * 0.012, rz: Math.sin(i * 1.7) * 0.25 });
    },
    { type: 'sway', amp: 0.08, speed: 1.4 },
    { x, z, y },
  );
}

/** A row of classical columns with a gold capital. */
function columns(b: Builder, xs: number[], z: number, y: number, h: number, r = 0.022) {
  for (const x of xs) {
    b.cyl(r, r * 1.1, h, 'plaster', MARBLE, { x, z, y }, 10);
    b.box(r * 2.8, 0.018, r * 2.8, 'gloss', GOLD, { x, z, y: y + h - 0.018 });
  }
}

/** A dome in the tier colour on a marble drum, with a gold finial. */
function dome(b: Builder, r: number, y: number, color: string, at: { x?: number; z?: number } = {}) {
  const x = at.x ?? 0;
  const z = at.z ?? 0;
  b.cyl(r * 0.95, r, r * 0.35, 'plaster', MARBLE, { x, z, y }, 18);
  b.sphere(r, 'gloss', color, { x, z, y: y + r * 0.35, sy: 0.85 }, 18);
  b.cone(r * 0.12, r * 0.6, 'gloss', GOLD, { x, z, y: y + r * 0.35 + r * 0.8 }, 8);
}

/** A glowing arched doorway. */
function arch(b: Builder, x: number, z: number, y: number, w = 0.1, h = 0.15) {
  b.box(w, h, 0.016, 'glow', '#bff7ff', { x, z, y });
  b.cyl(w / 2, w / 2, 0.016, 'glow', '#bff7ff', { x, z, y: y + h, rx: Math.PI / 2 }, 8);
  b.box(w + 0.03, 0.018, 0.02, 'gloss', GOLD, { x, z: z + 0.004, y: y + h + w / 2 });
}

/** 1 Seashell: an upright scallop shell in the tier colour, ribs fanning out from the hinge. */
const seashell: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = -1.05 + (i / (n - 1)) * 2.1;
    b.box(0.075, 0.3, 0.06, 'gloss', i % 2 ? color : shade(color, 1.2), { y: y + 0.02, z: -0.02, rz: a, rx: -0.25 });
  }
  b.box(0.18, 0.07, 0.1, 'gloss', shade(color, 0.8), { y, z: -0.02 });
  b.sphere(0.045, 'gloss', '#fffaf0', { y: y + 0.06, z: 0.12 }, 10);
  return b.finish();
};

/** 2 Coral Hut: a round marble hut with a coloured cone roof and a coral beside it. */
const coralHut: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  b.cyl(0.21, 0.23, 0.22, 'plaster', MARBLE, { y }, 16);
  b.cone(0.28, 0.22, 'roof', color, { y: y + 0.22 }, 16);
  b.torus(0.235, 0.012, 'gloss', GOLD, { y: y + 0.22 });
  arch(b, 0, 0.225, y, 0.09, 0.1);
  coral(b, 0.3, 0.2, y, '#ff7fae', 0.13);
  return b.finish();
};

/** 3 Clam House: a house inside an open clam shell (top shell in the tier colour). */
const clamHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  b.sphere(0.28, 'gloss', shade(color, 0.85), { y, sy: 0.35 }, 18);
  b.box(0.3, 0.16, 0.24, 'plaster', MARBLE, { y: y + 0.04 });
  arch(b, 0, 0.125, y + 0.04, 0.08, 0.08);
  b.sphere(0.3, 'gloss', color, { y: y + 0.3, z: -0.1, sy: 0.35, rx: -0.75 }, 18);
  b.sphere(0.05, 'gloss', '#fffaf0', { y: y + 0.24, x: 0.14 }, 10);
  return b.finish();
};

/** 4 Diving Bell: a brass diving bell home with portholes and a coloured top. */
const divingBell: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  b.cyl(0.18, 0.26, 0.3, 'gloss', MARBLE, { y }, 14);
  b.sphere(0.19, 'gloss', color, { y: y + 0.3, sy: 0.7 }, 12);
  for (const h of [0.05, 0.27]) b.torus(0.25 - h * 0.25, 0.014, 'gloss', GOLD, { y: y + h });
  for (const a of [-0.6, 0.6]) {
    b.cyl(0.04, 0.04, 0.02, 'pane', SEA, { x: Math.sin(a) * 0.22, z: Math.cos(a) * 0.22, y: y + 0.15, rx: Math.PI / 2, ry: a }, 12);
    b.cyl(0.05, 0.05, 0.012, 'gloss', GOLD, { x: Math.sin(a) * 0.215, z: Math.cos(a) * 0.215, y: y + 0.15, rx: Math.PI / 2, ry: a }, 12);
  }
  b.cyl(0.012, 0.012, 0.06, 'gloss', GOLD, { y: y + 0.42 }, 6);
  return b.finish();
};

/** 5 Bubble Dome: a marble home under a coloured dome with arched windows. */
const bubbleDome: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  b.cyl(0.3, 0.32, 0.06, 'plaster', STONE, { y }, 20);
  dome(b, 0.24, y + 0.06, color);
  arch(b, 0, 0.235, y + 0.06, 0.09, 0.07);
  kelp(b, -0.32, 0.18, y, 0.26);
  coral(b, 0.32, 0.2, y, '#b48cff', 0.12);
  return b.finish();
};

/** 6 Reef Cottage: a marble cottage with a coloured gable roof, columns and coral. */
const reefCottage: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  b.box(0.54, 0.26, 0.38, 'plaster', MARBLE, { y, z: -0.04 });
  b.gable(0.54, 0.18, 0.38, 'roof', color, { y: y + 0.26, z: -0.04 }, 0.05);
  b.box(0.6, 0.02, 0.44, 'gloss', GOLD, { y: y + 0.25, z: -0.04 });
  columns(b, [-0.2, 0.2], 0.19, y, 0.25);
  arch(b, 0, 0.155, y, 0.1, 0.12);
  panes(b, -0.16, 0.16, y + 0.12, 0.155, 2, 0.08, SEA);
  coral(b, 0.32, 0.26, y, '#ff7fae', 0.12);
  return b.finish();
};

/** 7 Sea Manor: a two-storey marble manor with a coloured hip roof and two domed turrets. */
const seaManor: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  b.box(0.5, 0.32, 0.38, 'plaster', MARBLE, { y, z: -0.04 });
  b.box(0.54, 0.02, 0.42, 'gloss', GOLD, { y: y + 0.16, z: -0.04 });
  b.pyramid(0.6, 0.18, 0.48, 'roof', color, { y: y + 0.32, z: -0.04 });
  arch(b, 0, 0.152, y, 0.09, 0.1);
  panes(b, -0.16, 0.16, y + 0.2, 0.152, 2, 0.08, SEA);
  for (const x of [-0.3, 0.3]) {
    b.cyl(0.07, 0.075, 0.36, 'plaster', MARBLE, { x, z: 0.08, y }, 12);
    b.sphere(0.08, 'gloss', color, { x, z: 0.08, y: y + 0.36, sy: 1.1 }, 12);
    b.cone(0.012, 0.06, 'gloss', GOLD, { x, z: 0.08, y: y + 0.44 }, 6);
  }
  coral(b, 0.18, 0.3, y, '#ff7fae', 0.1);
  return b.finish();
};

/** 8 Pearl Villa: a two-storey marble villa with a coloured dome and a giant pearl. */
const pearlVilla: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  b.box(0.68, 0.2, 0.4, 'plaster', MARBLE, { y, z: -0.04 });
  columns(b, [-0.28, -0.1, 0.1, 0.28], 0.18, y, 0.2, 0.02);
  b.box(0.72, 0.03, 0.44, 'gloss', color, { y: y + 0.2, z: -0.04 });
  b.box(0.4, 0.16, 0.3, 'plaster', MARBLE, { y: y + 0.23, z: -0.08 });
  arch(b, 0, 0.072, y + 0.23, 0.08, 0.06);
  dome(b, 0.15, y + 0.39, color, { z: -0.08 });
  b.sphere(0.06, 'gloss', '#fff8ee', { x: 0.3, z: 0.24, y: y + 0.05 }, 14);
  b.sphere(0.07, 'gloss', shade(color, 0.85), { x: 0.3, z: 0.24, y: y + 0.01, sy: 0.35 }, 12);
  return b.finish();
};

/** 9 Coral Terraces: three stepped marble terraces with coloured roofs and coral gardens. */
const terraces: Build = (_H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  const tiers = [[0.74, 0.16], [0.54, 0.14], [0.34, 0.14]] as const;
  let ty = y;
  tiers.forEach(([w, h], i) => {
    b.box(w, h, w * 0.6, 'plaster', MARBLE, { y: ty, z: -0.04 + i * 0.03 });
    panes(b, -w / 2 + 0.06, w / 2 - 0.06, ty + h * 0.25, -0.04 + i * 0.03 + w * 0.3 + 0.006, 3 + (2 - i), h * 0.45, SEA);
    b.box(w + 0.03, 0.03, w * 0.6 + 0.03, 'gloss', i === 2 ? color : shade(color, 0.9 + i * 0.05), { y: ty + h, z: -0.04 + i * 0.03 });
    ty += h + 0.03;
  });
  dome(b, 0.1, ty, color, { z: 0.02 });
  coral(b, -0.33, 0.26, y, '#ff7fae', 0.1);
  coral(b, 0.33, 0.26, y, '#ffd36b', 0.1);
  return b.finish();
};

/** 10 Column Hall: a Greek temple, a ring of columns under a coloured pediment roof. */
const columnHall: Build = (H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  b.box(0.76, 0.05, 0.52, 'plaster', STONE, { y });
  b.box(0.7, 0.03, 0.46, 'plaster', MARBLE, { y: y + 0.05 });
  const h = Math.max(0.3, H * 0.55);
  columns(b, [-0.3, -0.18, -0.06, 0.06, 0.18, 0.3], 0.18, y + 0.08, h, 0.024);
  columns(b, [-0.3, 0.3], -0.18, y + 0.08, h, 0.024);
  b.box(0.5, h, 0.28, 'plaster', STONE, { y: y + 0.08 });
  arch(b, 0, 0.142, y + 0.08, 0.1, h * 0.55);
  b.box(0.76, 0.05, 0.5, 'gloss', GOLD, { y: y + 0.08 + h });
  b.gable(0.76, 0.16, 0.5, 'roof', color, { y: y + 0.13 + h }, 0.03);
  return b.finish();
};

/** 11 Reef Apartments: a marble block of arched balconies with coloured awnings. */
const reefApts: Build = (H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  const floors = 5;
  const fh = Math.max(0.13, (H - 0.25) / floors);
  b.box(0.64, fh * floors, 0.42, 'plaster', MARBLE, { y, z: -0.03 });
  for (let f = 0; f < floors; f++) {
    const fy = y + f * fh;
    for (const x of [-0.2, 0, 0.2]) arch(b, x, 0.185, fy + fh * 0.12, 0.08, fh * 0.45);
    if (f > 0) b.box(0.68, 0.03, 0.08, 'gloss', f % 2 ? color : GOLD, { y: fy, z: 0.21 });
  }
  dome(b, 0.18, y + floors * fh, color, { z: -0.03 });
  kelp(b, -0.36, 0.24, y, 0.36);
  return b.finish();
};

/** 12 Lighthouse Tower: a striped marble lighthouse with a glowing lantern and coloured cap. */
const lighthouse: Build = (H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  const h = Math.max(1.0, H - 0.35);
  b.cyl(0.32, 0.34, 0.08, 'plaster', STONE, { y }, 20);
  const n = 6;
  for (let i = 0; i < n; i++) b.cyl(0.2 - (i + 1) * 0.012, 0.2 - i * 0.012, h / n, 'plaster', i % 2 ? color : MARBLE, { y: y + 0.08 + (h * i) / n }, 18);
  const top = y + 0.08 + h;
  b.cyl(0.16, 0.16, 0.03, 'gloss', GOLD, { y: top }, 18);
  b.cyl(0.1, 0.1, 0.14, 'glow', '#bff7ff', { y: top + 0.03 }, 14);
  b.cone(0.15, 0.16, 'gloss', color, { y: top + 0.17 }, 14);
  b.cone(0.02, 0.1, 'gloss', GOLD, { y: top + 0.33 }, 6);
  return b.finish();
};

/** 13 Kelp Tower: a marble tower wrapped in kelp, with coloured domed balconies. */
const kelpTower: Build = (H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  const h = Math.max(1.2, H - 0.4);
  b.box(0.42, h, 0.42, 'plaster', MARBLE, { y });
  for (let i = 1; i < 6; i++) {
    const fy = y + (h * i) / 6;
    b.box(0.48, 0.03, 0.48, 'gloss', i % 2 ? color : GOLD, { y: fy });
    arch(b, 0, 0.212, fy - h / 6 + 0.03, 0.09, h / 12);
  }
  dome(b, 0.2, y + h, color);
  for (const [x, z] of [[-0.26, 0.24], [0.26, 0.24], [0.26, -0.24]] as const) kelp(b, x, z, y, h * 0.85);
  return b.finish();
};

/** 14 Trident Tower: a tall tower crowned with a golden trident, coloured bands. */
const trident: Build = (H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  const h = Math.max(1.2, H - 0.5);
  b.cyl(0.18, 0.24, h, 'plaster', MARBLE, { y }, 16);
  for (let i = 1; i <= 5; i++) b.cyl(0.235 - i * 0.01, 0.235 - i * 0.01, 0.04, 'gloss', color, { y: y + (h * i) / 6 }, 16);
  for (let i = 0; i < 5; i++) arch(b, 0, 0.21 - i * 0.008, y + 0.05 + (h * i) / 6, 0.07, h / 12);
  const top = y + h;
  b.cyl(0.2, 0.18, 0.05, 'gloss', GOLD, { y: top }, 16);
  b.cyl(0.02, 0.02, 0.3, 'gloss', GOLD, { y: top + 0.05 }, 6);
  b.box(0.3, 0.03, 0.03, 'gloss', GOLD, { y: top + 0.3 });
  for (const x of [-0.14, 0, 0.14]) b.cone(0.025, 0.14, 'gloss', GOLD, { x, y: top + 0.33 }, 6);
  return b.finish();
};

/** 15 Conch Spire: a spiralling conch-shell spire in the tier colour on a marble base. */
const conch: Build = (H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  const h = Math.max(1.5, H - 0.4);
  b.cyl(0.32, 0.34, 0.1, 'plaster', MARBLE, { y }, 20);
  columns(b, [-0.24, 0.24], 0.2, y + 0.1, 0.18);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const r = 0.26 * (1 - t * 0.85);
    b.cyl(r * 0.85, r, h / n + 0.01, 'gloss', i % 2 ? color : shade(color, 1.2), { y: y + 0.1 + h * t, ry: t * 6 }, 10);
    b.torus(r * 0.92, 0.01, 'gloss', '#fff5e6', { y: y + 0.1 + h * t });
  }
  b.sphere(0.03, 'gloss', '#fff8ee', { y: y + 0.12 + h }, 10);
  return b.finish();
};

/** 16 Poseidon's Temple: a grand temple on steps, golden pediment, coloured domes. */
const temple: Build = (H, color) => {
  const b = new Builder();
  const y = seabed(b, base(b, color));
  for (let i = 0; i < 3; i++) b.box(0.84 - i * 0.06, 0.04, 0.6 - i * 0.06, 'plaster', i % 2 ? MARBLE : STONE, { y: y + i * 0.04 });
  const fy = y + 0.12;
  const h = Math.max(0.5, (H - 0.6) * 0.5);
  columns(b, [-0.3, -0.18, -0.06, 0.06, 0.18, 0.3], 0.2, fy, h, 0.026);
  b.box(0.6, h, 0.34, 'plaster', STONE, { y: fy, z: -0.02 });
  arch(b, 0, 0.152, fy, 0.12, h * 0.6);
  b.box(0.8, 0.05, 0.52, 'gloss', GOLD, { y: fy + h });
  b.gable(0.8, 0.18, 0.52, 'roof', color, { y: fy + h + 0.05 }, 0.03);
  dome(b, 0.18, fy + h + 0.12, color, { z: -0.14 });
  b.extrude(star(5, 0.06, 0.025), 0.02, 'gloss', GOLD, { y: fy + h + 0.12, z: 0.27, rx: Math.PI / 2 });
  return b.finish();
};

/** 17 Crystal Palace: a floating marble island palace in a bubble of light. */
const crystalPalace: Build = (H, color) => {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.3, 0.34, 0.02, 'glow', '#8ff4ff', { y: y0 }, 24);
  const lift = Math.max(0.35, H * 0.3);
  b.animated(
    (s) => {
      s.cyl(0.43, 0.08, 0.3, 'plaster', SAND, { y: -0.3 }, 10);
      s.cyl(0.45, 0.43, 0.05, 'plaster', MARBLE, { y: 0 }, 22);
      s.box(0.36, 0.22, 0.26, 'plaster', MARBLE, { y: 0.05, z: -0.04 });
      dome(s, 0.15, 0.27, color, { z: -0.04 });
      for (const [x, z] of [[-0.28, 0.12], [0.28, 0.12], [0, -0.3]] as const) {
        s.cyl(0.05, 0.06, 0.34, 'plaster', MARBLE, { x, z, y: 0.05 }, 10);
        s.sphere(0.07, 'gloss', color, { x, z, y: 0.42, sy: 1.2 }, 12);
      }
      coral(s, 0.2, 0.3, 0.05, '#ff7fae', 0.1);
      s.sphere(0.45, 'beam', '#9ff3ff', { y: 0.05, sy: 1.05 }, 20);
    },
    { type: 'bob', amp: 0.035, speed: 1.2 },
    { y: y0 + lift },
  );
  return b.finish();
};

/** 18 Atlantis Spire: a pearl-white spire of rings and domes, a beam of light rising to the surface. */
const atlantisSpire: Build = (H, color) => {
  const b = new Builder();
  const y0 = seabed(b, base(b, '#a9f0ff'));
  b.cyl(0.34, 0.38, 0.08, 'plaster', MARBLE, { y: y0 }, 24);
  const h = Math.max(1.9, H - 0.6);
  b.cyl(0.05, 0.17, h, 'gloss', MARBLE, { y: y0 + 0.08 }, 16);
  for (let i = 1; i <= 4; i++) {
    const r = 0.2 - i * 0.03;
    b.torus(r, 0.014, 'gloss', GOLD, { y: y0 + 0.08 + (h * i) / 5 });
    b.sphere(r * 0.6, 'gloss', color, { y: y0 + 0.08 + (h * i) / 5, sy: 0.6 }, 14);
  }
  b.sphere(0.09, 'gloss', '#fff8ee', { y: y0 + 0.08 + h }, 16);
  b.cyl(0.08, 0.04, 8, 'beam', '#9ff3ff', { y: y0 + 0.12 + h }, 12, true);
  coral(b, -0.32, 0.22, y0, '#ff7fae', 0.12);
  coral(b, 0.32, 0.22, y0, '#b48cff', 0.12);
  return b.finish();
};

export const ATLANTIS: Build[] = [
  seashell, coralHut, clamHouse, divingBell, bubbleDome, reefCottage, seaManor, pearlVilla, terraces,
  columnHall, reefApts, lighthouse, kelpTower, trident, conch, temple, crystalPalace, atlantisSpire,
];
