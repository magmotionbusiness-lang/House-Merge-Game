import { Builder, base } from './kit';

/** Cozy Cottage: L-shaped, blue slate roofs, blue door, flower boxes and chimney smoke. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  const wall = '#f7f2e8';
  b.box(0.62, 0.27, 0.34, 'matte', wall, { y, z: -0.1 }, 0.012);
  b.box(0.3, 0.27, 0.3, 'matte', wall, { y, x: 0.16, z: 0.16 }, 0.012);
  b.gable(0.62, 0.22, 0.34, 'roof', color, { y: y + 0.27, z: -0.1 }, 0.05);
  b.gable(0.3, 0.2, 0.3, 'roof', color, { y: y + 0.27, x: 0.16, z: 0.16, ry: Math.PI / 2 }, 0.04);
  b.box(0.12, 0.18, 0.02, 'wood', color, { y, x: -0.14, z: 0.075 });
  for (const x of [-0.24, 0.16]) {
    const z = x < 0 ? 0.075 : 0.31;
    b.box(0.1, 0.09, 0.015, 'gloss', '#cfe8f5', { y: y + 0.12, x: x === -0.24 ? -0.27 : x, z });
    b.box(0.12, 0.035, 0.04, 'wood', '#8a5a3a', { y: y + 0.085, x: x === -0.24 ? -0.27 : x, z: z + 0.015 });
    b.sphere(0.022, 'matte', '#ff6f91', { y: y + 0.125, x: (x === -0.24 ? -0.27 : x) - 0.03, z: z + 0.02 }, 6);
    b.sphere(0.022, 'matte', '#ffd166', { y: y + 0.125, x: (x === -0.24 ? -0.27 : x) + 0.03, z: z + 0.02 }, 6);
  }
  b.box(0.08, 0.2, 0.08, 'brick', '#9c5a48', { y: y + 0.36, x: -0.2, z: -0.16 });
  b.animated(
    (s) => {
      s.sphere(0.04, 'smoke', '#f4f4f4', { y: 0 }, 8);
      s.sphere(0.03, 'smoke', '#f4f4f4', { y: 0.06, x: 0.02 }, 8);
    },
    { type: 'puff', speed: 0.6, rise: 0.12 },
    { x: -0.2, y: y + 0.6, z: -0.16 },
  );
  return b.finish();
}
