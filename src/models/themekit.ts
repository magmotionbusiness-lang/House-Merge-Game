import { Builder, shade } from './kit';
import type { MatKey } from './materials';

/** Shared props for the themed building lineups (beach, alpine, sweet, neon). */

/** Star outline (n points) in the xz plane, for palm crowns, flowers and sparkles. */
export function star(n: number, rOut: number, rIn: number, rot = 0): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? rIn : rOut;
    pts.push([Math.sin(a) * r, Math.cos(a) * r]);
  }
  return pts;
}

/** A palm tree: a slightly leaning ringed trunk and a two-layer star crown seen from above. */
export function palm(b: Builder, x: number, z: number, y: number, h = 0.3, s = 1) {
  const segs = 4;
  const lean = 0.04 * s;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    b.cyl(0.022 * s, 0.028 * s, h / segs + 0.004, 'wood', i % 2 ? '#a77b4f' : '#8f6640', { x: x + lean * t * t, z, y: y + (h * i) / segs }, 7);
  }
  const top = y + h;
  const tx = x + lean;
  b.extrude(star(6, 0.17 * s, 0.045 * s, 0.3), 0.014 * s, 'matte', '#2f9e44', { x: tx, z, y: top - 0.01 });
  b.extrude(star(5, 0.12 * s, 0.035 * s, 0.9), 0.014 * s, 'matte', '#51c463', { x: tx, z, y: top + 0.006 });
  b.sphere(0.022 * s, 'matte', '#6b4a2b', { x: tx, z: z + 0.02 * s, y: top - 0.02 }, 6);
}

/** A pine tree: stacked cones, optional snow tips. */
export function pine(b: Builder, x: number, z: number, y: number, h = 0.3, snow = true) {
  b.cyl(0.018, 0.022, h * 0.2, 'wood', '#6d4c33', { x, z, y }, 6);
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const r = h * (0.32 - i * 0.07);
    const ly = y + h * (0.15 + i * 0.24);
    b.cone(r, h * 0.42, 'matte', i % 2 ? '#2e7d4f' : '#256b43', { x, z, y: ly }, 8);
    if (snow) b.cone(r * 0.45, h * 0.19, 'matte', '#f7fbff', { x, z, y: ly + h * 0.23 }, 8);
  }
}

/** A box wrapped in vertical stripes of two colours (beach huts, candy shops, awnings). */
export function stripedBox(b: Builder, w: number, h: number, d: number, a: string, c: string, at: { x?: number; y: number; z?: number }, n = 6, mat: MatKey = 'wood') {
  const x0 = at.x ?? 0;
  const z0 = at.z ?? 0;
  b.box(w - 0.008, h, d, mat, c, { x: x0, y: at.y, z: z0 });
  const sw = w / n;
  // Stripes stand a hair proud of the block on every side; matching faces would z-fight (flicker) as the piece moves.
  for (let i = 0; i < n; i += 2) b.box(sw, h + 0.008, d + 0.008, mat, a, { x: x0 - w / 2 + sw * (i + 0.5), y: at.y - 0.004, z: z0 });
}

/** Round water patch sitting on the base (lagoons, pools, lakes). */
export function water(b: Builder, y: number, r = 0.46, color = '#3fd0e0') {
  b.cyl(r, r, 0.012, 'gloss', color, { y }, 28);
  b.torus(r - 0.01, 0.008, 'matte', '#e8fbff', { y: y + 0.012 });
  return y + 0.012;
}

/** Thin stilts / pier posts. */
export function posts(b: Builder, pts: [number, number][], y: number, h: number, color = '#7a5536', r = 0.014) {
  for (const [x, z] of pts) b.cyl(r, r, h, 'wood', color, { x, z, y }, 6);
}

/** Lollipop on a stick (sweet town). */
export function lollipop(b: Builder, x: number, z: number, y: number, h: number, color: string, r = 0.06) {
  b.cyl(0.01, 0.01, h, 'matte', '#fffaf2', { x, z, y }, 6);
  b.cyl(r, r, 0.03, 'gloss', color, { x, z, y: y + h, rx: Math.PI / 2 }, 16);
  b.torus(r * 0.55, r * 0.13, 'gloss', '#ffffff', { x, z: z + 0.03, y: y + h, rx: Math.PI / 2 });
}

