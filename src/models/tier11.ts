import { Builder, base, shade } from './kit';

/** Apartment Block: six storeys of lit windows with cyan balconies and a rooftop tank. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const h = Math.max(0.8, H - 0.12);
  b.box(0.7, h, 0.54, 'window', '#f1f3f5', { y });
  const floors = 6;
  for (let f = 0; f < floors; f++) {
    const fy = y + (f + 0.1) * (h / floors);
    b.box(0.74, 0.024, 0.1, 'matte', color, { y: fy, z: 0.3 });
    b.box(0.74, 0.04, 0.012, 'gloss', shade(color, 1.3), { y: fy + 0.024, z: 0.345 });
  }
  b.box(0.74, 0.04, 0.58, 'matte', color, { y: y + h });
  b.cyl(0.08, 0.08, 0.1, 'matte', '#eceff1', { y: y + h + 0.04, x: 0.18, z: -0.1 }, 12);
  b.cone(0.085, 0.05, 'matte', color, { y: y + h + 0.14, x: 0.18, z: -0.1 }, 12);
  return b.finish();
}
