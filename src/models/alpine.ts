import { Builder, base, shade } from './kit';
import { chimney } from './parts';
import { panes, pine, posts, snowGable } from './themekit';

/**
 * Alpine Peaks lineup: woodpile to summit observatory. Log cabins grow into
 * luxury lodges and mountain villas, then castles and peaks.
 */
type Build = (H: number, color: string) => ReturnType<Builder['finish']>;

const SNOW = '#f4f8ff';
const LOG = '#9a6a43';
const STONE = '#9aa3ad';
const GLASS = '#cdeaff';

function snow(b: Builder, y: number, r = 0.4) {
  b.cyl(r, r + 0.02, 0.02, 'matte', SNOW, { y }, 24);
  return y + 0.02;
}

/** Log walls: alternating horizontal logs on all four sides. */
function logWalls(b: Builder, w: number, d: number, n: number, y: number, color = LOG, at: { x?: number; z?: number } = {}) {
  const x = at.x ?? 0;
  const z = at.z ?? 0;
  const lr = 0.03;
  for (let i = 0; i < n; i++) {
    const ly = y + lr + i * lr * 2;
    const c = i % 2 ? color : shade(color, 1.12);
    b.cyl(lr, lr, w + 0.06, 'wood', c, { y: ly, x: x - (w + 0.06) / 2, z: z + d / 2 - lr, rz: -Math.PI / 2 }, 8);
    b.cyl(lr, lr, w + 0.06, 'wood', c, { y: ly, x: x - (w + 0.06) / 2, z: z - d / 2 + lr, rz: -Math.PI / 2 }, 8);
  }
  b.box(w - 0.02, n * lr * 2, d - 0.04, 'wood', shade(color, 0.9), { x, z, y });
  return y + n * lr * 2;
}

/** Gable roof in a colour with a snow cap. */
function snowRoof(b: Builder, w: number, h: number, d: number, y: number, color: string, at: { x?: number; z?: number } = {}, ry = 0) {
  b.gable(w, h, d, 'roof', color, { x: at.x ?? 0, z: at.z ?? 0, y, ry }, 0.06);
  snowGable(b, w + 0.08, h, d + 0.1, { x: at.x, z: at.z, y: y + 0.004 }, ry);
}

/** A rocky crag (stacked, offset frusta). */
function crag(b: Builder, r: number, h: number, y: number, color = STONE) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const rr = r * (1 - t * 0.7);
    b.cyl(rr * 0.8, rr, h / n + 0.01, 'matte', i % 2 ? color : shade(color, 0.88), { y: y + (h * i) / n, x: Math.sin(i * 2.1) * 0.03, z: Math.cos(i * 1.7) * 0.03 }, 7);
  }
}

/** 1 Woodpile: stacked firewood under a little tarp roof. */
const woodpile: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const rows = [4, 3, 2];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.13;
      b.cyl(0.06, 0.06, 0.4, 'wood', i % 2 ? '#b07a4c' : '#c48a57', { x, y: y + 0.06 + r * 0.11, z: -0.2, rx: Math.PI / 2 }, 9);
    }
  });
  b.box(0.62, 0.025, 0.46, 'matte', color, { y: y + 0.34, rx: 0.1 });
  posts(b, [[-0.28, -0.18], [0.28, -0.18]], y, 0.34, '#6d4c33', 0.015);
  b.box(0.1, 0.12, 0.1, 'wood', '#c48a57', { x: 0.3, y, z: 0.28 });
  b.box(0.02, 0.1, 0.06, 'gloss', '#cfd8dc', { x: 0.3, y: y + 0.12, z: 0.28, rz: 0.4 });
  return b.finish();
};

/** 2 Tent: a ridge tent with a campfire. */
const tent: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  b.gable(0.56, 0.32, 0.5, 'matte', color, { y, z: -0.04, ry: Math.PI / 2 }, 0.0);
  b.gable(0.2, 0.18, 0.2, 'matte', shade(color, 0.55), { y, z: 0.17, ry: Math.PI / 2 }, 0.0);
  for (let i = 0; i < 3; i++) b.cyl(0.015, 0.015, 0.14, 'wood', '#6d4c33', { x: 0.28, z: 0.28, y: y + 0.01, rz: 1.2, ry: (i * Math.PI * 2) / 3 }, 5);
  b.cone(0.045, 0.1, 'glow', '#ffb347', { x: 0.28, z: 0.28, y: y + 0.01 }, 7);
  pine(b, -0.32, -0.26, y, 0.32);
  return b.finish();
};

