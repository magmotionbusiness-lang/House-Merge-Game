import * as THREE from 'three';
import { Builder, base, shade } from './kit';
import { frosting, lollipop, panes, sprinkles, star, stripedBox } from './themekit';

/**
 * Sweet Town lineup: sugar cube to rainbow spire. Gingerbread, cake, candy
 * and ice cream, still clearly houses with doors and windows.
 */
type Build = (H: number, color: string) => ReturnType<Builder['finish']>;

const GINGER = '#b8743f';
const ICING = '#fffaf2';
const CREAM = '#fff1d6';
const CHOC = '#6b3a22';
const PINK = '#ffb3cf';

function sugarGround(b: Builder, y: number, r = 0.4) {
  b.cyl(r, r + 0.02, 0.02, 'matte', '#ffe0ec', { y }, 24);
  return y + 0.02;
}

/** Icing piping along the top edges of a box. */
function piping(b: Builder, w: number, d: number, y: number, at: { x?: number; z?: number } = {}, color = ICING) {
  const x = at.x ?? 0;
  const z = at.z ?? 0;
  const n = Math.max(3, Math.round(w / 0.07));
  for (let i = 0; i <= n; i++) b.sphere(0.022, 'gloss', color, { x: x - w / 2 + (w * i) / n, z: z + d / 2, y }, 5);
}

/** Gingerbread-style gable roof with icing trim. */
function icedRoof(b: Builder, w: number, h: number, d: number, y: number, color: string, at: { x?: number; z?: number } = {}) {
  b.gable(w, h, d, 'gloss', color, { x: at.x ?? 0, z: at.z ?? 0, y }, 0.06);
  b.gable(w + 0.1, h * 0.3, d * 0.35, 'gloss', ICING, { x: at.x ?? 0, z: at.z ?? 0, y: y + h * 0.7 }, 0.02);
}

/** Gumdrop decoration. */
function gumdrop(b: Builder, x: number, z: number, y: number, color: string, r = 0.04) {
  b.sphere(r, 'gloss', color, { x, z, y: y + r * 0.2, sy: 1.1 }, 8);
}

/** 1 Sugar Cube: a sparkly sugar cube with a candy door. */
const sugarCube: Build = (_H, color) => {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.42, 0.34, 0.42, 'plaster', '#ffffff', { y }, 0.05);
  b.box(0.12, 0.17, 0.02, 'gloss', color, { y, z: 0.215 }, 0.02);
  for (let i = 0; i < 6; i++) b.sphere(0.018, 'gloss', ['#ff5e8a', '#ffd84d', '#6fd6ff'][i % 3], { x: -0.15 + (i % 3) * 0.15, z: -0.1 + Math.floor(i / 3) * 0.2, y: y + 0.34 }, 6);
  return b.finish();
};

/** 2 Cupcake Hut: a cupcake house with a frosting roof and a cherry on top. */
const cupcake: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  b.cyl(0.28, 0.22, 0.24, 'siding', CREAM, { y }, 16);
  b.cyl(0.29, 0.29, 0.03, 'gloss', color, { y: y + 0.23 }, 16);
  b.sphere(0.28, 'gloss', PINK, { y: y + 0.25, sy: 0.6 }, 16);
  sprinkles(b, 0.22, y + 0.4, 10);
  b.sphere(0.05, 'gloss', '#e53935', { y: y + 0.43 }, 10);
  b.box(0.1, 0.15, 0.02, 'door', CHOC, { y, z: 0.235 });
  return b.finish();
};

/** 3 Candy Kiosk: a striped candy shop with an awning and lollipops. */
const kiosk: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  stripedBox(b, 0.5, 0.28, 0.38, color, ICING, { y, z: -0.03 }, 6, 'plaster');
  b.box(0.3, 0.1, 0.014, 'pane', '#fff2cc', { y: y + 0.1, z: 0.165 });
  b.box(0.58, 0.03, 0.18, 'gloss', color, { y: y + 0.24, z: 0.2, rx: 0.3 });
  b.box(0.56, 0.05, 0.42, 'gloss', shade(color, 0.85), { y: y + 0.28, z: -0.03 }, 0.02);
  lollipop(b, 0.33, 0.25, y, 0.22, '#ffd84d', 0.06);
  lollipop(b, -0.33, 0.25, y, 0.18, '#6fd6ff', 0.05);
  return b.finish();
};

