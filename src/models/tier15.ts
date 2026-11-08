import { Builder, base, shade } from './kit';

/** Desert Needle: megatall Y-plan tower whose three wings step back in a spiral. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.46, 0.48, 0.04, 'matte', '#e9cfa6', { y: y0 }, 24);
  const y = y0 + 0.04;
  const h = Math.max(1.3, H - 0.4);
  b.animated(
    (s) => {
      s.cyl(0.08, 0.11, h, 'gloss', color, {}, 12);
      for (let w = 0; w < 3; w++) {
        const a = (w * Math.PI * 2) / 3;
        for (let k = 0; k < 4; k++) {
          const segH = h * (0.82 - k * 0.2 - w * 0.05);
          if (segH <= 0) continue;
          const len = 0.34 - k * 0.07;
          s.box(0.15, segH, len, 'window', shade(color, 1.25), {
            x: Math.sin(a) * (len / 2 + 0.03),
            z: Math.cos(a) * (len / 2 + 0.03),
            ry: a,
          });
        }
      }
      s.cone(0.05, 0.5, 'gloss', shade(color, 1.4), { y: h }, 8);
    },
    { type: 'sway', amp: 0.012, speed: 2.2 },
    { y },
  );
  return b.finish();
}
