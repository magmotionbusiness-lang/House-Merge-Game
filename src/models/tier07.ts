import { Builder, base, shade } from './kit';

/** Tiny House: square cottage with a red tile roof, one window and a chimney. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.52, 0.3, 0.5, 'matte', '#f3e8d2', { y }, 0.015);
  b.gable(0.52, 0.24, 0.5, 'roof', color, { y: y + 0.3 }, 0.06);
  b.box(0.08, 0.2, 0.08, 'brick', '#a3533f', { y: y + 0.36, x: 0.15, z: -0.08 });
  b.box(0.13, 0.19, 0.02, 'wood', '#7a4a2a', { y, z: 0.25, x: -0.11 });
  b.box(0.13, 0.12, 0.02, 'gloss', '#bfe0f0', { y: y + 0.11, z: 0.25, x: 0.12 });
  b.box(0.16, 0.02, 0.035, 'matte', shade('#f3e8d2', 0.85), { y: y + 0.1, z: 0.26, x: 0.12 });
  return b.finish();
}
