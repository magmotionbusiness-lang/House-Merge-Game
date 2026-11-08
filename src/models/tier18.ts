import { Builder, base } from './kit';

/** Space Elevator: a base station whose cable and light beam rise out of frame to orbit. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y0 = base(b, '#a9c4ff');
  b.cyl(0.42, 0.46, 0.08, 'gloss', color, { y: y0 }, 6);
  b.torus(0.38, 0.015, 'glow', '#8fd8ff', { y: y0 + 0.085 });
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.5;
    b.box(0.08, 0.28, 0.08, 'gloss', '#dfe7f5', { y: y0 + 0.08, x: Math.sin(a) * 0.22, z: Math.cos(a) * 0.22, ry: a, rx: -0.25 });
  }
  b.sphere(0.17, 'gloss', color, { y: y0 + 0.1, sy: 0.75 }, 16);
  const tall = 9;
  b.cyl(0.018, 0.018, tall, 'matte', '#5a6575', { y: y0 + 0.2 }, 6);
  b.cyl(0.09, 0.05, tall, 'beam', '#8fd8ff', { y: y0 + 0.2 }, 12, true);
  b.animated(
    (s) => {
      s.cyl(0.06, 0.06, 0.08, 'gloss', '#ffffff', {}, 8);
      s.torus(0.07, 0.01, 'glow', '#8fd8ff', { y: 0.04 });
    },
    { type: 'bob', amp: 0.35, speed: 0.6 },
    { y: y0 + 0.75 },
  );
  return b.finish();
}
