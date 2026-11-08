import { Builder, base } from './kit';
import { chimney, house } from './parts';

/** House: two floors, red roof. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const top = house(b, { y, w: 0.64, d: 0.5, floors: 2, fh: 0.2, wall: '#f6ead2', roof: color, roofH: 0.24, windows: 3 });
  chimney(b, -0.2, -0.08, top, 0.24);
  return b.finish();
}