/** 4 Gingerbread Cabin: a small gingerbread hut with icing and gumdrops. */
const gingerCabin: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  b.box(0.5, 0.26, 0.4, 'plaster', GINGER, { y });
  piping(b, 0.5, 0.4, y + 0.26);
  icedRoof(b, 0.5, 0.2, 0.4, y + 0.26, color);
  b.box(0.12, 0.18, 0.02, 'gloss', '#ff5e8a', { y, z: 0.205 }, 0.02);
  b.box(0.1, 0.09, 0.02, 'pane', '#fff2cc', { y: y + 0.1, x: 0.15, z: 0.205 });
  for (const [x, c] of [[-0.3, '#7ee081'], [0.3, '#ff5e8a'], [0.2, '#ffd84d']] as const) gumdrop(b, x, 0.3, y, c);
  return b.finish();
};

/** 5 Cookie Cottage: walls of cookies, a chocolate-chip roof. */
const cookieCottage: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  b.box(0.56, 0.3, 0.42, 'plaster', '#e2b072', { y, z: -0.02 });
  for (let i = 0; i < 8; i++) b.sphere(0.018, 'matte', CHOC, { x: -0.24 + (i % 4) * 0.16, y: y + 0.07 + Math.floor(i / 4) * 0.15, z: 0.195 }, 6);
  b.gable(0.56, 0.22, 0.42, 'gloss', color, { y: y + 0.3, z: -0.02 }, 0.06);
  frosting(b, 0.06, y + 0.48, ICING, 0);
  b.cyl(0.1, 0.1, 0.03, 'plaster', '#e2b072', { y, x: 0.33, z: 0.28, rx: Math.PI / 2 }, 14);
  b.box(0.12, 0.18, 0.02, 'door', CHOC, { y, x: -0.08, z: 0.2 });
  b.box(0.12, 0.1, 0.02, 'pane', '#fff2cc', { y: y + 0.12, x: 0.14, z: 0.2 });
  return b.finish();
};

/** 6 Gingerbread House: the classic, two floors, candy-cane posts and icing everywhere. */
const gingerHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  b.box(0.6, 0.36, 0.44, 'plaster', GINGER, { y, z: -0.02 });
  b.box(0.62, 0.02, 0.46, 'gloss', ICING, { y: y + 0.18, z: -0.02 });
  piping(b, 0.6, 0.44, y + 0.36, { z: -0.02 });
  icedRoof(b, 0.6, 0.24, 0.44, y + 0.36, color, { z: -0.02 });
  panes(b, -0.24, 0.24, y + 0.06, 0.205, 3, 0.09, '#fff2cc');
  panes(b, -0.24, 0.24, y + 0.23, 0.205, 3, 0.09, '#fff2cc');
  for (const x of [-0.34, 0.34]) {
    b.cyl(0.018, 0.018, 0.3, 'gloss', ICING, { x, y, z: 0.26 }, 6);
    for (let i = 0; i < 4; i++) b.cyl(0.02, 0.02, 0.025, 'gloss', '#e53935', { x, y: y + 0.04 + i * 0.07, z: 0.26 }, 6);
  }
  gumdrop(b, 0, 0.3, y, '#7ee081', 0.045);
  return b.finish();
};

/** A standing donut ring (smooth torus) facing the camera. */
function donut(b: Builder, r: number, tube: number, at: { x?: number; y: number; z?: number }, dough: string, glaze: string) {
  const g = new THREE.TorusGeometry(r, tube, 9, 24);
  b.add(g, 'plaster', dough, { x: at.x ?? 0, y: at.y + r + tube, z: at.z ?? 0 });
  const t = new THREE.TorusGeometry(r, tube * 0.82, 8, 18, Math.PI * 1.2);
  t.rotateZ(-0.1 * Math.PI);
  b.add(t, 'gloss', glaze, { x: at.x ?? 0, y: at.y + r + tube, z: (at.z ?? 0) + tube * 0.32 });
}

