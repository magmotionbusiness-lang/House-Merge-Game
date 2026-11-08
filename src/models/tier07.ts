import { Builder, base } from './kit';
import { bush, house } from './parts';

/** Big House: two wide floors, a teal roof and an attached garage. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  house(b, { y, x: -0.08, w: 0.62, d: 0.52, floors: 2, fh: 0.2, wall: '#fffaf0', roof: color, roofH: 0.22, windows: 3 });
  // Garage with a flat roof in the tier colour.
  b.box(0.24, 0.22, 0.44, 'matte', '#eae2d2', { y, x: 0.33, z: 0.03 }, 0.01);
  b.box(0.26, 0.04, 0.46, 'matte', color, { y: y + 0.22, x: 0.33, z: 0.03 });
  b.box(0.18, 0.16, 0.016, 'matte', '#cfd6dc', { y, x: 0.33, z: 0.255 });
  bush(b, -0.36, 0.34, y, 0.045);
  return b.finish();
}