/** 3 Hunter's Hut: a small plank hut with a snowy roof. */
const hunterHut: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  b.box(0.5, 0.3, 0.42, 'wood', '#a77850', { y, z: -0.02 });
  snowRoof(b, 0.5, 0.2, 0.42, y + 0.3, color, { z: -0.02 });
  b.box(0.14, 0.22, 0.02, 'door', '#5a3a22', { y, x: -0.1, z: 0.195 });
  b.box(0.12, 0.1, 0.02, 'pane', '#fff2cc', { y: y + 0.12, x: 0.13, z: 0.195 });
  b.box(0.16, 0.025, 0.02, 'matte', color, { y: y + 0.1, x: 0.13, z: 0.205 });
  pine(b, 0.34, -0.24, y, 0.3);
  return b.finish();
};

/** 4 A-Frame Cabin: a steep triangle roof to the ground with a glass gable. */
const aFrame: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  b.gable(0.56, 0.5, 0.56, 'roof', color, { y, ry: Math.PI / 2 }, 0.04);
  snowGable(b, 0.62, 0.5, 0.6, { y: y + 0.01 }, Math.PI / 2);
  const tri: [number, number][] = [[-0.22, 0], [0.22, 0], [0, -0.4]];
  b.extrude(tri, 0.014, 'pane', '#ffe9b0', { y: y + 0.02, z: 0.285, rx: Math.PI / 2 });
  b.box(0.1, 0.18, 0.02, 'door', '#5a3a22', { y, z: 0.3 });
  b.box(0.4, 0.025, 0.14, 'wood', '#a77850', { y, z: 0.36 });
  pine(b, -0.36, -0.2, y, 0.28);
  return b.finish();
};

/** 5 Log Cabin: classic log walls, a snowy roof and a smoking chimney. */
const logCabin: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const top = logWalls(b, 0.6, 0.46, 5, y);
  snowRoof(b, 0.6, 0.24, 0.46, top, color);
  b.box(0.13, 0.22, 0.02, 'door', shade(color, 0.7), { y, z: 0.235 });
  b.box(0.12, 0.11, 0.02, 'pane', '#fff2cc', { y: y + 0.12, x: 0.2, z: 0.235 });
  b.box(0.12, 0.11, 0.02, 'pane', '#fff2cc', { y: y + 0.12, x: -0.2, z: 0.235 });
  chimney(b, -0.2, -0.08, top + 0.04, 0.22);
  return b.finish();
};

/** 6 Big Log Cabin: two log floors, a porch and a red roof. */
const bigLogCabin: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const top = logWalls(b, 0.66, 0.44, 7, y, LOG, { z: -0.04 });
  snowRoof(b, 0.66, 0.26, 0.44, top, color, { z: -0.04 });
  b.box(0.7, 0.025, 0.16, 'wood', '#b07a4c', { y, z: 0.25 });
  posts(b, [[-0.32, 0.31], [0, 0.31], [0.32, 0.31]], y, 0.2, '#7a5536', 0.016);
  b.box(0.74, 0.02, 0.2, 'roof', shade(color, 0.85), { y: y + 0.2, z: 0.25, rx: 0.15 });
  panes(b, -0.28, 0.28, y + 0.08, 0.185, 3, 0.1, '#fff2cc');
  panes(b, -0.28, 0.28, y + 0.27, 0.185, 3, 0.09, '#fff2cc');
  chimney(b, 0.22, -0.12, top + 0.04, 0.22);
  return b.finish();
};

