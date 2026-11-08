import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materials, UV_DENSITY, type MatKey } from './materials';

/**
 * Procedural modelling kit. Models are built in "model units": the footprint is
 * 1 unit across (radius 0.5), y is up and the base sits at y = 0. Every part is
 * merged into one mesh per material, so a building costs a handful of draw calls.
 */

export type Anim =
  | { type: 'bob'; amp: number; speed: number }
  | { type: 'spin'; speed: number }
  | { type: 'sway'; amp: number; speed: number }
  | { type: 'puff'; speed: number; rise: number };

export interface At {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

function matrixOf(a: At) {
  tmpE.set(a.rx ?? 0, a.ry ?? 0, a.rz ?? 0);
  tmpQ.setFromEuler(tmpE);
  tmpS.set(a.sx ?? 1, a.sy ?? 1, a.sz ?? 1);
  tmpP.set(a.x ?? 0, a.y ?? 0, a.z ?? 0);
  return tmpM.compose(tmpP, tmpQ, tmpS);
}

/** Box-projected UVs in model units, so textures tile at a consistent scale. */
function boxUV(geo: THREE.BufferGeometry, density: number) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ny >= nx && ny >= nz) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else if (nx >= nz) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv[i * 2] = u * density;
    uv[i * 2 + 1] = v * density;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export class Builder {
  private parts = new Map<MatKey, THREE.BufferGeometry[]>();
  private extras: THREE.Object3D[] = [];

  /** Adds a geometry (consumed) with a colour and transform to a material bucket. */
  add(geo: THREE.BufferGeometry, mat: MatKey, color: string, at: At = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.applyMatrix4(matrixOf(at));
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    const density = UV_DENSITY[mat];
    if (density && mat !== 'beam' && mat !== 'water') boxUV(g, density);
    const c = new THREE.Color(color);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const list = this.parts.get(mat) ?? [];
    list.push(g);
    this.parts.set(mat, list);
    return this;
  }

  /** Box resting on y (bottom face at `y`). `r` rounds the edges. */
  box(w: number, h: number, d: number, mat: MatKey, color: string, at: At = {}, r = 0) {
    const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
    geo.translate(0, h / 2, 0);
    return this.add(geo, mat, color, at);
  }

  /** Cylinder / frustum resting on y. */
  cyl(rTop: number, rBot: number, h: number, mat: MatKey, color: string, at: At = {}, seg = 20, open = false) {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
    geo.translate(0, h / 2, 0);
    return this.add(geo, mat, color, at);
  }

  cone(r: number, h: number, mat: MatKey, color: string, at: At = {}, seg = 16) {
    return this.cyl(0.0001, r, h, mat, color, at, seg);
  }

  sphere(r: number, mat: MatKey, color: string, at: At = {}, seg = 12) {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.6))), mat, color, at);
  }

  /** Gable roof: triangular prism, ridge along x, resting on y. */
  gable(w: number, h: number, d: number, mat: MatKey, color: string, at: At = {}, overhang = 0.04) {
    const hw = d / 2 + overhang;
    const shape = new THREE.Shape([new THREE.Vector2(-hw, 0), new THREE.Vector2(hw, 0), new THREE.Vector2(0, h)]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: w + overhang * 2, bevelEnabled: false });
    geo.translate(0, 0, -(w + overhang * 2) / 2);
    geo.rotateY(Math.PI / 2);
    return this.add(geo, mat, color, at);
  }

  /** Hip / pyramid roof on a w x d rectangle. */
  pyramid(w: number, h: number, d: number, mat: MatKey, color: string, at: At = {}) {
    const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    geo.rotateY(Math.PI / 4);
    geo.scale(w, h, d);
    geo.translate(0, h / 2, 0);
    return this.add(geo, mat, color, at);
  }

  /** Extrudes a 2D outline (x, z in model units) upward by h. */
  extrude(points: [number, number][], h: number, mat: MatKey, color: string, at: At = {}, bevel = 0) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 1,
      curveSegments: 6,
    });
    geo.rotateX(-Math.PI / 2);
    return this.add(geo, mat, color, at);
  }

  torus(r: number, tube: number, mat: MatKey, color: string, at: At = {}) {
    const geo = new THREE.TorusGeometry(r, tube, 6, 24);
    geo.rotateX(Math.PI / 2);
    return this.add(geo, mat, color, at);
  }

  /** A separately animated sub-model (its own merged meshes). */
  animated(build: (b: Builder) => void, anim: Anim, at: At = {}) {
    const sub = new Builder();
    build(sub);
    const g = sub.finish();
    g.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0);
    g.userData.anim = anim;
    this.extras.push(g);
    return this;
  }

  finish(): THREE.Group {
    const group = new THREE.Group();
    const mats = materials();
    for (const [key, list] of this.parts) {
      const geo = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!geo) throw new Error(`merge failed for ${key}`);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mats[key]);
      mesh.name = key;
      if (key === 'beam' || key === 'water' || key === 'smoke') mesh.renderOrder = 4;
      group.add(mesh);
      list.forEach((g) => g !== geo && g.dispose());
    }
    for (const e of this.extras) group.add(e);
    return group;
  }
}

/** Darken or lighten a hex colour (k < 1 darkens). */
export function shade(hex: string, k: number) {
  const c = new THREE.Color(hex);
  if (k < 1) c.multiplyScalar(k);
  else c.lerp(new THREE.Color('#ffffff'), k - 1);
  return `#${c.getHexString()}`;
}

/** Every piece stands on a thin token disc in its tier colour, for readability at a glance. */
export function base(b: Builder, color: string) {
  b.cyl(0.5, 0.5, 0.05, 'matte', shade(color, 0.72), {}, 28);
  b.cyl(0.47, 0.49, 0.025, 'matte', shade(color, 1.18), { y: 0.05 }, 28);
  return 0.075; // height of the base, so models start on top of it
}
