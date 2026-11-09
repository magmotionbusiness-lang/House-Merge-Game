import { Builder, base, shade } from './kit';
import { palm, panes, posts, star, stripedBox, thatch, water } from './themekit';

/**
 * Tropical Beach lineup: sandcastle to paradise spire. Every model keeps its
 * tier colour as the dominant accent, so a tier reads the same in every theme.
 */
type Build = (H: number, color: string) => ReturnType<Builder['finish']>;

const SAND = '#f3d9a4';
const WHITE = '#fbf7ef';
const THATCH = '#d8b06a';

function sand(b: Builder, y: number, r = 0.4) {
  b.cyl(r, r + 0.02, 0.02, 'plaster', SAND, { y }, 24);
  return y + 0.02;
}

/** 1 Sandcastle: a sand keep with four turrets and a flag. */
const sandcastle: Build = (_H, color) => {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.5, 0.18, 0.4, 'plaster', SAND, { y }, 0.03);
  for (const [x, z] of [[-0.25, -0.2], [0.25, -0.2], [-0.25, 0.2], [0.25, 0.2]] as const) {
    b.cyl(0.08, 0.09, 0.26, 'plaster', SAND, { x, z, y }, 10);
    b.cyl(0.095, 0.08, 0.04, 'plaster', shade(SAND, 0.92), { x, z, y: y + 0.26 }, 10);
  }
  b.box(0.12, 0.1, 0.02, 'matte', shade(SAND, 0.6), { y, z: 0.205 });
  b.cyl(0.008, 0.008, 0.2, 'matte', '#8a6a48', { y: y + 0.18 }, 5);
  b.box(0.12, 0.07, 0.008, 'matte', color, { x: 0.06, y: y + 0.31 });
  b.sphere(0.04, 'gloss', '#ff8fa3', { x: 0.33, z: 0.33, y: y + 0.01, sy: 0.5 }, 8);
  return b.finish();
};

/** 2 Beach Hut: a striped bathing hut. */
const beachHut: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  stripedBox(b, 0.46, 0.34, 0.4, color, WHITE, { y }, 6, 'plaster');
  b.gable(0.46, 0.18, 0.4, 'roof', shade(color, 0.8), { y: y + 0.34, ry: Math.PI / 2 }, 0.05);
  b.box(0.16, 0.24, 0.02, 'door', shade(color, 0.7), { y, z: 0.205 });
  b.box(0.5, 0.025, 0.12, 'wood', '#c79a63', { y, z: 0.27 });
  return b.finish();
};

/** 3 Lifeguard Tower: a cabin on stilts with a ladder and a red cross flag. */
const lifeguard: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  posts(b, [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]], y, 0.26, '#f2f2f2', 0.022);
  b.box(0.5, 0.03, 0.42, 'wood', '#cfa06a', { y: y + 0.26 });
  b.box(0.38, 0.2, 0.3, 'siding', color, { y: y + 0.29, z: -0.03 });
  panes(b, -0.15, 0.15, y + 0.36, 0.125, 2, 0.08);
  b.box(0.46, 0.03, 0.4, 'matte', WHITE, { y: y + 0.49, rx: -0.12, z: 0.02 });
  for (let i = 0; i < 4; i++) b.box(0.14, 0.012, 0.02, 'wood', '#cfa06a', { y: y + 0.05 + i * 0.06, z: 0.3, rx: 0.4 });
  b.cyl(0.006, 0.006, 0.2, 'matte', '#777', { x: 0.2, z: -0.12, y: y + 0.5 }, 5);
  b.box(0.1, 0.06, 0.006, 'matte', '#e53935', { x: 0.25, z: -0.12, y: y + 0.63 });
  return b.finish();
};

/** 4 Tiki Hut: a round bamboo hut with a tall thatch cone and tiki torches. */
const tiki: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.cyl(0.22, 0.24, 0.24, 'wood', '#d9b36c', { y }, 14);
  thatch(b, 0.66, 0.66, 0.32, y + 0.23, shade(color, 1.25), true);
  b.box(0.12, 0.17, 0.02, 'door', '#5a3a22', { y, z: 0.23 });
  for (const x of [-0.3, 0.3]) {
    b.cyl(0.012, 0.012, 0.22, 'wood', '#6b4a2b', { x, z: 0.28, y }, 5);
    b.cone(0.03, 0.06, 'glow', '#ffb347', { x, z: 0.28, y: y + 0.22 }, 6);
  }
  return b.finish();
};

