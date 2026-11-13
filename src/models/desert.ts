import { Builder, base, shade } from './kit';
import { palm, panes, stripedBox, water } from './themekit';

/**
 * Desert Oasis lineup: mud brick to Sun Spire. Sandstone and mud brick,
 * Egyptian blue-and-gold trim, palms and oasis water; the tier colour is on
 * every dome, awning, tent and capstone. Pyramids and temples at the top.
 */
type Build = (H: number, color: string) => ReturnType<Builder['finish']>;

const SANDSTONE = '#e8c48a';
const MUD = '#c98c55';
const PLASTER = '#f6ead2';
const BLUE = '#2f5da8';
const GOLD = '#f2c14e';

function sand(b: Builder, y: number, r = 0.4) {
  b.cyl(r, r + 0.02, 0.02, 'plaster', '#f0d49b', { y }, 24);
  return y + 0.02;
}

/** Egyptian frieze: a blue band with gold dashes along the front. */
function frieze(b: Builder, w: number, z: number, y: number, x = 0) {
  b.box(w + 0.008, 0.03, 0.012, 'matte', BLUE, { x, z: z + 0.003, y });
  const n = Math.max(3, Math.round(w / 0.06));
  for (let i = 0; i < n; i++) b.box(0.02, 0.012, 0.02, 'gloss', GOLD, { x: x - w / 2 + (w * (i + 0.5)) / n, z: z + 0.002, y: y + 0.009 });
}

/** A dome in the tier colour on a short drum, gold tip. */
function dome(b: Builder, r: number, y: number, color: string, at: { x?: number; z?: number } = {}, onion = false) {
  const x = at.x ?? 0;
  const z = at.z ?? 0;
  b.cyl(r * 0.9, r * 0.95, r * 0.3, 'plaster', PLASTER, { x, z, y }, 12);
  b.sphere(r, 'gloss', color, { x, z, y: y + r * 0.3, sy: onion ? 1.15 : 0.85 }, 12);
  if (onion) b.cone(r * 0.35, r * 0.8, 'gloss', color, { x, z, y: y + r * 1.15 }, 10);
  b.cone(r * 0.1, r * 0.5, 'gloss', GOLD, { x, z, y: y + r * (onion ? 1.85 : 1.1) }, 6);
}

/** A dark arched doorway. */
function door(b: Builder, x: number, z: number, y: number, w = 0.09, h = 0.13) {
  b.box(w, h, 0.016, 'door', '#5a3a22', { x, z, y });
  b.cyl(w / 2, w / 2, 0.016, 'door', '#5a3a22', { x, z, y: y + h, rx: Math.PI / 2 }, 8);
}

/** Lotus columns with blue-and-gold capitals. */
function lotusColumns(b: Builder, xs: number[], z: number, y: number, h: number, r = 0.026) {
  for (const x of xs) {
    b.cyl(r, r * 1.15, h, 'plaster', SANDSTONE, { x, z, y }, 10);
    b.cyl(r * 1.6, r, 0.04, 'gloss', GOLD, { x, z, y: y + h - 0.04 }, 10);
    b.cyl(r * 1.25, r * 1.25, 0.02, 'matte', BLUE, { x, z, y: y + h * 0.3 }, 10);
  }
}

/** 1 Mud Brick: a sun-dried brick with the maker's stamp, coloured glaze on top. */
const mudBrick: Build = (_H, color) => {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.72, 0.24, 0.4, 'brick', MUD, { y }, 0.04);
  b.box(0.68, 0.06, 0.36, 'gloss', color, { y: y + 0.22 }, 0.03);
  b.box(0.14, 0.012, 0.14, 'gloss', GOLD, { y: y + 0.28 });
  return b.finish();
};