/** 7 Luxury Log Cabin: logs and a full glass front, with a steaming hot tub. */
const luxuryCabin: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const top = logWalls(b, 0.62, 0.42, 7, y, '#8a5a36', { x: -0.04, z: -0.06 });
  b.box(0.44, 0.38, 0.014, 'pane', '#ffe7a8', { y: y + 0.02, x: -0.04, z: 0.155 });
  b.box(0.46, 0.02, 0.03, 'wood', '#5a3a22', { y: y + 0.2, x: -0.04, z: 0.16 });
  snowRoof(b, 0.62, 0.3, 0.42, top, color, { x: -0.04, z: -0.06 });
  b.cyl(0.11, 0.11, 0.07, 'wood', '#7a5536', { y, x: 0.3, z: 0.28 }, 14);
  b.cyl(0.09, 0.09, 0.012, 'gloss', '#59d4e8', { y: y + 0.065, x: 0.3, z: 0.28 }, 14);
  b.animated((s) => s.sphere(0.05, 'smoke', '#ffffff', {}, 7), { type: 'puff', speed: 0.5, rise: 0.25 }, { x: 0.3, y: y + 0.09, z: 0.28 });
  pine(b, -0.38, 0.26, y, 0.26);
  return b.finish();
};

/** 8 Chalet: a Swiss chalet, plaster ground floor, timber upstairs, a wide roof and flower boxes. */
const chalet: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  b.box(0.64, 0.2, 0.46, 'plaster', '#fbf6ec', { y, z: -0.03 });
  b.box(0.66, 0.2, 0.48, 'wood', '#a06a3e', { y: y + 0.2, z: -0.03 });
  panes(b, -0.25, 0.25, y + 0.06, 0.205, 3, 0.09, '#fff2cc');
  panes(b, -0.25, 0.25, y + 0.26, 0.215, 3, 0.09, '#fff2cc');
  b.box(0.7, 0.02, 0.1, 'wood', '#7a4b28', { y: y + 0.2, z: 0.25 });
  b.box(0.7, 0.06, 0.012, 'wood', '#7a4b28', { y: y + 0.22, z: 0.3 });
  for (let i = 0; i < 3; i++) b.box(0.13, 0.03, 0.04, 'matte', i % 2 ? '#ff5e8a' : '#ffd84d', { y: y + 0.03, x: -0.25 + i * 0.25, z: 0.22 });
  b.gable(0.66, 0.2, 0.48, 'roof', color, { y: y + 0.4, z: -0.03 }, 0.1);
  snowGable(b, 0.76, 0.2, 0.6, { y: y + 0.404, z: -0.03 });
  return b.finish();
};

/** 9 Ski Lodge: a long lodge with a stone base, ski rack and lift pole. */
const skiLodge: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  b.box(0.76, 0.14, 0.4, 'brick', '#a7a39c', { y, z: -0.06 });
  const top = logWalls(b, 0.76, 0.4, 4, y + 0.14, '#a06a3e', { z: -0.06 });
  panes(b, -0.32, 0.32, y + 0.03, 0.145, 5, 0.08, '#fff2cc');
  panes(b, -0.32, 0.32, y + 0.17, 0.145, 5, 0.1, '#fff2cc');
  snowRoof(b, 0.76, 0.26, 0.4, top, color, { z: -0.06 });
  b.box(0.28, 0.02, 0.06, 'wood', '#6d4c33', { y: y + 0.14, x: -0.2, z: 0.22 });
  const skis = [color, '#4fc3f7', '#ffd84d', '#e53935'];
  skis.forEach((c, i) => b.box(0.025, 0.24, 0.012, 'gloss', c, { y, x: -0.31 + i * 0.07, z: 0.25, rx: -0.12 }));
  b.cyl(0.015, 0.015, 0.5, 'matte', '#455a64', { y, x: 0.36, z: 0.24 }, 6);
  b.box(0.16, 0.02, 0.02, 'matte', '#455a64', { y: y + 0.48, x: 0.36, z: 0.24 });
  return b.finish();
};

/** 10 Mountain Villa: timber, stone and glass in stacked modern volumes. */
const mountainVilla: Build = (_H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  b.box(0.7, 0.2, 0.4, 'brick', '#b8b3aa', { y, z: -0.06 });
  b.box(0.56, 0.18, 0.014, 'pane', '#ffe7a8', { y: y + 0.01, z: 0.145 });
  b.box(0.52, 0.22, 0.42, 'wood', '#8a5a36', { y: y + 0.2, x: 0.08, z: -0.02 });
  b.box(0.4, 0.17, 0.014, 'pane', GLASS, { y: y + 0.225, x: 0.08, z: 0.195 });
  b.box(0.6, 0.03, 0.5, 'matte', color, { y: y + 0.42, x: 0.08, z: -0.02, rz: 0.12 });
  snowGable(b, 0.5, 0.06, 0.6, { y: y + 0.42, x: 0.08, z: -0.02 }, Math.PI / 2);
  b.box(0.78, 0.03, 0.46, 'matte', shade(color, 0.85), { y: y + 0.2, z: -0.04 });
  b.box(0.2, 0.02, 0.012, 'glow', '#fff2cc', { y: y + 0.18, x: -0.25, z: 0.19 });
  pine(b, -0.34, 0.3, y, 0.28);
  pine(b, 0.38, 0.3, y, 0.22);
  return b.finish();
};

