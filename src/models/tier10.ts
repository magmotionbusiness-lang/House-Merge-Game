import { Builder, base, shade } from './kit';

/** Townhouse Row: three narrow, joined, colourful canal houses with stepped and bell gables. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const houses = [
    { x: -0.26, h: 0.5, c: '#ff9e7a' },
    { x: 0, h: 0.6, c: color },
    { x: 0.26, h: 0.46, c: '#b88be0' },
  ];
  for (const [i, hs] of houses.entries()) {
    b.box(0.25, hs.h, 0.4, 'brick', hs.c, { y, x: hs.x });
    b.gable(0.4, 0.14, 0.25, 'roof', '#5b4a4a', { y: y + hs.h, x: hs.x, ry: Math.PI / 2 }, 0.01);
    // Front gable: stepped (sides) or bell-shaped (middle).
    if (i === 1) {
      b.cyl(0.08, 0.12, 0.12, 'brick', hs.c, { y: y + hs.h, x: hs.x, z: 0.18, sz: 0.3 }, 12);
    } else {
      for (let s = 0; s < 3; s++) b.box(0.22 - s * 0.07, 0.045, 0.05, 'brick', hs.c, { y: y + hs.h + s * 0.045, x: hs.x, z: 0.18 });
    }
    // White-trimmed windows.
    for (let f = 0; f < 3; f++) {
      const wy = 0.06 + f * 0.14;
      if (wy + 0.1 > hs.h) break;
      b.box(0.15, 0.1, 0.015, 'matte', '#ffffff', { y: y + wy, x: hs.x, z: 0.2 });
      b.box(0.12, 0.08, 0.02, 'gloss', '#9fc6de', { y: y + wy + 0.01, x: hs.x, z: 0.2 });
    }
    b.box(0.25, 0.02, 0.41, 'matte', shade(hs.c, 1.35), { y: y + hs.h - 0.02, x: hs.x });
  }
  return b.finish();
}
