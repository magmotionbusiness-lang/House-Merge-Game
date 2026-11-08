import * as THREE from 'three';
import { Builder, base } from './kit';

/** Sky Citadel: a floating island city with waterfalls, hovering above a glowing pad. */
export function build(H: number, color: string) {
  const b = new Builder();
  const y0 = base(b, color);
  b.cyl(0.32, 0.36, 0.02, 'glow', '#9bffd0', { y: y0 }, 28);
  b.torus(0.4, 0.012, 'glow', '#4fffb0', { y: y0 + 0.025 });
  const lift = Math.max(0.35, H * 0.3);
  b.animated(
    (s) => {
      // Rock underside and grassy top.
      s.cyl(0.43, 0.06, 0.32, 'matte', '#8a7660', { y: -0.32 }, 9);
      s.cyl(0.45, 0.43, 0.06, 'matte', color, { y: 0 }, 18);
      // Towers and a dome.
      s.cyl(0.07, 0.08, 0.38, 'matte', '#f4f7f5', { y: 0.06, x: -0.18, z: -0.1 }, 10);
      s.cone(0.1, 0.16, 'roof', '#2fa7a0', { y: 0.44, x: -0.18, z: -0.1 }, 10);
      s.cyl(0.06, 0.07, 0.26, 'matte', '#f4f7f5', { y: 0.06, x: 0.2, z: -0.05 }, 10);
      s.cone(0.085, 0.13, 'roof', '#2fa7a0', { y: 0.32, x: 0.2, z: -0.05 }, 10);
      s.cyl(0.05, 0.06, 0.2, 'matte', '#f4f7f5', { y: 0.06, x: 0.02, z: 0.2 }, 10);
      s.cone(0.075, 0.11, 'roof', '#2fa7a0', { y: 0.26, x: 0.02, z: 0.2 }, 10);
      s.sphere(0.12, 'gloss', '#cfeaff', { y: 0.08, x: 0.0, z: -0.18 }, 14);
      s.sphere(0.03, 'matte', '#2f8f5a', { y: 0.09, x: 0.25, z: 0.2 }, 6);
      s.sphere(0.04, 'matte', '#2f8f5a', { y: 0.09, x: -0.3, z: 0.18 }, 6);
      // Waterfalls pouring off the edge.
      for (const a of [0.5, 2.3, 4.2]) {
        const geo = new THREE.PlaneGeometry(0.08, lift + 0.25);
        s.add(geo, 'water', '#9fe3ff', { x: Math.sin(a) * 0.45, z: Math.cos(a) * 0.45, y: 0.03 - (lift + 0.25) / 2, ry: a });
      }
    },
    { type: 'bob', amp: 0.035, speed: 1.4 },
    { y: y0 + lift },
  );
  return b.finish();
}