/** 2 Nomad Tent: a striped tent in the tier colour with poles and a rug. */
const tent: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.36, 0.008, 0.24, 'matte', '#b8433a', { y, z: 0.2 });
  b.gable(0.54, 0.32, 0.5, 'matte', color, { y, ry: Math.PI / 2 }, 0.0);
  b.gable(0.58, 0.11, 0.2, 'matte', shade(color, 1.25), { y: y + 0.226, ry: Math.PI / 2 }, 0.0);
  b.gable(0.2, 0.18, 0.2, 'matte', '#3a2418', { y, z: 0.17, ry: Math.PI / 2 }, 0.0);
  for (const z of [-0.26, 0.26]) b.cyl(0.01, 0.01, 0.38, 'wood', '#6d4c33', { z, y }, 5);
  return b.finish();
};

/** 3 Market Stall: a stall with a striped awning in the tier colour, spice baskets in front. */
const stall: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.5, 0.14, 0.24, 'wood', '#a87a4a', { y, z: -0.04 });
  for (const [x, z] of [[-0.24, -0.15], [0.24, -0.15], [-0.24, 0.15], [0.24, 0.15]] as const) b.box(0.025, 0.3, 0.025, 'wood', '#6d4c33', { x, z, y });
  stripedBox(b, 0.58, 0.03, 0.4, color, '#fff3dc', { y: y + 0.3 }, 7, 'matte');
  b.box(0.58, 0.07, 0.01, 'matte', color, { y: y + 0.24, z: 0.21 });
  const spice = ['#e05a2a', '#f2c14e', '#7a9a3a'];
  spice.forEach((c, i) => {
    b.cyl(0.05, 0.04, 0.05, 'wood', '#c89a5a', { x: -0.15 + i * 0.15, z: 0.12, y: y + 0.14 }, 10);
    b.sphere(0.045, 'matte', c, { x: -0.15 + i * 0.15, z: 0.12, y: y + 0.18, sy: 0.6 }, 10);
  });
  return b.finish();
};

/** 4 Adobe Hut: a rounded mud hut with a coloured flat roof, beams poking out. */
const adobeHut: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.48, 0.26, 0.4, 'plaster', MUD, { y }, 0.06);
  b.box(0.5, 0.04, 0.42, 'gloss', color, { y: y + 0.26 }, 0.02);
  for (const x of [-0.15, 0, 0.15]) b.cyl(0.014, 0.014, 0.08, 'wood', '#6d4c33', { x, z: 0.2, y: y + 0.22, rx: Math.PI / 2 }, 5);
  door(b, -0.1, 0.201, y, 0.09, 0.12);
  b.box(0.08, 0.08, 0.016, 'pane', '#ffe6b0', { x: 0.12, z: 0.201, y: y + 0.12 });
  b.cyl(0.06, 0.05, 0.1, 'gloss', BLUE, { x: 0.3, z: 0.22, y }, 10);
  return b.finish();
};

/** 5 Oasis House: a white house by a pool under a palm, coloured roof terrace. */
const oasisHouse: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  water(b, y, 0.16, '#3fd0d0');
  b.box(0.46, 0.26, 0.34, 'plaster', PLASTER, { y, x: -0.08, z: -0.06 });
  b.box(0.5, 0.04, 0.38, 'gloss', color, { y: y + 0.26, x: -0.08, z: -0.06 });
  for (let i = 0; i < 5; i++) b.box(0.06, 0.04, 0.03, 'gloss', color, { x: -0.28 + i * 0.1, z: 0.12, y: y + 0.3 });
  door(b, -0.14, 0.111, y, 0.08, 0.12);
  panes(b, -0.02, 0.12, y + 0.12, 0.111, 1, 0.08, '#ffe6b0');
  palm(b, 0.3, 0.2, y, 0.34, 0.8);
  return b.finish();
};