/** 5 Surf Shack: a plank shack with surfboards leaning on the front. */
const surfShack: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.6, 0.3, 0.42, 'wood', '#e7c590', { y, z: -0.03 });
  b.box(0.7, 0.03, 0.56, 'wood', color, { y: y + 0.3, rx: -0.08 });
  b.box(0.5, 0.06, 0.02, 'matte', WHITE, { y: y + 0.24, z: 0.185 });
  panes(b, -0.2, 0.2, y + 0.1, 0.185, 2, 0.1);
  const boards = [color, '#ffd84d', '#4fc3f7'];
  boards.forEach((c, i) => b.box(0.08, 0.32, 0.02, 'gloss', c, { x: -0.22 + i * 0.22, z: 0.24, y, rx: -0.18 }, 0.035));
  return b.finish();
};

/** 6 Beach Cottage: a pastel plaster cottage with a porch and a palm. */
const cottage: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.56, 0.32, 0.42, 'plaster', '#bff3ee', { y, x: -0.04, z: -0.04 });
  b.pyramid(0.64, 0.2, 0.5, 'roof', color, { y: y + 0.32, x: -0.04, z: -0.04 });
  b.box(0.6, 0.02, 0.14, 'wood', '#c79a63', { y, x: -0.04, z: 0.24 });
  posts(b, [[-0.3, 0.29], [0.22, 0.29]], y, 0.26, WHITE, 0.012);
  b.box(0.62, 0.02, 0.16, 'matte', shade(color, 1.2), { y: y + 0.26, x: -0.04, z: 0.24 });
  b.box(0.12, 0.2, 0.02, 'door', '#ffffff', { y, x: -0.04, z: 0.175 });
  panes(b, -0.3, 0.22, y + 0.1, 0.175, 3, 0.1);
  palm(b, 0.34, -0.22, y, 0.36, 0.9);
  return b.finish();
};

/** 7 Stilt House: a two-floor house on stilts over a lagoon. */
const stiltHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = water(b, base(b, color));
  posts(b, [[-0.22, -0.16], [0.22, -0.16], [-0.22, 0.16], [0.22, 0.16], [0, 0.16]], y, 0.14, '#7a5536', 0.018);
  const f = y + 0.14;
  b.box(0.6, 0.025, 0.46, 'wood', '#c79a63', { y: f });
  b.box(0.48, 0.32, 0.36, 'wood', '#f6e3c0', { y: f + 0.025, z: -0.03 });
  b.box(0.5, 0.015, 0.38, 'matte', WHITE, { y: f + 0.18, z: -0.03 });
  panes(b, -0.2, 0.2, f + 0.06, 0.155, 3, 0.08);
  panes(b, -0.2, 0.2, f + 0.22, 0.155, 3, 0.08);
  b.pyramid(0.6, 0.22, 0.5, 'roof', color, { y: f + 0.345, z: -0.03 });
  for (let i = 0; i < 4; i++) b.box(0.1, 0.01, 0.06, 'wood', '#a77b4f', { y: y + 0.01 + i * 0.035, z: 0.3 + i * 0.03 });
  return b.finish();
};

/** 8 Overwater Bungalow: the Maldives classic, a thatched villa on a pier with a deck. */
const overwater: Build = (_H, color) => {
  const b = new Builder();
  const y = water(b, base(b, color));
  posts(b, [[-0.24, -0.18], [0.24, -0.18], [-0.24, 0.12], [0.24, 0.12], [0, 0.3]], y, 0.1);
  const f = y + 0.1;
  b.box(0.62, 0.025, 0.46, 'wood', '#c99c66', { y: f, z: -0.02 });
  b.box(0.16, 0.025, 0.26, 'wood', '#c99c66', { y: f, z: 0.3 });
  b.box(0.46, 0.24, 0.3, 'wood', '#f3e2c3', { y: f + 0.025, z: -0.07 });
  b.box(0.3, 0.16, 0.014, 'pane', '#cfefff', { y: f + 0.05, z: 0.085 });
  thatch(b, 0.66, 0.5, 0.26, f + 0.26, color, false, { z: -0.07 });
  b.box(0.12, 0.02, 0.06, 'gloss', '#3fd0e0', { y: f + 0.026, x: 0.2, z: 0.16 });
  return b.finish();
};

