import { Builder, base } from './kit';
import { bush, chimney, house } from './parts';

/** Cottage: a one-floor white house with a blue roof, chimney and front bushes. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const top = house(b, { y, w: 0.68, d: 0.5, floors: 1, fh: 0.26, wall: '#fbf6ec', roof: color, roofH: 0.24, windows: 3 });
  chimney(b, 0.2, -0.1, top + 0.04, 0.2);
  bush(b, -0.3, 0.34, y);
  bush(b, 0.3, 0.34, y);
  return b.finish();
}