/** 11 Grand Chalet: four timber floors of balconies under a huge snowy roof. */
const grandChalet: Build = (H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const floors = 4;
  const fh = Math.max(0.16, (H - 0.4) / floors);
  b.box(0.66, fh, 0.46, 'brick', '#c9c4ba', { y, z: -0.03 });
  for (let f = 0; f < floors; f++) {
    const fy = y + f * fh;
    if (f > 0) b.box(0.66, fh, 0.46, f % 2 ? 'wood' : 'plaster', f % 2 ? '#a06a3e' : '#fbf6ec', { y: fy, z: -0.03 });
    panes(b, -0.26, 0.26, fy + fh * 0.25, 0.205, 4, fh * 0.5, '#fff2cc');
    if (f > 0) {
      b.box(0.72, 0.02, 0.1, 'wood', '#6d4122', { y: fy, z: 0.25 });
      b.box(0.72, fh * 0.28, 0.012, 'wood', f === floors - 1 ? color : '#6d4122', { y: fy + 0.02, z: 0.3 });
    }
  }
  b.gable(0.66, 0.3, 0.46, 'roof', color, { y: y + floors * fh, z: -0.03 }, 0.1);
  snowGable(b, 0.76, 0.3, 0.6, { y: y + floors * fh + 0.004, z: -0.03 });
  return b.finish();
};

/** 12 Alpine Hotel: a grand hotel with a steep mansard roof and a corner tower. */
const alpineHotel: Build = (H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const h = Math.max(0.8, H - 0.55);
  const floors = Math.round(h / 0.15);
  const fh = h / floors;
  b.box(0.7, h, 0.4, 'plaster', '#fbf3e4', { y, z: -0.06 });
  for (let f = 0; f < floors; f++) panes(b, -0.3, 0.3, y + f * fh + fh * 0.25, 0.145, 5, fh * 0.5, '#fff2cc');
  for (let f = 1; f < floors; f++) b.box(0.72, 0.012, 0.42, 'matte', shade(color, 0.8), { y: y + f * fh, z: -0.06 });
  b.pyramid(0.76, 0.32, 0.46, 'roof', color, { y: y + h, z: -0.06 });
  b.box(0.5, 0.08, 0.3, 'roof', color, { y: y + h, z: -0.06 });
  b.cyl(0.1, 0.1, h + 0.15, 'plaster', '#fbf3e4', { y, x: 0.33, z: 0.16 }, 12);
  b.cone(0.13, 0.3, 'roof', shade(color, 0.85), { y: y + h + 0.15, x: 0.33, z: 0.16 }, 12);
  b.box(0.12, 0.08, 0.008, 'matte', color, { y: y + h - 0.05, x: 0, z: 0.15 });
  return b.finish();
};

/** 13 Cliff Villa: a glass villa cantilevered off a rocky crag. */
const cliffVilla: Build = (H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const h = Math.max(0.9, H - 0.6);
  crag(b, 0.4, h, y);
  b.cone(0.16, 0.2, 'matte', SNOW, { y: y + h - 0.02, x: 0.1 }, 7);
  const vy = y + h * 0.62;
  b.box(0.62, 0.16, 0.36, 'pane', GLASS, { y: vy, x: 0.04, z: 0.04 });
  b.box(0.66, 0.03, 0.4, 'matte', color, { y: vy + 0.16, x: 0.04, z: 0.04 });
  b.box(0.66, 0.03, 0.4, 'matte', '#5a6470', { y: vy - 0.03, x: 0.04, z: 0.04 });
  b.box(0.42, 0.13, 0.3, 'wood', '#8a5a36', { y: vy + 0.19, x: -0.06, z: -0.02 });
  b.box(0.3, 0.09, 0.012, 'pane', '#ffe7a8', { y: vy + 0.21, x: -0.06, z: 0.135 });
  b.box(0.48, 0.03, 0.36, 'matte', shade(color, 1.15), { y: vy + 0.32, x: -0.06, z: -0.02 });
  pine(b, -0.3, 0.3, y, 0.3);
  pine(b, 0.34, 0.3, y, 0.24);
  return b.finish();
};