/** 9 Bungalow Pier: three thatched bungalows along a curved boardwalk. */
const bungalowPier: Build = (_H, color) => {
  const b = new Builder();
  const y = water(b, base(b, color));
  const spots: [number, number, number][] = [[-0.26, -0.12, 0.9], [0.0, -0.24, 1.05], [0.26, -0.12, 0.9]];
  b.box(0.7, 0.02, 0.1, 'wood', '#c99c66', { y: y + 0.08, z: 0.08 });
  b.box(0.1, 0.02, 0.3, 'wood', '#c99c66', { y: y + 0.08, z: 0.28 });
  posts(b, [[-0.3, 0.08], [0, 0.08], [0.3, 0.08], [0, 0.36]], y, 0.08);
  for (const [x, z, s] of spots) {
    posts(b, [[x - 0.08, z - 0.06], [x + 0.08, z - 0.06]], y, 0.08);
    b.box(0.24 * s, 0.02, 0.2 * s, 'wood', '#c99c66', { x, z, y: y + 0.08 });
    b.box(0.18 * s, 0.17 * s, 0.14 * s, 'wood', '#f3e2c3', { x, z, y: y + 0.1 });
    b.box(0.1 * s, 0.1 * s, 0.012, 'pane', '#cfefff', { x, z: z + 0.07 * s, y: y + 0.12 });
    thatch(b, 0.28 * s, 0.24 * s, 0.2 * s, y + 0.1 + 0.17 * s, s > 1 ? color : shade(color, 0.88), false, { x, z });
  }
  return b.finish();
};

/** 10 Pool Villa: a white modern villa with glass walls, an infinity pool and palms. */
const poolVilla: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.62, 0.2, 0.34, 'plaster', WHITE, { y, z: -0.08 });
  b.box(0.5, 0.15, 0.014, 'pane', '#bfe9ff', { y: y + 0.025, z: 0.093 });
  b.box(0.44, 0.18, 0.28, 'plaster', WHITE, { y: y + 0.2, x: 0.06, z: -0.12 });
  b.box(0.34, 0.12, 0.014, 'pane', '#bfe9ff', { y: y + 0.23, x: 0.06, z: 0.023 });
  b.box(0.7, 0.03, 0.4, 'matte', color, { y: y + 0.2, z: -0.08 });
  b.box(0.52, 0.03, 0.34, 'matte', color, { y: y + 0.38, x: 0.06, z: -0.12 });
  b.box(0.56, 0.03, 0.18, 'wood', '#d7b48a', { y, z: 0.22 });
  b.box(0.42, 0.012, 0.13, 'gloss', '#38c9e6', { y: y + 0.02, x: 0.04, z: 0.22 });
  palm(b, -0.36, 0.22, y, 0.42, 0.95);
  palm(b, 0.37, 0.2, y, 0.34, 0.8);
  return b.finish();
};

/** 11 Seaside Apartments: a white block with striped balconies in the tier colour. */
const seasideApts: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const floors = 6;
  const fh = Math.max(0.13, (H - 0.25) / floors);
  b.box(0.66, fh * floors, 0.42, 'plaster', WHITE, { y, z: -0.03 });
  for (let f = 0; f < floors; f++) {
    const fy = y + f * fh;
    panes(b, -0.28, 0.28, fy + fh * 0.25, 0.185, 4, fh * 0.5, '#bfe9ff');
    if (f > 0) {
      b.box(0.7, 0.018, 0.08, 'matte', WHITE, { y: fy, z: 0.21 });
      b.box(0.7, fh * 0.28, 0.01, 'gloss', f % 2 ? color : shade(color, 1.2), { y: fy + 0.018, z: 0.25 });
    }
  }
  b.box(0.7, 0.03, 0.46, 'matte', color, { y: y + floors * fh, z: -0.03 });
  palm(b, -0.38, 0.32, y, 0.3, 0.7);
  return b.finish();
};

/** 12 Beach Resort: a curved hotel with tiered terraces, a pool and palms. */
const resort: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const levels = 6;
  const lh = Math.max(0.16, (H - 0.3) / levels);
  for (let i = 0; i < levels; i++) {
    const w = 0.84 - i * 0.07;
    const d = 0.34 - i * 0.025;
    const ly = y + i * lh;
    b.box(w, lh, d, 'plaster', WHITE, { y: ly, z: -0.1 + i * 0.012 });
    panes(b, -w / 2 + 0.05, w / 2 - 0.05, ly + lh * 0.25, -0.1 + i * 0.012 + d / 2 + 0.008, 6, lh * 0.45, '#bfe9ff');
    b.box(w + 0.03, 0.02, d + 0.06, 'matte', i % 2 ? color : shade(color, 1.15), { y: ly + lh - 0.01, z: -0.1 + i * 0.012 });
  }
  b.box(0.5, 0.012, 0.12, 'gloss', '#38c9e6', { y, z: 0.3 });
  palm(b, -0.36, 0.3, y, 0.3, 0.7);
  palm(b, 0.36, 0.3, y, 0.26, 0.65);
  return b.finish();
};

