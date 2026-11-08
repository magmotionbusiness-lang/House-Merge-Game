import { Builder, base, shade } from './kit';

/** Apartment Block: six storeys of lit windows with teal balconies and a rooftop tank. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const h = Math.max(0.7, H - 0.12);
  b.box(0.68, h, 0.52, 'window', '#eef0f2', { y });
  const floors = 6;
  for (let f = 1; f <= floors; f++) {
    const fy = y + (f / floors) * h - 0.012;
    b.box(0.72, 0.022, 0.09, 'matte', color, { y: fy - 0.08, z: 0.29 });
    b.box(0.72, 0.035, 0.01, 'gloss', shade(color, 1.3), { y: fy - 0.058, z: 0.335 });
  }
  b.box(0.72, 0.03, 0.56, 'matte', shade(color, 0.8), { y: y + h });
  b.cyl(0.07, 0.07, 0.1, 'matte', color, { y: y + h + 0.03, x: 0.18, z: -0.1 }, 12);
  b.cone(0.075, 0.04, 'matte', shade(color, 0.7), { y: y + h + 0.13, x: 0.18, z: -0.1 }, 12);
  b.box(0.14, 0.07, 0.12, 'matte', '#d7dbe0', { y: y + h + 0.03, x: -0.18, z: 0.05 });
  return b.finish();
}
