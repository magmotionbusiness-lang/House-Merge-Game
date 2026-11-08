import { Builder, base, shade } from './kit';

/** Brick: a single terracotta brick with rounded edges. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.74, 0.24, 0.36, 'matte', color, { y, ry: 0.35 }, 0.05);
  b.box(0.4, 0.012, 0.13, 'matte', shade(color, 0.7), { y: y + 0.235, ry: 0.35 }, 0.004);
  return b.finish();
}