/** 13 Palm Hotel: a tower wrapped in green terraces, a palm grove on the roof. */
const palmHotel: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const h = Math.max(1.2, H - 0.45);
  const floors = Math.round(h / 0.13);
  const fh = h / floors;
  b.box(0.44, h, 0.44, 'window', '#cfeef3', { y });
  for (let f = 1; f < floors; f++) {
    const fy = y + f * fh;
    const w = f % 2 ? 0.56 : 0.5;
    b.box(w, 0.02, w, 'matte', WHITE, { y: fy });
    if (f % 3 === 0) b.box(w - 0.02, 0.03, w - 0.02, 'matte', '#46b05a', { y: fy + 0.02 });
  }
  for (const s of [-1, 1]) b.box(0.05, h, 0.05, 'gloss', color, { y, x: s * 0.22, z: 0.22 });
  b.box(0.52, 0.04, 0.52, 'gloss', color, { y: y + h });
  palm(b, -0.12, -0.08, y + h + 0.04, 0.22, 0.6);
  palm(b, 0.13, 0.06, y + h + 0.04, 0.26, 0.65);
  return b.finish();
};

/** 14 Sail Tower: a tall white sail-shaped hotel with a coloured spine. */
const sailTower: Build = (H, color) => {
  const b = new Builder();
  const y = water(b, base(b, color));
  b.cyl(0.36, 0.38, 0.05, 'plaster', WHITE, { y }, 20);
  const h = Math.max(1.4, H - 0.4);
  const sail: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    sail.push([(-0.04 - Math.sin(t * Math.PI) * 0.2 + t * 0.05) * 1.6, (-0.18 + t * 0.36) * 1.5]);
  }
  sail.push([0.12, 0.27], [0.12, -0.27]);
  // Stacked slices of the sail outline, tapering toward the top.
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const sh = h / steps;
    const k = 1 - t0 * 0.6;
    b.extrude(sail.map(([x, z]) => [x * k + 0.02, z * k]), sh * 1.01, 'window', i % 2 ? '#e8f4ff' : '#f6fbff', { y: y + 0.05 + i * sh });
  }
  b.box(0.06, h + 0.25, 0.1, 'gloss', color, { y: y + 0.05, x: 0.15 });
  b.cyl(0.14, 0.14, 0.02, 'gloss', color, { y: y + 0.05 + h * 0.72, x: 0.26 }, 16);
  b.cone(0.03, 0.3, 'gloss', color, { y: y + 0.3 + h, x: 0.15 }, 6);
  return b.finish();
};

/** 15 Lagoon Resort: a round tower rising from a lagoon ringed by bungalows. */
const lagoonResort: Build = (H, color) => {
  const b = new Builder();
  const y = water(b, base(b, color));
  const h = Math.max(1.5, H - 0.45);
  b.cyl(0.2, 0.26, h, 'window', '#d5f2f7', { y }, 16);
  for (let i = 1; i < 8; i++) b.cyl(0.25 - i * 0.006, 0.25 - i * 0.006, 0.02, 'gloss', color, { y: y + (h * i) / 8 }, 16);
  b.cyl(0.24, 0.2, 0.06, 'gloss', color, { y: y + h }, 16);
  b.cone(0.14, 0.24, 'roof', shade(color, 1.2), { y: y + h + 0.06 }, 16);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const x = Math.sin(a) * 0.37;
    const z = Math.cos(a) * 0.37;
    b.box(0.09, 0.07, 0.09, 'wood', '#f3e2c3', { x, z, y });
    thatch(b, 0.13, 0.13, 0.08, y + 0.07, THATCH, false, { x, z });
  }
  return b.finish();
};

