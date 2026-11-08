import { Builder, base } from './kit';

/** Skyscraper: Art Deco style, stepped stone setbacks, gold pilasters, a gold crown and needle mast. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y0 = base(b, color);
  const stone = '#efe3c4';
  const tiers = [
    { w: 0.7, h: 0.5 },
    { w: 0.54, h: 0.3 },
    { w: 0.4, h: 0.22 },
    { w: 0.28, h: 0.14 },
  ];
  const scale = Math.max(1, (H - 0.45) / tiers.reduce((a, t) => a + t.h, 0));
  let y = y0;
  for (const t of tiers) {
    const h = t.h * scale;
    b.box(t.w, h, t.w, 'window', stone, { y });
    for (const s of [-1, 1]) {
      b.box(0.03, h, 0.02, 'gloss', color, { y, x: s * t.w * 0.25, z: t.w / 2 });
      b.box(0.02, h, 0.03, 'gloss', color, { y, z: s * t.w * 0.25, x: t.w / 2 });
    }
    b.box(t.w + 0.03, 0.025, t.w + 0.03, 'gloss', color, { y: y + h });
    y += h + 0.025;
  }
  // Crown: three stacked gold arches (rings) and the needle.
  for (let i = 0; i < 3; i++) b.cyl(0.12 - i * 0.03, 0.14 - i * 0.03, 0.06, 'gloss', color, { y: y + i * 0.06 }, 8);
  b.cone(0.03, 0.4, 'gloss', color, { y: y + 0.18 }, 8);
  return b.finish();
}
