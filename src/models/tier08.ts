import { Builder, base } from './kit';
import { bush, house } from './parts';

/** Mansion: three symmetric floors, two wings, a columned entrance and a pink hip roof. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const wall = '#fffdf7';
  house(b, { y, w: 0.46, d: 0.46, floors: 3, fh: 0.17, wall, roof: color, roofType: 'hip', roofH: 0.2, windows: 3, wallMat: 'plaster' });
  for (const sx of [-1, 1])
    house(b, { y, x: sx * 0.33, z: -0.02, w: 0.2, d: 0.4, floors: 2, fh: 0.17, wall, roof: color, roofType: 'hip', roofH: 0.14, windows: 1, door: false, wallMat: 'plaster' });
  // Columned porch.
  b.box(0.3, 0.025, 0.12, 'matte', '#ffffff', { y: y + 0.24, z: 0.3 });
  for (const cx of [-0.12, -0.04, 0.04, 0.12]) b.cyl(0.016, 0.016, 0.24, 'matte', '#ffffff', { y, x: cx, z: 0.34 }, 8);
  b.box(0.34, 0.03, 0.14, 'matte', '#d9d9d9', { y, z: 0.3 });
  bush(b, -0.34, 0.32, y, 0.05);
  bush(b, 0.34, 0.32, y, 0.05);
  return b.finish();
}
