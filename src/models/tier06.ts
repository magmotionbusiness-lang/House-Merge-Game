import { Builder, base, shade } from './kit';

/** Garden Shed: sage-green plank shed, pitched roof, tiny door. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.56, 0.28, 0.42, 'wood', color, { y });
  b.gable(0.56, 0.17, 0.42, 'matte', shade(color, 0.55), { y: y + 0.28 }, 0.05);
  b.box(0.14, 0.21, 0.02, 'wood', shade(color, 0.75), { y, z: 0.21, x: -0.1 });
  b.sphere(0.012, 'gloss', '#f0d070', { y: y + 0.11, z: 0.225, x: -0.05 }, 6);
  b.box(0.13, 0.1, 0.02, 'gloss', '#cfe6f2', { y: y + 0.12, z: 0.21, x: 0.12 });
  b.box(0.15, 0.025, 0.04, 'wood', shade(color, 0.75), { y: y + 0.105, z: 0.22, x: 0.12 });
  // Watering can by the door.
  b.cyl(0.035, 0.04, 0.06, 'gloss', '#9aa3ad', { y, x: 0.2, z: 0.3 }, 10);
  return b.finish();
}