/** Drippy frosting ring around the top edge of a cylinder (cakes, cupcakes). */
export function frosting(b: Builder, r: number, y: number, color: string, drips = 10) {
  b.cyl(r + 0.012, r + 0.012, 0.03, 'gloss', color, { y }, 20);
  for (let i = 0; i < drips; i++) {
    const a = (i / drips) * Math.PI * 2;
    const len = 0.03 + ((i * 7) % 3) * 0.015;
    b.cyl(0.016, 0.012, len, 'gloss', color, { x: Math.sin(a) * (r + 0.008), z: Math.cos(a) * (r + 0.008), y: y - len + 0.01 }, 5);
  }
}

/** Sprinkles scattered on a round top. */
export function sprinkles(b: Builder, r: number, y: number, n = 14) {
  const cols = ['#ff5e8a', '#ffd84d', '#6fd6ff', '#7ee081', '#ffffff', '#b48cff'];
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996;
    const d = Math.sqrt((i + 0.5) / n) * r * 0.85;
    b.box(0.028, 0.012, 0.01, 'gloss', cols[i % cols.length], { x: Math.sin(a) * d, z: Math.cos(a) * d, y, ry: a * 3 });
  }
}

/** Glowing neon outline along the vertical edges and top rim of a box. */
export function neonBox(b: Builder, w: number, h: number, d: number, y: number, glow: string, at: { x?: number; z?: number } = {}) {
  const x = at.x ?? 0;
  const z = at.z ?? 0;
  const t = 0.014;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) b.box(t, h + 0.004, t, 'glow', glow, { x: x + (sx * w) / 2, z: z + (sz * d) / 2, y });
  const ry = y + h - t + 0.003;
  b.box(w + t, t, t, 'glow', glow, { x, z: z + d / 2, y: ry });
  b.box(w + t, t, t, 'glow', glow, { x, z: z - d / 2, y: ry });
  b.box(t, t, d + t * 1.4, 'glow', glow, { x: x - w / 2, z, y: ry - 0.001 });
  b.box(t, t, d + t * 1.4, 'glow', glow, { x: x + w / 2, z, y: ry - 0.001 });
}

/** Horizontal glowing bands around a cylinder (neon towers). */
export function neonRings(b: Builder, r: number, y0: number, h: number, n: number, glow: string) {
  for (let i = 1; i <= n; i++) b.torus(r + 0.004, 0.009, 'glow', glow, { y: y0 + (h * i) / (n + 1) });
}

/** Thatched roof: a cone (round huts) or pyramid (bungalows) with a darker fringe. */
export function thatch(b: Builder, w: number, d: number, h: number, y: number, color: string, round = false, at: { x?: number; z?: number } = {}) {
  const x = at.x ?? 0;
  const z = at.z ?? 0;
  if (round) {
    b.cone(w / 2, h, 'roof', color, { x, z, y }, 14);
    b.cyl(w / 2 + 0.01, w / 2 + 0.02, 0.02, 'matte', shade(color, 0.75), { x, z, y: y - 0.01 }, 14);
  } else {
    b.pyramid(w, h, d, 'roof', color, { x, z, y });
    b.box(w * 0.74, 0.02, d * 0.74, 'matte', shade(color, 0.75), { x, z, y: y - 0.012 });
  }
}

/** Snow layer on a gable roof (alpine). */
export function snowGable(b: Builder, w: number, h: number, d: number, at: { x?: number; y: number; z?: number }, ry = 0) {
  // Only the ridge is snowy, so the roof keeps its tier colour.
  b.gable(w * 0.98, h * 0.3, d * 0.36, 'matte', '#f7fbff', { x: at.x ?? 0, z: at.z ?? 0, y: at.y + h * 0.71, ry }, 0.015);
}

/** Generic window strip of panes on the front (+z) face. */
export function panes(b: Builder, x0: number, x1: number, y: number, z: number, n: number, h = 0.09, color = '#ffffff', mat: MatKey = 'pane') {
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) b.box(step * 0.6, h, 0.014, mat, color, { x: x0 + step * (i + 0.5), y, z });
}
