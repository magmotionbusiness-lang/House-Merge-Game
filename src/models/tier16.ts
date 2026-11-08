import { Builder, base, shade } from './kit';

/** Hero HQ: sleek sci-fi tower with a pulsing energy core and a landing pad. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y0 = base(b, color);
  b.box(0.76, 0.1, 0.6, 'matte', '#2a2440', { y: y0, z: -0.05 }, 0.02);
  // Landing pad on the podium's front edge.
  b.cyl(0.13, 0.13, 0.02, 'matte', '#1b1830', { y: y0 + 0.1, x: 0.22, z: 0.12 }, 20);
  b.torus(0.1, 0.01, 'glow', '#6ff3ff', { y: y0 + 0.125, x: 0.22, z: 0.12 });
  const h = Math.max(1.2, H - 0.35);
  const y = y0 + 0.1;
  const hex: [number, number][] = [
    [-0.2, -0.12],
    [0, -0.24],
    [0.2, -0.12],
    [0.16, 0.12],
    [0, 0.2],
    [-0.16, 0.12],
  ];
  b.extrude(hex, h * 0.55, 'gloss', color, { y, z: -0.08 });
  b.extrude(hex, h * 0.35, 'gloss', shade(color, 1.25), { y: y + h * 0.55, z: -0.08, sx: 0.8, sz: 0.8 });
  // Glowing vertical strips.
  for (const x of [-0.1, 0.1]) b.box(0.015, h * 0.85, 0.015, 'glow', '#6ff3ff', { y, x, z: 0.12 });
  // Crown with the energy core.
  const top = y + h * 0.9;
  b.cyl(0.07, 0.12, 0.08, 'gloss', '#2a2440', { y: top, z: -0.08 }, 6);
  b.sphere(0.07, 'pulse', '#7ffcff', { y: top + 0.14, z: -0.08 }, 14);
  b.animated((s) => s.torus(0.12, 0.012, 'pulse', '#c6a8ff'), { type: 'spin', speed: 1.6 }, { y: top + 0.14, z: -0.08 });
  b.cone(0.012, 0.22, 'gloss', '#e6e0ff', { y: top + 0.2, z: -0.08 }, 6);
  return b.finish();
}
