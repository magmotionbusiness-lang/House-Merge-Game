import { Builder, base, shade } from './kit';

/** Twisted Tower: rotating floor plates stacked into a smooth silver twist. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.42, 0.44, 0.06, 'gloss', shade(color, 0.8), { y: y0 }, 24);
  const h = Math.max(1.1, H - 0.15);
  const n = 26;
  const ph = h / n;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = 0.5 - t * 0.12;
    b.box(w, ph * 0.82, w, 'window', color, { y: y0 + 0.06 + i * ph, ry: t * Math.PI * 0.75 });
    b.box(w + 0.025, ph * 0.18, w + 0.025, 'gloss', shade(color, 1.2), { y: y0 + 0.06 + i * ph + ph * 0.82, ry: t * Math.PI * 0.75 });
  }
  b.cone(0.05, 0.18, 'gloss', shade(color, 1.2), { y: y0 + 0.06 + h }, 8);
  return b.finish();
}