/** 6 Courtyard House: two wings around a courtyard with a fountain, coloured parapets. */
const courtyard: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.68, 0.24, 0.16, 'plaster', SANDSTONE, { y, z: -0.18 });
  b.box(0.16, 0.24, 0.34, 'plaster', SANDSTONE, { y, x: -0.26, z: 0.07 });
  b.box(0.16, 0.24, 0.34, 'plaster', SANDSTONE, { y, x: 0.26, z: 0.07 });
  b.box(0.72, 0.045, 0.2, 'gloss', color, { y: y + 0.24, z: -0.18 });
  for (const x of [-0.26, 0.26]) b.box(0.2, 0.04, 0.3, 'gloss', color, { y: y + 0.24, x, z: 0.11 });
  frieze(b, 0.68, -0.098, y + 0.18);
  b.cyl(0.08, 0.09, 0.04, 'plaster', PLASTER, { y }, 14);
  b.cyl(0.065, 0.065, 0.01, 'gloss', '#3fd0d0', { y: y + 0.04 }, 14);
  door(b, 0, -0.098, y, 0.09, 0.13);
  return b.finish();
};

/** 7 Domed Villa: a white villa with a big dome in the tier colour and arched windows. */
const domedVilla: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.6, 0.24, 0.42, 'plaster', PLASTER, { y, z: -0.03 });
  frieze(b, 0.6, 0.182, y + 0.2, 0);
  for (const x of [-0.18, 0.18]) door(b, x, 0.182, y + 0.04, 0.07, 0.1);
  door(b, 0, 0.182, y, 0.09, 0.13);
  dome(b, 0.2, y + 0.24, color, { z: -0.03 });
  palm(b, -0.36, 0.24, y, 0.3, 0.7);
  return b.finish();
};

/** 8 Merchant House: a three-storey sandstone house with coloured awnings and a roof terrace. */
const merchant: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const fh = 0.16;
  b.box(0.56, fh * 3, 0.42, 'plaster', SANDSTONE, { y, z: -0.03 });
  for (let f = 0; f < 3; f++) {
    panes(b, -0.18, 0.18, y + f * fh + 0.05, 0.186, 2, 0.08, '#ffe6b0');
    if (f > 0) b.box(0.5, 0.025, 0.1, 'gloss', color, { y: y + f * fh + 0.13, z: 0.22, rx: 0.4 });
  }
  door(b, 0, 0.186, y, 0.09, 0.12);
  b.box(0.6, 0.04, 0.46, 'gloss', color, { y: y + fh * 3, z: -0.03 });
  b.box(0.2, 0.1, 0.16, 'plaster', PLASTER, { y: y + fh * 3 + 0.04, x: 0.14, z: -0.1 });
  frieze(b, 0.56, 0.186, y + fh * 3 - 0.04);
  return b.finish();
};

/** 9 Sandstone Row: three joined houses of different heights with coloured domes and doors. */
const sandRow: Build = (_H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  [-0.25, 0, 0.25].forEach((x, i) => {
    const h = [0.32, 0.42, 0.28][i];
    b.box(0.24, h, 0.4, 'plaster', i === 1 ? PLASTER : SANDSTONE, { y, x });
    door(b, x, 0.201, y, 0.07, 0.11);
    panes(b, x - 0.06, x + 0.06, y + h - 0.12, 0.201, 1, 0.07, '#ffe6b0');
    if (i === 1) dome(b, 0.1, y + h, color, { x });
    else b.box(0.26, 0.04, 0.42, 'gloss', color, { y: y + h, x });
  });
  frieze(b, 0.74, 0.205, y + 0.2);
  return b.finish();
};

/** 10 Bazaar Palace: a palace with onion domes in the tier colour and a grand arch. */
const bazaarPalace: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const h = Math.max(0.3, H * 0.45);
  b.box(0.72, h, 0.42, 'plaster', PLASTER, { y, z: -0.04 });
  frieze(b, 0.72, 0.172, y + h - 0.06);
  door(b, 0, 0.172, y, 0.14, h * 0.5);
  for (const x of [-0.24, 0.24]) door(b, x, 0.172, y + h * 0.35, 0.07, h * 0.25);
  dome(b, 0.18, y + h, color, { z: -0.04 }, true);
  for (const x of [-0.32, 0.32]) {
    b.cyl(0.05, 0.055, h + 0.12, 'plaster', PLASTER, { x, z: 0.14, y }, 10);
    dome(b, 0.06, y + h + 0.12, color, { x, z: 0.14 }, true);
  }
  return b.finish();
};

