import { Builder, shade } from './kit';

export interface HouseOpts {
  x?: number;
  z?: number;
  y: number;
  w: number;
  d: number;
  floors: number;
  fh?: number; // floor height
  wall: string;
  roof: string;
  roofH?: number;
  roofType?: 'gable' | 'hip' | 'flat';
  windows?: number; // per floor on the front
  door?: boolean;
  trim?: string;
  wallMat?: 'siding' | 'plaster' | 'brick' | 'wood';
}


/**
 * A readable house block: floors separated by white trim bands (so they can be
 * counted), a row of windows per floor, a door and a roof in the tier colour.
 * Returns the height of the top of the walls.
 */
export function house(b: Builder, o: HouseOpts) {
  const x = o.x ?? 0;
  const z = o.z ?? 0;
  const fh = o.fh ?? 0.17;
  const h = o.floors * fh;
  const trim = o.trim ?? '#ffffff';
  const n = o.windows ?? 2;
  b.box(o.w, h, o.d, o.wallMat ?? 'siding', o.wall, { y: o.y, x, z });
  // Corner boards.
  for (const sx of [-1, 1]) b.box(0.025, h, 0.025, 'matte', trim, { y: o.y, x: x + sx * (o.w / 2), z: z + o.d / 2 });
  for (let f = 1; f < o.floors; f++) b.box(o.w + 0.02, 0.016, o.d + 0.02, 'matte', trim, { y: o.y + f * fh - 0.008, x, z });
  const front = z + o.d / 2 + 0.006;
  const ww = Math.min(0.11, (o.w / n) * 0.5);
  for (let f = 0; f < o.floors; f++) {
    for (let i = 0; i < n; i++) {
      const wx = x - o.w / 2 + (o.w / n) * (i + 0.5);
      const isDoor = o.door !== false && f === 0 && i === Math.floor((n - 1) / 2);
      if (isDoor) {
        b.box(ww * 1.1, fh * 0.74, 0.016, 'door', shade(o.roof, 0.85), { y: o.y, x: wx, z: front });
        b.box(ww * 1.4, 0.02, 0.05, 'matte', trim, { y: o.y + fh * 0.74, x: wx, z: front + 0.015 });
      } else {
        b.box(ww, fh * 0.52, 0.016, 'pane', '#ffffff', { y: o.y + f * fh + fh * 0.24, x: wx, z: front });
        b.box(ww * 1.25, 0.018, 0.035, 'matte', trim, { y: o.y + f * fh + fh * 0.22, x: wx, z: front + 0.008 });
        // Shutters on the lower floors give houses character.
        if (o.floors <= 3 && ww < 0.1)
          for (const sx of [-1, 1])
            b.box(ww * 0.32, fh * 0.52, 0.012, 'wood', shade(o.roof, 0.9), { y: o.y + f * fh + fh * 0.24, x: wx + sx * ww * 0.68, z: front });
      }
    }
    // One window per floor on the right side, for depth.
    b.box(0.016, fh * 0.52, ww, 'pane', '#ffffff', { y: o.y + f * fh + fh * 0.24, x: x + o.w / 2 + 0.006, z });
  }
  const top = o.y + h;
  const rh = o.roofH ?? 0.2;
  if (o.roofType === 'flat') {
    b.box(o.w + 0.04, 0.05, o.d + 0.04, 'matte', o.roof, { y: top, x, z }, 0.01);
  } else if (o.roofType === 'hip') {
    b.pyramid(o.w + 0.08, rh, o.d + 0.08, 'roof', o.roof, { y: top, x, z });
  } else {
    b.gable(o.w, rh, o.d, 'roof', o.roof, { y: top, x, z }, 0.05);
  }
  return top;
}

export function chimney(b: Builder, x: number, z: number, y: number, h = 0.2) {
  b.box(0.08, h, 0.08, 'brick', '#9c5a48', { y, x, z });
  b.box(0.1, 0.025, 0.1, 'matte', '#6b6b6b', { y: y + h, x, z });
}

/** Small round bush. */
export function bush(b: Builder, x: number, z: number, y: number, r = 0.05) {
  b.sphere(r, 'matte', '#3f9a4a', { y: y + r * 0.7, x, z }, 8);
}
