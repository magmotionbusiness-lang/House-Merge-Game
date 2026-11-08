import { Builder, base, shade } from './kit';

/** Office Tower: blue glass curtain wall on a podium, with a rooftop helipad. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.78, 0.08, 0.78, 'matte', '#3a4656', { y }, 0.01);
  const h = Math.max(0.9, H - 0.2);
  b.box(0.6, h, 0.6, 'window', color, { y: y + 0.08 });
  // Corner mullions.
  for (const [x, z] of [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0.3],
    [0.3, 0.3],
  ])
    b.box(0.04, h, 0.04, 'gloss', shade(color, 0.6), { y: y + 0.08, x, z });
  const top = y + 0.08 + h;
  b.box(0.64, 0.04, 0.64, 'gloss', '#4a5666', { y: top });
  b.cyl(0.26, 0.26, 0.02, 'matte', '#2b2f36', { y: top + 0.04 }, 24);
  b.torus(0.21, 0.012, 'glow', '#ffd23f', { y: top + 0.062 });
  b.box(0.04, 0.012, 0.16, 'glow', '#ffffff', { y: top + 0.06, x: -0.05 });
  b.box(0.04, 0.012, 0.16, 'glow', '#ffffff', { y: top + 0.06, x: 0.05 });
  b.box(0.1, 0.012, 0.035, 'glow', '#ffffff', { y: top + 0.06 });
  return b.finish();
}