/** 11 Obelisk: a tall sandstone obelisk with a coloured pyramidion, hieroglyph bands and sphinxes. */
const obelisk: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  b.box(0.42, 0.08, 0.42, 'plaster', SANDSTONE, { y });
  const h = Math.max(0.9, H - 0.4);
  b.cyl(0.08 * Math.SQRT2, 0.13 * Math.SQRT2, h, 'plaster', SANDSTONE, { y: y + 0.08, ry: Math.PI / 4 }, 4);
  for (let i = 1; i < 6; i++) b.cyl(0.13 * Math.SQRT2 - i * 0.012, 0.13 * Math.SQRT2 - i * 0.012, 0.025, 'matte', i % 2 ? BLUE : GOLD, { y: y + 0.08 + (h * i) / 7, ry: Math.PI / 4 }, 4);
  b.cone(0.085 * Math.SQRT2, 0.16, 'gloss', color, { y: y + 0.08 + h, ry: Math.PI / 4 }, 4);
  for (const x of [-0.3, 0.3]) {
    b.box(0.08, 0.06, 0.18, 'plaster', SANDSTONE, { x, z: 0.12, y });
    b.box(0.07, 0.08, 0.06, 'plaster', SANDSTONE, { x, z: 0.2, y: y + 0.04 });
    b.box(0.08, 0.03, 0.04, 'matte', BLUE, { x, z: 0.2, y: y + 0.1 });
  }
  return b.finish();
};

/** 12 Temple of the Sun: a pylon gateway with lotus columns and a sun disc in the tier colour. */
const sunTemple: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const h = Math.max(0.7, H * 0.55);
  for (const x of [-0.24, 0.24]) {
    b.cyl(0.13, 0.19, h, 'plaster', SANDSTONE, { x, y, ry: Math.PI / 4, sz: 0.6 }, 4);
    frieze(b, 0.2, 0.09, y + h * 0.7, x);
  }
  b.box(0.3, h * 0.6, 0.12, 'plaster', SANDSTONE, { y });
  door(b, 0, 0.065, y, 0.12, h * 0.35);
  b.box(0.34, 0.05, 0.16, 'matte', BLUE, { y: y + h * 0.6 });
  b.cyl(0.11, 0.11, 0.03, 'gloss', color, { y: y + h * 0.6 + 0.16, z: 0.06, rx: Math.PI / 2 }, 20);
  for (const s of [-1, 1]) b.box(0.12, 0.04, 0.01, 'gloss', GOLD, { x: s * 0.15, y: y + h * 0.6 + 0.14, z: 0.06, rz: s * -0.3 });
  lotusColumns(b, [-0.12, 0.12], 0.24, y, h * 0.55);
  return b.finish();
};

/** 13 Step Pyramid: a stepped pyramid with a temple in the tier colour on top. */
const stepPyramid: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const h = Math.max(0.9, H - 0.3);
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const w = 0.76 - i * 0.1;
    b.box(w, h / steps / 1.2, w, 'brick', i % 2 ? SANDSTONE : shade(SANDSTONE, 0.92), { y: y + (h / steps) * i * 0.83 });
  }
  b.box(0.1, h * 0.8, 0.12, 'plaster', shade(SANDSTONE, 0.85), { y, z: 0.326 });
  const top = y + (h / steps) * steps * 0.83;
  b.box(0.18, 0.12, 0.18, 'gloss', color, { y: top });
  b.box(0.22, 0.03, 0.22, 'gloss', GOLD, { y: top + 0.12 });
  return b.finish();
};

