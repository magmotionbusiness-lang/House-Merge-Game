import { Builder, base } from './kit';

/** Brick Stack: three bricks criss-crossed with mortar lines, so it reads apart from a lone brick. */
export function build(_H: number, color: string) {
  const b = new Builder();
  let y = base(b, color);
  const layers: [number, number][] = [
    [0.2, 0.12],
    [0.2 + Math.PI / 2, -0.04],
    [0.2, 0.0],
  ];
  layers.forEach(([ry, x], i) => {
    b.box(0.62, 0.13, 0.26, 'matte', color, { y, ry, x }, 0.03);
    y += 0.13;
    if (i < 2) {
      b.cyl(0.17, 0.17, 0.018, 'matte', '#ece4d4', { y }, 10);
      y += 0.018;
    }
  });
  return b.finish();
}
