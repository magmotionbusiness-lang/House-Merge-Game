import { Builder, base, shade } from './kit';
import { house } from './parts';

/** Apartments: a four-storey brick building with a flat roof in indigo. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const top = house(b, { y, w: 0.74, d: 0.54, floors: 4, fh: 0.16, wall: '#e8c4a8', roof: color, roofType: 'flat', windows: 4, wallMat: 'brick' });
  b.box(0.18, 0.08, 0.14, 'matte', shade(color, 1.2), { y: top + 0.05, x: 0.18, z: -0.1 });
  b.box(0.3, 0.025, 0.1, 'matte', color, { y: y + 0.13, z: 0.32 });
  return b.finish();
}
