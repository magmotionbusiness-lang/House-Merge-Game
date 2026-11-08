import { Builder, base, shade } from './kit';

/** Doghouse: a tiny wooden kennel with a yellow roof, an arched door and a food bowl. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.5, 0.3, 0.46, 'wood', '#e6c38f', { y, z: -0.03 });
  b.gable(0.5, 0.22, 0.46, 'roof', color, { y: y + 0.3, z: -0.03, ry: Math.PI / 2 }, 0.06);
  // Arched door opening.
  b.box(0.18, 0.13, 0.02, 'matte', '#3a2a1e', { y, z: 0.205 });
  b.cyl(0.09, 0.09, 0.02, 'matte', '#3a2a1e', { y: y + 0.13, z: 0.205, rx: Math.PI / 2 }, 14);
  b.cyl(0.07, 0.06, 0.04, 'gloss', '#e53935', { y, x: 0.27, z: 0.3 }, 12);
  b.box(0.12, 0.04, 0.02, 'matte', shade(color, 0.6), { y: y + 0.32, z: 0.215 });
  return b.finish();
}