/** 14 Peak Resort: buildings terraced up a snowy mountain. */
const peakResort: Build = (H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const h = Math.max(1.2, H - 0.3);
  b.cone(0.34, h, 'matte', '#8b95a1', { y }, 9);
  b.cone(0.15, h * 0.44, 'matte', SNOW, { y: y + h * 0.56 + 0.005 }, 9);
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const sy = y + h * t * 0.7;
    const r = 0.34 * (1 - t * 0.7) + 0.02;
    const a = -0.4 + (i % 2 ? 0.9 : -0.6) + i * 0.15;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    b.box(0.08, sy - y + 0.01, 0.08, 'matte', '#6f7a86', { x, z, y });
    b.box(0.22, 0.12, 0.16, 'wood', '#a06a3e', { x, z, y: sy, ry: a });
    b.gable(0.22, 0.08, 0.16, 'roof', color, { x, z, y: sy + 0.12, ry: a }, 0.03);
    b.box(0.12, 0.05, 0.012, 'pane', '#fff2cc', { x: x + Math.sin(a) * 0.081, z: z + Math.cos(a) * 0.081, y: sy + 0.04, ry: a });
  }
  b.cyl(0.012, 0.012, 0.25, 'matte', '#455a64', { y: y + h - 0.02 }, 5);
  b.box(0.14, 0.08, 0.006, 'matte', color, { y: y + h + 0.13, x: 0.07 });
  return b.finish();
};

/** 15 Cable Car Station: a tall station tower with a gondola gliding along the cable. */
const cableCar: Build = (H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const h = Math.max(1.3, H - 0.5);
  b.box(0.66, h * 0.3, 0.5, 'brick', '#b8b3aa', { y, z: -0.02 });
  panes(b, -0.25, 0.25, y + h * 0.08, 0.235, 3, h * 0.12, '#fff2cc');
  for (const sx of [-1, 1]) {
    b.box(0.08, h * 0.7, 0.08, 'matte', '#5a6470', { y: y + h * 0.3, x: sx * 0.16, z: -0.06 });
    for (let i = 1; i < 6; i++) b.box(0.03, 0.03, 0.2, 'matte', '#455a64', { y: y + h * 0.3 + (h * 0.7 * i) / 6, x: sx * 0.16, z: -0.06, rx: 0.7 });
  }
  for (let i = 1; i < 6; i++) b.box(0.32, 0.025, 0.03, 'matte', '#455a64', { y: y + h * 0.3 + (h * 0.7 * i) / 6, z: -0.06 });
  const ty = y + h;
  b.box(0.7, 0.2, 0.42, 'wood', '#8a5a36', { y: ty, z: -0.06 });
  b.box(0.56, 0.12, 0.014, 'pane', '#ffe7a8', { y: ty + 0.04, z: 0.152 });
  b.gable(0.7, 0.2, 0.42, 'roof', color, { y: ty + 0.2, z: -0.06 }, 0.06);
  snowGable(b, 0.78, 0.2, 0.52, { y: ty + 0.204, z: -0.06 });
  b.cyl(0.006, 0.006, 1.2, 'matte', '#263238', { y: ty + 0.08, x: 0.3, z: 0.0, rz: -1.25 }, 4);
  b.animated(
    (s) => {
      s.cyl(0.004, 0.004, 0.1, 'matte', '#263238', {}, 4);
      s.box(0.13, 0.11, 0.1, 'gloss', color, { y: -0.12 }, 0.02);
      s.box(0.1, 0.05, 0.102, 'pane', GLASS, { y: -0.07 });
    },
    { type: 'bob', amp: 0.06, speed: 0.9 },
    { y: ty - 0.02, x: 0.5 },
  );
  return b.finish();
};

