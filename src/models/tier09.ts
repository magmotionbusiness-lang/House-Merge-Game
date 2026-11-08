import { Builder, base, shade } from './kit';
import { house } from './parts';

/** Townhouses: three joined three-storey houses in warm tones under amber roofs. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const walls = ['#ffd8a8', '#ffe9c7', '#ffcf99'];
  const floors = [3, 3, 3];
  const fh = [0.18, 0.2, 0.17];
  [-0.27, 0, 0.27].forEach((x, i) =>
    house(b, {
      y,
      x,
      w: 0.26,
      d: 0.46,
      floors: floors[i],
      fh: fh[i],
      wall: walls[i],
      roof: i === 1 ? color : shade(color, 0.85),
      roofH: 0.16,
      windows: 2,
      door: i !== 1,
      wallMat: 'brick',
    }),
  );
  return b.finish();
}
