import { Builder, base, shade } from './kit';

/** Family Home: two storeys, garage, porch and porch light. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.5, 0.4, 0.42, 'matte', color, { y, x: -0.1 }, 0.012);
  b.gable(0.5, 0.2, 0.42, 'roof', '#6e5d52', { y: y + 0.4, x: -0.1 }, 0.05);
  // Garage with a flat roof and a grey door.
  b.box(0.28, 0.22, 0.36, 'matte', shade(color, 0.95), { y, x: 0.28, z: 0.03 }, 0.01);
  b.box(0.3, 0.025, 0.38, 'matte', '#8a8f96', { y: y + 0.22, x: 0.28, z: 0.03 });
  b.box(0.2, 0.15, 0.02, 'matte', '#c9ccd1', { y, x: 0.28, z: 0.215 });
  // Windows (two floors) and the door.
  for (const wx of [-0.27, 0.07])
    for (const wy of [0.08, 0.25]) b.box(0.09, 0.09, 0.015, 'gloss', '#bcdcf0', { y: y + wy, x: wx, z: 0.21 });
  b.box(0.1, 0.16, 0.015, 'wood', '#8b4b2b', { y, x: -0.1, z: 0.212 });
  // Porch roof on two posts, with a warm light.
  b.box(0.22, 0.02, 0.1, 'matte', '#6e5d52', { y: y + 0.19, x: -0.1, z: 0.27 });
  for (const px of [-0.2, 0]) b.box(0.02, 0.19, 0.02, 'matte', '#ffffff', { y, x: px, z: 0.31 });
  b.sphere(0.018, 'glow', '#ffd27a', { y: y + 0.17, x: -0.03, z: 0.225 }, 6);
  return b.finish();
}
