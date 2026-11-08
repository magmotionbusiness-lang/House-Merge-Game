import { Builder, base } from './kit';

/** Garden Shed: plank walls, a green roof, a door and a little window. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.6, 0.34, 0.48, 'wood', '#d2ab76', { y });
  b.gable(0.6, 0.2, 0.48, 'roof', color, { y: y + 0.34 }, 0.06);
  b.box(0.16, 0.26, 0.02, 'wood', '#8a5d36', { y, x: -0.13, z: 0.245 });
  b.box(0.15, 0.12, 0.02, 'gloss', '#a9d8f5', { y: y + 0.14, x: 0.14, z: 0.245 });
  b.box(0.19, 0.025, 0.02, 'matte', '#ffffff', { y: y + 0.26, x: 0.14, z: 0.25 });
  b.cyl(0.05, 0.04, 0.07, 'matte', '#c96a3c', { y, x: 0.3, z: 0.32 }, 10);
  b.sphere(0.045, 'matte', '#3f9a4a', { y: y + 0.09, x: 0.3, z: 0.32 }, 8);
  return b.finish();
}