/** 7 Donut House: a giant glazed donut standing up, with a door in the hole. */
const donutHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  donut(b, 0.21, 0.11, { y, z: -0.02 }, '#e2a866', color);
  b.box(0.2, 0.06, 0.2, 'plaster', '#e2a866', { y, z: -0.02 });
  b.box(0.12, 0.2, 0.02, 'door', CHOC, { y, z: 0.02 });
  for (let i = 0; i < 9; i++) {
    const a = 0.3 + (i / 9) * Math.PI * 1.1;
    b.box(0.03, 0.012, 0.012, 'gloss', ['#ffffff', '#ffd84d', '#6fd6ff'][i % 3], { x: Math.cos(a) * 0.21, y: y + 0.32 + Math.sin(a) * 0.21, z: 0.1, rz: a * 2 });
  }
  gumdrop(b, 0.32, 0.28, y, '#7ee081');
  gumdrop(b, -0.32, 0.28, y, '#ffd84d');
  return b.finish();
};

/** 8 Layer Cake Manor: a three-layer cake with windows, frosting drips and candles. */
const layerCake: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  const layers: [number, number, string][] = [[0.42, 0.16, CREAM], [0.33, 0.14, PINK], [0.24, 0.12, CREAM]];
  let ly = y;
  layers.forEach(([r, h, c], i) => {
    b.cyl(r, r, h, 'plaster', c, { y: ly }, 24);
    frosting(b, r, ly + h - 0.01, i === 1 ? ICING : color, 9);
    for (let k = 0; k < 4; k++) {
      const a = -0.6 + k * 0.4;
      b.box(0.06, h * 0.45, 0.014, 'pane', '#fff2cc', { x: Math.sin(a) * (r + 0.004), z: Math.cos(a) * (r + 0.004), y: ly + h * 0.25, ry: a });
    }
    ly += h + 0.02;
  });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    b.cyl(0.012, 0.012, 0.08, 'gloss', '#ffffff', { x: Math.sin(a) * 0.12, z: Math.cos(a) * 0.12, y: ly }, 6);
    b.cone(0.012, 0.03, 'glow', '#ffb347', { x: Math.sin(a) * 0.12, z: Math.cos(a) * 0.12, y: ly + 0.08 }, 6);
  }
  b.box(0.1, 0.12, 0.02, 'door', CHOC, { y, z: 0.42 });
  return b.finish();
};

/** 9 Macaron Row: three townhouses with macaron roofs in pastel colours. */
const macaronRow: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  const walls = ['#fff1d6', '#ffe3ee', '#e8f6ff'];
  const tops = [shade(color, 1.25), color, '#9be3c9'];
  [-0.26, 0, 0.26].forEach((x, i) => {
    const h = [0.4, 0.48, 0.38][i];
    b.box(0.25, h, 0.4, 'plaster', walls[i], { x, y, z: -0.02 });
    panes(b, x - 0.09, x + 0.09, y + h * 0.55, 0.185, 2, 0.08, '#fff2cc');
    b.box(0.08, 0.15, 0.02, 'door', CHOC, { x, y, z: 0.185 });
    const my = y + h;
    b.cyl(0.13, 0.12, 0.05, 'plaster', tops[i], { x, y: my, z: -0.02 }, 18);
    b.cyl(0.12, 0.12, 0.025, 'plaster', ICING, { x, y: my + 0.05, z: -0.02 }, 18);
    b.cyl(0.12, 0.13, 0.05, 'plaster', tops[i], { x, y: my + 0.075, z: -0.02 }, 18);
  });
  return b.finish();
};