/** 14 Great Pyramid: a smooth pyramid with a golden capstone and a coloured entrance band. */
const greatPyramid: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const h = Math.max(1.0, H - 0.3);
  b.pyramid(0.78, h * 0.86, 0.78, 'brick', SANDSTONE, { y });
  b.pyramid(0.17, h * 0.17, 0.17, 'gloss', GOLD, { y: y + h * 0.82 });
  b.box(0.16, 0.14, 0.04, 'gloss', color, { y: y + 0.12, z: 0.3, rx: -0.6 });
  b.box(0.08, 0.08, 0.02, 'door', '#3a2418', { y: y + 0.14, z: 0.32, rx: -0.6 });
  for (let i = 1; i < 4; i++) {
    const w = 0.78 * (1 - (i * 0.22) / 0.86 / 1.16);
    b.box(w * 1.0, 0.02, 0.012, 'gloss', color, { y: y + h * i * 0.2, z: (w / 2) * 0.99 });
  }
  palm(b, -0.38, 0.32, y, 0.32, 0.7);
  palm(b, 0.38, 0.3, y, 0.28, 0.65);
  return b.finish();
};

/** 15 Sphinx Temple: a sphinx lying before a temple, headdress stripes in the tier colour. */
const sphinx: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const h = Math.max(1.0, H - 0.4);
  b.box(0.6, h * 0.5, 0.3, 'plaster', SANDSTONE, { y, z: -0.2 });
  frieze(b, 0.6, -0.048, y + h * 0.42);
  lotusColumns(b, [-0.22, -0.08, 0.08, 0.22], -0.03, y, h * 0.42);
  b.pyramid(0.66, h * 0.3, 0.36, 'roof', color, { y: y + h * 0.5, z: -0.2 });
  // The sphinx: paws, body and head with a striped nemes headdress.
  b.box(0.18, 0.08, 0.34, 'plaster', SANDSTONE, { y, z: 0.18 }, 0.03);
  b.box(0.06, 0.04, 0.12, 'plaster', SANDSTONE, { y, x: -0.05, z: 0.38 });
  b.box(0.06, 0.04, 0.12, 'plaster', SANDSTONE, { y, x: 0.05, z: 0.38 });
  b.box(0.12, 0.12, 0.1, 'plaster', SANDSTONE, { y: y + 0.08, z: 0.3 });
  b.box(0.16, 0.08, 0.124, 'gloss', color, { y: y + 0.17, z: 0.292 }, 0.02);
  for (const s of [-1, 1]) b.box(0.04, 0.12, 0.06, 'gloss', color, { x: s * 0.08, y: y + 0.08, z: 0.32 });
  b.box(0.04, 0.012, 0.13, 'gloss', GOLD, { y: y + 0.24, z: 0.29 });
  return b.finish();
};

/** 16 Pharaoh's Palace: a grand palace with columned halls, coloured roofs and twin obelisks. */
const pharaoh: Build = (H, color) => {
  const b = new Builder();
  const y = sand(b, base(b, color));
  const h = Math.max(0.6, (H - 0.6) * 0.55);
  b.box(0.8, 0.06, 0.56, 'plaster', SANDSTONE, { y });
  b.box(0.6, h, 0.34, 'plaster', PLASTER, { y: y + 0.06, z: -0.08 });
  lotusColumns(b, [-0.24, -0.12, 0, 0.12, 0.24], 0.13, y + 0.06, h, 0.024);
  b.box(0.68, 0.05, 0.46, 'gloss', GOLD, { y: y + 0.06 + h, z: -0.04 });
  b.box(0.64, 0.06, 0.42, 'gloss', color, { y: y + 0.11 + h, z: -0.04 });
  b.box(0.34, h * 0.5, 0.24, 'plaster', PLASTER, { y: y + 0.17 + h, z: -0.1 });
  b.box(0.38, 0.05, 0.28, 'gloss', color, { y: y + 0.17 + h * 1.5, z: -0.1 });
  frieze(b, 0.6, 0.092, y + 0.06 + h - 0.06);
  for (const x of [-0.36, 0.36]) {
    b.cyl(0.03 * Math.SQRT2, 0.05 * Math.SQRT2, h * 1.3, 'plaster', SANDSTONE, { x, z: 0.22, y: y + 0.06, ry: Math.PI / 4 }, 4);
    b.cone(0.03 * Math.SQRT2, 0.06, 'gloss', color, { x, z: 0.22, y: y + 0.06 + h * 1.3, ry: Math.PI / 4 }, 4);
  }
  return b.finish();
};