/** 16 Coral Palace: a seaside palace with coral domes and minaret towers. */
const coralPalace: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const h = Math.max(0.6, (H - 0.6) * 0.45);
  b.box(0.62, h * 0.5, 0.5, 'plaster', '#fff1e6', { y });
  b.box(0.42, h * 0.45, 0.36, 'plaster', '#ffe4d1', { y: y + h * 0.5 });
  b.sphere(0.2, 'gloss', color, { y: y + h * 0.95, sy: 1.25 }, 18);
  b.cone(0.03, 0.22, 'gloss', '#ffd84d', { y: y + h * 0.95 + 0.22 }, 8);
  for (const [x, z] of [[-0.33, -0.27], [0.33, -0.27], [-0.33, 0.27], [0.33, 0.27]] as const) {
    const th = h * 1.6;
    b.cyl(0.055, 0.065, th, 'plaster', '#fff1e6', { x, z, y }, 10);
    b.sphere(0.075, 'gloss', shade(color, 1.15), { x, z, y: y + th + 0.03, sy: 1.3 }, 12);
    b.cone(0.012, 0.12, 'gloss', '#ffd84d', { x, z, y: y + th + 0.1 }, 6);
  }
  panes(b, -0.24, 0.24, y + h * 0.1, 0.255, 3, h * 0.25, '#ffd8a8');
  b.box(0.14, h * 0.32, 0.02, 'door', shade(color, 0.7), { y, z: 0.255 });
  return b.finish();
};

/** 17 Island Citadel: a floating island with a beach, palms and a villa. */
const islandCitadel: Build = (H, color) => {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.3, 0.34, 0.02, 'glow', '#7ff3ff', { y: y0 }, 24);
  const lift = Math.max(0.35, H * 0.3);
  b.animated(
    (s) => {
      s.cyl(0.43, 0.08, 0.34, 'matte', '#c9a77a', { y: -0.34 }, 10);
      s.cyl(0.45, 0.43, 0.05, 'plaster', SAND, { y: 0 }, 20);
      s.cyl(0.18, 0.18, 0.012, 'gloss', '#38c9e6', { y: 0.05, x: 0.14, z: 0.14 }, 16);
      s.box(0.34, 0.2, 0.26, 'plaster', WHITE, { y: 0.05, x: -0.08, z: -0.1 });
      s.box(0.26, 0.14, 0.012, 'pane', '#bfe9ff', { y: 0.08, x: -0.08, z: 0.034 });
      s.box(0.4, 0.03, 0.32, 'matte', color, { y: 0.25, x: -0.08, z: -0.1 });
      s.cyl(0.07, 0.08, 0.42, 'plaster', WHITE, { y: 0.05, x: 0.22, z: -0.2 }, 10);
      s.sphere(0.09, 'gloss', color, { y: 0.48, x: 0.22, z: -0.2, sy: 1.2 }, 12);
      palm(s, -0.32, 0.18, 0.05, 0.32, 0.8);
      palm(s, 0.33, 0.1, 0.05, 0.26, 0.7);
      palm(s, -0.05, 0.3, 0.05, 0.22, 0.6);
    },
    { type: 'bob', amp: 0.035, speed: 1.4 },
    { y: y0 + lift },
  );
  return b.finish();
};

/** 18 Paradise Spire: a pearl tower on a lagoon with glowing rings and a light beam. */
const paradiseSpire: Build = (H, color) => {
  const b = new Builder();
  const y0 = water(b, base(b, '#a9f0ff'), 0.46, '#38c9e6');
  b.cyl(0.32, 0.36, 0.06, 'plaster', WHITE, { y: y0 }, 24);
  const h = Math.max(1.8, H - 0.6);
  b.cyl(0.05, 0.16, h, 'gloss', color, { y: y0 + 0.06 }, 14);
  for (let i = 1; i <= 4; i++) b.torus(0.17 - i * 0.025, 0.012, 'glow', '#7ff3ff', { y: y0 + 0.06 + (h * i) / 5 });
  b.extrude(star(8, 0.3, 0.14), 0.02, 'gloss', '#ffffff', { y: y0 + 0.06 + h * 0.35 });
  b.sphere(0.09, 'gloss', '#fff6e0', { y: y0 + 0.06 + h }, 14);
  b.cyl(0.08, 0.04, 8, 'beam', '#9ff3ff', { y: y0 + 0.1 + h }, 12, true);
  palm(b, -0.36, 0.22, y0 + 0.06, 0.3, 0.75);
  palm(b, 0.36, 0.22, y0 + 0.06, 0.26, 0.7);
  return b.finish();
};

export const BEACH: Build[] = [
  sandcastle, beachHut, lifeguard, tiki, surfShack, cottage, stiltHouse, overwater, bungalowPier,
  poolVilla, seasideApts, resort, palmHotel, sailTower, lagoonResort, coralPalace, islandCitadel, paradiseSpire,
];
