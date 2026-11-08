import { Builder, base, shade } from './kit';

/** Brick: one chunky clay brick with two holes. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.8, 0.3, 0.42, 'matte', color, { y }, 0.06);
  for (const x of [-0.17, 0.17]) b.cyl(0.07, 0.07, 0.012, 'matte', shade(color, 0.55), { y: y + 0.296, x }, 14);
  return b.finish();
}
