import { Builder, base, shade } from './kit';

/** Wall: a short stone-block wall section with a cap and end piers. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.7, 0.3, 0.2, 'brick', shade(color, 1.12), { y });
  b.box(0.82, 0.05, 0.27, 'matte', shade(color, 1.45), { y: y + 0.3 }, 0.015);
  for (const x of [-0.39, 0.39]) {
    b.box(0.13, 0.4, 0.26, 'brick', shade(color, 0.92), { y, x });
    b.box(0.16, 0.04, 0.29, 'matte', shade(color, 1.45), { y: y + 0.4, x }, 0.012);
  }
  return b.finish();
}