/** 10 Ice Cream Parlour: a striped parlour with a giant cone on the roof. */
const iceCream: Build = (_H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  stripedBox(b, 0.66, 0.3, 0.42, PINK, ICING, { y, z: -0.03 }, 8, 'plaster');
  b.box(0.5, 0.14, 0.014, 'pane', '#fff2cc', { y: y + 0.06, z: 0.19 });
  b.box(0.72, 0.035, 0.2, 'gloss', color, { y: y + 0.27, z: 0.22, rx: 0.25 });
  b.box(0.7, 0.05, 0.46, 'gloss', shade(color, 0.85), { y: y + 0.3, z: -0.03 }, 0.02);
  const cy = y + 0.35;
  b.cone(0.11, 0.3, 'wood', '#e0a85c', { y: cy + 0.3, rx: Math.PI }, 12);
  b.sphere(0.13, 'gloss', color, { y: cy + 0.36 }, 14);
  b.sphere(0.11, 'gloss', ICING, { y: cy + 0.5 }, 14);
  b.sphere(0.035, 'gloss', '#e53935', { y: cy + 0.62 }, 8);
  return b.finish();
};

/** 11 Chocolate Block: an apartment block of chocolate bar squares with icing balconies. */
const chocBlock: Build = (H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  const floors = 6;
  const fh = Math.max(0.13, (H - 0.25) / floors);
  b.box(0.62, fh * floors, 0.42, 'plaster', CHOC, { y, z: -0.03 });
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < 4; i++) b.box(0.13, fh * 0.8, 0.02, 'gloss', shade(CHOC, 1.12), { x: -0.225 + i * 0.15, y: y + f * fh + fh * 0.1, z: 0.185 });
    panes(b, -0.28, 0.28, y + f * fh + fh * 0.32, 0.2, 4, fh * 0.36, '#fff2cc');
    if (f > 0) b.box(0.66, 0.02, 0.06, 'gloss', f % 2 ? color : ICING, { y: y + f * fh, z: 0.21 });
  }
  b.box(0.66, 0.04, 0.46, 'gloss', color, { y: y + floors * fh, z: -0.03 });
  frosting(b, 0.06, y + floors * fh + 0.04, ICING, 0);
  return b.finish();
};

/** 12 Lollipop Tower: a tall candy tower crowned with a spinning lollipop. */
const lollipopTower: Build = (H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  const h = Math.max(1.0, H - 0.5);
  b.cyl(0.2, 0.24, h, 'plaster', CREAM, { y }, 16);
  for (let i = 0; i < 6; i++) b.cyl(0.215 - i * 0.004, 0.215 - i * 0.004, h / 12, 'gloss', i % 2 ? color : PINK, { y: y + (h * (i * 2 + 1)) / 12 }, 16);
  for (let i = 0; i < 4; i++) b.box(0.07, 0.07, 0.014, 'pane', '#fff2cc', { y: y + h * (0.12 + i * 0.22), z: 0.225 });
  b.cyl(0.25, 0.2, 0.05, 'gloss', ICING, { y: y + h }, 16);
  b.cyl(0.015, 0.015, 0.2, 'matte', ICING, { y: y + h + 0.05 }, 6);
  b.animated(
    (s) => {
      s.cyl(0.16, 0.16, 0.04, 'gloss', color, { rx: Math.PI / 2, z: -0.02 }, 20);
      s.extrude(star(5, 0.12, 0.05), 0.012, 'gloss', ICING, { rx: Math.PI / 2, z: 0.03 });
    },
    { type: 'spin', speed: 0.8 },
    { y: y + h + 0.32 },
  );
  return b.finish();
};

/** 13 Candy Cane Tower: a tall red-and-white striped tower with a hooked top. */
const caneTower: Build = (H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  const h = Math.max(1.3, H - 0.55);
  const n = 14;
  for (let i = 0; i < n; i++) b.cyl(0.17, 0.19 - i * 0.002, h / n + 0.002, 'gloss', i % 2 ? ICING : color, { y: y + (h * i) / n }, 16);
  for (let i = 0; i < 5; i++) b.box(0.07, 0.08, 0.014, 'pane', '#fff2cc', { y: y + h * (0.1 + i * 0.18), z: 0.185 });
  const hook = new THREE.TorusGeometry(0.15, 0.06, 10, 20, Math.PI);
  b.add(hook, 'gloss', color, { y: y + h, x: 0.15 });
  b.cyl(0.06, 0.06, 0.1, 'gloss', ICING, { y: y + h - 0.1, x: 0.3 }, 10);
  return b.finish();
};

