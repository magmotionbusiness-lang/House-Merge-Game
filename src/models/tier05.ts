import { Builder, base } from './kit';

/** Foundation Kit: concrete slab in yellow formwork, wall stubs and capped rebar. */
export function build(_H: number, color: string) {
  const b = new Builder();
  const y = base(b, color);
  b.box(0.78, 0.09, 0.78, 'matte', '#b4b8be', { y, ry: 0.785 / 3 }, 0.015);
  const ry = 0.785 / 3;
  const s = 0.42;
  // Formwork boards.
  for (const [x, z, w, d] of [
    [0, -s, 0.86, 0.05],
    [0, s, 0.86, 0.05],
    [-s, 0, 0.05, 0.86],
    [s, 0, 0.05, 0.86],
  ] as const) {
    const c = Math.cos(ry);
    const sn = Math.sin(ry);
    b.box(w, 0.11, d, 'wood', color, { y, x: x * c + z * sn, z: -x * sn + z * c, ry });
  }
  const at = (x: number, z: number) => ({ x: x * Math.cos(ry) + z * Math.sin(ry), z: -x * Math.sin(ry) + z * Math.cos(ry) });
  for (const [x, z] of [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ]) {
    const p = at(x, z);
    b.box(0.2, 0.13, 0.07, 'matte', '#d3d6da', { y: y + 0.09, x: p.x, z: p.z, ry });
  }
  for (const [x, z] of [
    [-0.1, -0.1],
    [0.1, -0.1],
    [-0.1, 0.1],
    [0.1, 0.1],
    [0, -0.28],
    [0, 0.28],
  ]) {
    const p = at(x, z);
    b.cyl(0.012, 0.012, 0.22, 'matte', '#6a4b3b', { y: y + 0.09, x: p.x, z: p.z }, 6);
    b.sphere(0.03, 'matte', color, { y: y + 0.31, x: p.x, z: p.z }, 6);
  }
  return b.finish();
}