/** 16 Mountain Castle: white towers with pointed roofs on a crag. */
const castle: Build = (H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const h = Math.max(1.2, H - 0.6);
  crag(b, 0.42, h * 0.3, y);
  const cy = y + h * 0.3;
  b.box(0.5, h * 0.3, 0.32, 'plaster', '#f4f1ea', { y: cy, z: -0.04 });
  panes(b, -0.2, 0.2, cy + h * 0.08, 0.125, 3, h * 0.12, '#fff2cc');
  b.gable(0.5, 0.16, 0.32, 'roof', color, { y: cy + h * 0.3, z: -0.04 }, 0.04);
  const towers: [number, number, number, number][] = [[-0.26, 0.12, 0.08, 0.55], [0.26, 0.1, 0.07, 0.45], [0.08, -0.18, 0.1, 0.7], [-0.2, -0.18, 0.06, 0.4]];
  for (const [x, z, r, k] of towers) {
    const th = h * k;
    b.cyl(r, r * 1.05, th, 'plaster', '#f4f1ea', { x, z, y: cy }, 12);
    b.cyl(r * 1.15, r, 0.04, 'plaster', '#e6e0d4', { x, z, y: cy + th }, 12);
    b.cone(r * 1.2, r * 3.2, 'roof', color, { x, z, y: cy + th + 0.04 }, 12);
    b.box(r * 0.5, r * 0.9, 0.01, 'pane', '#fff2cc', { x, z: z + r + 0.003, y: cy + th * 0.6 });
  }
  return b.finish();
};

/** 17 Glacier Palace: an ice palace of glassy crystal spires. */
const glacierPalace: Build = (H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, color));
  const h = Math.max(1.4, H - 0.5);
  b.cyl(0.42, 0.44, 0.08, 'gloss', '#d7f2ff', { y }, 8);
  const spires: [number, number, number, number][] = [[0, -0.05, 0.16, 1], [-0.24, 0.05, 0.1, 0.6], [0.24, 0.05, 0.1, 0.65], [-0.12, -0.24, 0.08, 0.5], [0.14, -0.26, 0.08, 0.55], [0, 0.22, 0.08, 0.35]];
  for (const [x, z, r, k] of spires) {
    const sh = h * k;
    b.cyl(r * 0.7, r, sh * 0.75, 'gloss', '#cbeeff', { x, z, y: y + 0.08 }, 6);
    b.cone(r * 0.7, sh * 0.25, 'gloss', '#eaf9ff', { x, z, y: y + 0.08 + sh * 0.75 }, 6);
    b.torus(r * 0.85, 0.008, 'glow', color, { x, z, y: y + 0.08 + sh * 0.5 });
  }
  b.box(0.16, 0.2, 0.02, 'door', color, { y: y + 0.08, z: 0.28 });
  return b.finish();
};

/** 18 Summit Observatory: an observatory dome on the peak, its telescope beam reaching up. */
const observatory: Build = (H, color) => {
  const b = new Builder();
  const y = snow(b, base(b, '#a9c4ff'));
  const h = Math.max(1.8, H - 0.7);
  b.cone(0.48, h, 'matte', '#7d8794', { y }, 10);
  b.cone(0.24, h * 0.5, 'matte', SNOW, { y: y + h * 0.5 + 0.005 }, 10);
  const top = y + h - 0.08;
  b.cyl(0.13, 0.15, 0.1, 'plaster', '#ffffff', { y: top }, 16);
  b.sphere(0.13, 'gloss', color, { y: top + 0.1 }, 16);
  b.box(0.03, 0.14, 0.02, 'matte', '#263238', { y: top + 0.14, z: 0.11, rx: -0.5 });
  b.torus(0.17, 0.012, 'glow', '#8fd8ff', { y: top + 0.04 });
  b.cyl(0.08, 0.04, 8, 'beam', '#8fd8ff', { y: top + 0.2 }, 12, true);
  pine(b, -0.34, 0.26, y, 0.26);
  pine(b, 0.36, 0.22, y, 0.22);
  return b.finish();
};

export const ALPINE: Build[] = [
  woodpile, tent, hunterHut, aFrame, logCabin, bigLogCabin, luxuryCabin, chalet, skiLodge,
  mountainVilla, grandChalet, alpineHotel, cliffVilla, peakResort, cableCar, castle, glacierPalace, observatory,
];