/** 14 Soft-Serve Swirl: a twisting ice-cream tower in a waffle-cone base. */
const softServe: Build = (H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  const h = Math.max(1.5, H - 0.4);
  b.cyl(0.3, 0.2, h * 0.3, 'wood', '#e0a85c', { y }, 16);
  for (let i = 0; i < 4; i++) b.box(0.06, 0.07, 0.014, 'pane', '#fff2cc', { y: y + h * 0.05 + i * 0.07 * (h / 1.5), z: 0.25 - i * 0.02 });
  b.animated(
    (s) => {
      const turns = 9;
      const sh = h * 0.7;
      for (let i = 0; i < turns; i++) {
        const t = i / turns;
        const r = 0.32 * (1 - t * 0.85);
        s.sphere(r, 'gloss', i % 2 ? color : ICING, { y: sh * t + r * 0.4, x: Math.sin(i * 1.3) * 0.02, sy: 0.5 }, 16);
      }
      s.cone(0.04, 0.12, 'gloss', ICING, { y: sh + 0.02 }, 10);
    },
    { type: 'sway', amp: 0.01, speed: 2 },
    { y: y + h * 0.3 },
  );
  return b.finish();
};

/** 15 Wedding Cake Tower: tall tiers of white cake with pink frosting and a topper. */
const weddingCake: Build = (H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  const h = Math.max(1.6, H - 0.5);
  const tiers = 6;
  let ty = y;
  for (let i = 0; i < tiers; i++) {
    const r = 0.42 - i * 0.055;
    const th = h / tiers - 0.02;
    b.cyl(r, r, th, 'plaster', '#fffaf4', { y: ty }, 24);
    frosting(b, r, ty + th - 0.01, i % 2 ? color : PINK, 7);
    for (let k = 0; k < 3; k++) {
      const a = -0.5 + k * 0.5;
      b.box(0.05, th * 0.4, 0.012, 'pane', '#fff2cc', { x: Math.sin(a) * (r + 0.004), z: Math.cos(a) * (r + 0.004), y: ty + th * 0.3, ry: a });
    }
    ty += th + 0.02;
  }
  b.extrude(star(5, 0.1, 0.045), 0.03, 'gloss', '#ffd84d', { y: ty + 0.12, rx: Math.PI / 2 });
  b.cyl(0.01, 0.01, 0.12, 'gloss', ICING, { y: ty }, 6);
  return b.finish();
};

/** 16 Candy Castle: pastel towers with gumdrop domes and lollipop banners. */
const candyCastle: Build = (H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, color));
  const h = Math.max(1.0, (H - 0.6) * 0.8);
  b.box(0.56, h * 0.35, 0.36, 'plaster', '#ffe3ee', { y, z: -0.02 });
  piping(b, 0.56, 0.36, y + h * 0.35, { z: -0.02 });
  b.box(0.14, h * 0.2, 0.02, 'door', CHOC, { y, z: 0.165 });
  const towers: [number, number, number, number, string][] = [[-0.3, 0.14, 0.08, 0.7, '#e8f6ff'], [0.3, 0.14, 0.08, 0.65, '#fff1d6'], [0, -0.16, 0.11, 1, '#ffe3ee'], [-0.24, -0.2, 0.07, 0.5, '#e9ffe8'], [0.24, -0.2, 0.07, 0.55, '#fff1d6']];
  for (const [x, z, r, k, c] of towers) {
    const th = h * k;
    b.cyl(r, r, th, 'plaster', c, { x, z, y }, 12);
    b.torus(r + 0.004, 0.012, 'gloss', color, { x, z, y: y + th * 0.6 });
    b.sphere(r * 1.25, 'gloss', color, { x, z, y: y + th, sy: 1.2 }, 12);
    b.sphere(0.02, 'gloss', '#ffffff', { x, z, y: y + th + r * 1.5 }, 6);
    b.box(r * 0.5, r * 0.9, 0.01, 'pane', '#fff2cc', { x, z: z + r + 0.003, y: y + th * 0.4 });
  }
  lollipop(b, 0.38, 0.32, y, 0.3, '#ffd84d', 0.06);
  return b.finish();
};

