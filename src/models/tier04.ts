import { Builder, base } from './kit';

/** Corner Frame: two low walls meeting at a right angle, framed by timber posts and beams. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const wall = '#e2cdb0';
  b.box(0.62, 0.17, 0.1, 'brick', wall, { y, z: -0.26 });
  b.box(0.1, 0.17, 0.52, 'brick', wall, { y, x: -0.26, z: 0.05 });
  const p = 0.28;
  for (const [x, z] of [
    [-p, -p],
    [p, -p],
    [-p, p],
    [p, p],
  ])
    b.box(0.075, 0.48, 0.075, 'wood', color, { y, x, z });
  b.box(0.66, 0.07, 0.08, 'wood', color, { y: y + 0.48, z: -p });
  b.box(0.08, 0.07, 0.66, 'wood', color, { y: y + 0.48, x: -p });
  b.box(0.66, 0.07, 0.08, 'wood', color, { y: y + 0.48, z: p });
  // A diagonal brace.
  b.box(0.05, 0.42, 0.05, 'wood', color, { y: y + 0.03, x: 0.05, z: -p, rz: 0.75 });
  return b.finish();
}
