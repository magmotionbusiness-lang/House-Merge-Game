import { Builder, base, shade } from './kit';

/** Office Tower: a blue glass tower on a podium with a rooftop helipad. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.8, 0.08, 0.8, 'matte', '#455a64', { y }, 0.01);
  const h = Math.max(0.95, H - 0.2);
  b.box(0.6, h, 0.6, 'window', color, { y: y + 0.08 });
  for (const [x, z] of [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0.3],
    [0.3, 0.3],
  ])
    b.box(0.04, h, 0.04, 'gloss', shade(color, 0.55), { y: y + 0.08, x, z });
  const top = y + 0.08 + h;
  b.box(0.64, 0.04, 0.64, 'gloss', '#37474f', { y: top });
  b.cyl(0.26, 0.26, 0.02, 'matte', '#263238', { y: top + 0.04 }, 24);
  b.torus(0.21, 0.012, 'glow', '#ffd23f', { y: top + 0.062 });
  b.box(0.04, 0.012, 0.16, 'glow', '#ffffff', { y: top + 0.06, x: -0.05 });
  b.box(0.04, 0.012, 0.16, 'glow', '#ffffff', { y: top + 0.06, x: 0.05 });
  b.box(0.1, 0.012, 0.035, 'glow', '#ffffff', { y: top + 0.06 });
  return b.finish();
}