/** 17 Sundae Citadel: a floating sundae island with cherry domes and whipped towers. */
const sundae: Build = (H, color) => {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.3, 0.34, 0.02, 'glow', '#ffc2dc', { y: y0 }, 24);
  const lift = Math.max(0.35, H * 0.3);
  b.animated(
    (s) => {
      s.cone(0.43, 0.38, 'wood', '#e0a85c', { y: 0, rx: Math.PI }, 14);
      s.cyl(0.45, 0.45, 0.06, 'gloss', PINK, { y: 0 }, 22);
      frosting(s, 0.45, 0.05, ICING, 14);
      s.sphere(0.2, 'gloss', color, { y: 0.06, x: -0.12, z: -0.05, sy: 0.9 }, 14);
      s.sphere(0.16, 'gloss', ICING, { y: 0.06, x: 0.16, z: -0.1, sy: 0.9 }, 14);
      s.sphere(0.14, 'gloss', '#9be3c9', { y: 0.06, x: 0.05, z: 0.18, sy: 0.9 }, 14);
      s.cyl(0.06, 0.07, 0.36, 'plaster', '#fffaf4', { y: 0.06, x: 0.25, z: 0.18 }, 10);
      s.sphere(0.08, 'gloss', '#e53935', { y: 0.46, x: 0.25, z: 0.18 }, 10);
      s.cyl(0.05, 0.06, 0.28, 'plaster', '#fffaf4', { y: 0.06, x: -0.3, z: 0.15 }, 10);
      s.cone(0.07, 0.14, 'gloss', ICING, { y: 0.34, x: -0.3, z: 0.15 }, 10);
      s.sphere(0.07, 'gloss', '#e53935', { y: 0.3, x: -0.12, z: -0.05 }, 10);
      sprinkles(s, 0.3, 0.1, 16);
    },
    { type: 'bob', amp: 0.035, speed: 1.4 },
    { y: y0 + lift },
  );
  return b.finish();
};

/** 18 Rainbow Spire: a towering rainbow candy spire with a glowing star and beam. */
const rainbowSpire: Build = (H, color) => {
  const b = new Builder();
  const y = sugarGround(b, base(b, '#ffd1e6'));
  const h = Math.max(1.9, H - 0.6);
  const bands = ['#ff5e5e', '#ff9a3d', '#ffd84d', '#7ee081', '#4fc3f7', '#b48cff'];
  const n = bands.length * 2;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    b.cyl(0.18 * (1 - (t + 1 / n) * 0.7), 0.18 * (1 - t * 0.7), h / n + 0.002, 'gloss', bands[i % bands.length], { y: y + h * t }, 14);
  }
  b.cyl(0.3, 0.34, 0.06, 'gloss', color, { y }, 20);
  frosting(b, 0.3, y + 0.05, ICING, 12);
  b.extrude(star(5, 0.13, 0.055), 0.03, 'glow', '#fff3b0', { y: y + h + 0.16, rx: Math.PI / 2 });
  b.cyl(0.08, 0.04, 8, 'beam', '#ffc2dc', { y: y + h + 0.1 }, 12, true);
  lollipop(b, -0.36, 0.24, y, 0.3, '#ff5e8a', 0.06);
  lollipop(b, 0.36, 0.24, y, 0.26, '#4fc3f7', 0.05);
  return b.finish();
};

export const SWEET: Build[] = [
  sugarCube, cupcake, kiosk, gingerCabin, cookieCottage, gingerHouse, donutHouse, layerCake, macaronRow,
  iceCream, chocBlock, lollipopTower, caneTower, softServe, weddingCake, candyCastle, sundae, rainbowSpire,
];