/** 17 Golden Citadel: a floating oasis island with a domed golden citadel, palms and a waterfall. */
const goldenCitadel: Build = (H, color) => {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.3, 0.34, 0.02, 'glow', '#ffe2a0', { y: y0 }, 24);
  const lift = Math.max(0.35, H * 0.3);
  b.animated(
    (s) => {
      s.cyl(0.43, 0.08, 0.3, 'plaster', '#c9a77a', { y: -0.3 }, 10);
      s.cyl(0.45, 0.43, 0.05, 'plaster', '#f0d49b', { y: 0 }, 22);
      s.cyl(0.14, 0.14, 0.012, 'gloss', '#3fd0d0', { y: 0.05, x: 0.18, z: 0.16 }, 16);
      s.box(0.36, 0.22, 0.26, 'gloss', GOLD, { y: 0.05, x: -0.06, z: -0.1 });
      dome(s, 0.14, 0.27, color, { x: -0.06, z: -0.1 }, true);
      for (const x of [-0.28, 0.16]) {
        s.cyl(0.04, 0.05, 0.34, 'plaster', PLASTER, { x, z: -0.22, y: 0.05 }, 10);
        dome(s, 0.05, 0.39, color, { x, z: -0.22 }, true);
      }
      palm(s, -0.32, 0.22, 0.05, 0.28, 0.7);
      s.box(0.06, 0.3, 0.01, 'water', '#9fe3ff', { x: 0.3, z: 0.3, y: -0.27, ry: 0.8 });
    },
    { type: 'bob', amp: 0.035, speed: 1.2 },
    { y: y0 + lift },
  );
  return b.finish();
};

/** 18 Sun Spire: a golden obelisk spire on a pyramid base, a sun disc and a beam of light. */
const sunSpire: Build = (H, color) => {
  const b = new Builder();
  const y0 = sand(b, base(b, '#ffe2a0'));
  b.pyramid(0.7, 0.3, 0.7, 'brick', SANDSTONE, { y: y0 });
  const h = Math.max(1.9, H - 0.6);
  b.cyl(0.05 * Math.SQRT2, 0.11 * Math.SQRT2, h, 'gloss', GOLD, { y: y0 + 0.2, ry: Math.PI / 4 }, 4);
  for (let i = 1; i < 6; i++) b.cyl(0.11 * Math.SQRT2 - i * 0.011, 0.11 * Math.SQRT2 - i * 0.011, 0.03, 'gloss', color, { y: y0 + 0.2 + (h * i) / 6.5, ry: Math.PI / 4 }, 4);
  b.cyl(0.14, 0.14, 0.03, 'gloss', color, { y: y0 + 0.2 + h + 0.12, z: 0.02, rx: Math.PI / 2 }, 20);
  b.cyl(0.08, 0.04, 8, 'beam', '#ffe2a0', { y: y0 + 0.2 + h }, 12, true);
  palm(b, -0.38, 0.3, y0, 0.3, 0.7);
  palm(b, 0.38, 0.28, y0, 0.26, 0.65);
  return b.finish();
};

export const DESERT: Build[] = [
  mudBrick, tent, stall, adobeHut, oasisHouse, courtyard, domedVilla, merchant, sandRow,
  bazaarPalace, obelisk, sunTemple, stepPyramid, greatPyramid, sphinx, pharaoh, goldenCitadel, sunSpire,
];
