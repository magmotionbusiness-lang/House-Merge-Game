import * as THREE from 'three';
import { CONFIG } from '../core/config';
import { Builder, shade } from '../models/kit';

/**
 * Steel I-beam rails around the blueprint sheet, with rivets along the top.
 * (The construction site itself is a painted backdrop behind the canvas.)
 *
 * World units: table width = 1. The table spans x in [-0.5, 0.5] and
 * z from 0 (player end) to -L (back rail).
 */
const W = CONFIG.tableWidth;
const L = CONFIG.tableLength;
export const RAIL_W = 0.045;
export const RAIL_H = 0.05;
const STEEL = '#8d99a8';

function railBeam(b: Builder, length: number, along: 'x' | 'z', x: number, z: number) {
  const rot = along === 'x' ? 0 : Math.PI / 2;
  b.box(length, 0.012, RAIL_W, 'matte', STEEL, { x, z, ry: rot });
  b.box(length, RAIL_H - 0.024, 0.014, 'matte', shade(STEEL, 0.85), { x, z, y: 0.012, ry: rot });
  b.box(length, 0.012, RAIL_W, 'matte', shade(STEEL, 1.1), { x, z, y: RAIL_H - 0.012, ry: rot });
  const n = Math.floor(length / 0.11);
  for (let i = 0; i <= n; i++) {
    const t = -length / 2 + (i / n) * length;
    b.sphere(0.006, 'matte', shade(STEEL, 0.7), { x: along === 'x' ? x + t : x, z: along === 'x' ? z : z + t, y: RAIL_H }, 5);
  }
}

export function buildRails(scene: THREE.Scene) {
  const rails = new Builder();
  railBeam(rails, L + RAIL_W * 2, 'z', -W / 2 - RAIL_W / 2, -L / 2);
  railBeam(rails, L + RAIL_W * 2, 'z', W / 2 + RAIL_W / 2, -L / 2);
  railBeam(rails, W, 'x', 0, RAIL_W / 2);
  const g = rails.finish();
  scene.add(g);
  return g;
}
