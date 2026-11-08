import * as THREE from 'three';
import { CONFIG } from '../core/config';
import { Builder, shade } from '../models/kit';

/**
 * The construction site around the blueprint table: steel rails, static set
 * dressing and a few calm ambient animations (crane, excavator, mixer, flag,
 * welding sparks, dust motes). Everything static is merged into a handful of
 * meshes; animated parts are small separate groups.
 *
 * World units: table width = 1. The table spans x in [-0.5, 0.5] and
 * z from 0 (player end) to -L (back rail).
 */
const W = CONFIG.tableWidth;
const L = CONFIG.tableLength;
export const RAIL_W = 0.045;
export const RAIL_H = 0.05;

const STEEL = '#8d99a8';
const YELLOW = '#f5b800';
const CONCRETE = '#b7b9bd';

export interface SiteRefs {
  group: THREE.Group;
  update(dt: number, time: number): void;
  /** Floors shown on the half-built building in the background (grows with progress). */
  setFloors(n: number): void;
  /** 0 by day, 1 at night: floodlights and lamps. */
  setNight(k: number): void;
}

function railBeam(b: Builder, length: number, along: 'x' | 'z', x: number, z: number) {
  // An I-beam: two flanges and a web, with rivets along the top flange.
  const rot = along === 'x' ? 0 : Math.PI / 2;
  const fl = RAIL_W;
  b.box(length, 0.012, fl, 'matte', STEEL, { x, z, ry: rot });
  b.box(length, RAIL_H - 0.024, 0.014, 'matte', shade(STEEL, 0.85), { x, z, y: 0.012, ry: rot });
  b.box(length, 0.012, fl, 'matte', shade(STEEL, 1.1), { x, z, y: RAIL_H - 0.012, ry: rot });
  const n = Math.floor(length / 0.11);
  for (let i = 0; i <= n; i++) {
    const t = -length / 2 + (i / n) * length;
    const px = along === 'x' ? x + t : x;
    const pz = along === 'x' ? z : z + t;
    b.sphere(0.006, 'matte', shade(STEEL, 0.7), { x: px, z: pz, y: RAIL_H }, 5);
  }
}

function brickPallet(b: Builder, x: number, z: number, ry = 0) {
  b.box(0.2, 0.02, 0.16, 'wood', '#b88a55', { x, z, ry });
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 2; c++)
      b.box(0.09, 0.035, 0.07, 'brick', '#c8643c', { x: x + (c - 0.5) * 0.095, y: 0.02 + r * 0.036, z, ry: ry + (r % 2) * 0.05 });
}

function cone(b: Builder, x: number, z: number, s = 1) {
  b.box(0.04 * s, 0.006, 0.04 * s, 'matte', '#ff6a00', { x, z });
  b.cone(0.016 * s, 0.05 * s, 'matte', '#ff7a1a', { x, z, y: 0.006 }, 10);
  b.cyl(0.0115 * s, 0.0135 * s, 0.01 * s, 'matte', '#ffffff', { x, z, y: 0.022 * s }, 10);
}

function rebar(b: Builder, x: number, z: number) {
  for (let i = 0; i < 6; i++)
    b.cyl(0.006, 0.006, 0.34, 'matte', '#7a4b33', { x: x + (i % 3) * 0.014, z: z + Math.floor(i / 3) * 0.014, y: 0.01 + Math.floor(i / 3) * 0.012, rz: Math.PI / 2 }, 5);
  b.box(0.05, 0.012, 0.05, 'wood', '#a87b4f', { x: x - 0.12, z: z + 0.007 });
  b.box(0.05, 0.012, 0.05, 'wood', '#a87b4f', { x: x + 0.12, z: z + 0.007 });
}

function office(b: Builder, x: number, z: number) {
  // Site office container with windows, a door and a coffee mug on a barrel.
  b.box(0.44, 0.2, 0.22, 'siding', '#e8eef2', { x, z, y: 0.02 });
  b.box(0.46, 0.02, 0.24, 'matte', '#5d6b78', { x, z, y: 0.22 });
  for (const wx of [-0.12, 0.12]) b.box(0.1, 0.07, 0.01, 'pane', '#ffffff', { x: x + wx, z: z + 0.111, y: 0.1 });
  b.box(0.07, 0.15, 0.01, 'door', '#2f7dc1', { x: x + 0.02, z: z + 0.111, y: 0.02 });
  for (const sx of [-0.18, 0.18]) b.box(0.04, 0.02, 0.2, 'matte', '#5d6b78', { x: x + sx, z, y: 0 });
  b.cyl(0.035, 0.035, 0.08, 'matte', '#2e7d32', { x: x + 0.27, z: z + 0.08 }, 10);
  b.cyl(0.012, 0.011, 0.02, 'matte', '#ffffff', { x: x + 0.27, z: z + 0.08, y: 0.08 }, 8);
}

function scaffold(b: Builder, x: number, z: number, h: number, w: number) {
  for (const sx of [-w / 2, w / 2])
    for (const sz of [-0.05, 0.05]) b.cyl(0.006, 0.006, h, 'matte', '#c0c4c8', { x: x + sx, z: z + sz }, 5);
  for (let y = 0.18; y < h; y += 0.18) {
    b.box(w + 0.03, 0.012, 0.12, 'wood', '#d39b4a', { x, z, y });
    b.box(w, 0.005, 0.005, 'matte', '#c0c4c8', { x, z: z + 0.05, y: y + 0.08 });
  }
}

function mixerBody(b: Builder) {
  b.box(0.16, 0.03, 0.1, 'matte', '#455a64', { y: 0.03 });
  for (const sx of [-0.05, 0.05]) b.cyl(0.028, 0.028, 0.02, 'matte', '#263238', { x: sx, z: 0.055, y: 0.028, rx: Math.PI / 2 }, 10);
  b.box(0.02, 0.1, 0.02, 'matte', '#ff7043', { x: -0.07, y: 0.06 });
}

function mixerDrum(b: Builder) {
  b.cyl(0.045, 0.06, 0.11, 'matte', '#ff7043', { y: -0.055 }, 12);
  b.cyl(0.03, 0.045, 0.04, 'matte', '#ff7043', { y: 0.055 }, 12);
  b.torus(0.052, 0.006, 'matte', '#ffffff', { y: 0 });
}

/** Half-built building: concrete floors on steel columns, with completed walls below. */
function tower(floors: number) {
  const b = new Builder();
  const fh = 0.18;
  const w = 0.5;
  const d = 0.36;
  b.box(w + 0.06, 0.04, d + 0.06, 'matte', CONCRETE, {});
  for (let f = 0; f < floors; f++) {
    const y = 0.04 + f * fh;
    const done = f < floors - 2;
    if (done) b.box(w - 0.02, fh - 0.02, d - 0.02, 'window', '#cfd8dc', { y });
    for (const sx of [-w / 2, 0, w / 2]) for (const sz of [-d / 2, d / 2]) b.box(0.018, fh, 0.018, 'matte', '#c25b3a', { x: sx, z: sz, y });
    b.box(w + 0.02, 0.02, d + 0.02, 'matte', CONCRETE, { y: y + fh - 0.02 });
  }
  return b.finish();
}

function crane() {
  const mast = new Builder();
  const h = 2.3;
  for (const sx of [-0.035, 0.035]) for (const sz of [-0.035, 0.035]) mast.box(0.012, h, 0.012, 'matte', YELLOW, { x: sx, z: sz });
  for (let y = 0.1; y < h; y += 0.14) {
    mast.box(0.08, 0.008, 0.008, 'matte', YELLOW, { y, z: 0.035, rz: 0.6 });
    mast.box(0.008, 0.008, 0.08, 'matte', YELLOW, { y, x: 0.035, rx: 0.6 });
  }
  mast.box(0.2, 0.06, 0.2, 'matte', CONCRETE, {});
  const g = mast.finish();

  const jib = new Builder();
  jib.box(1.9, 0.05, 0.05, 'matte', YELLOW, { x: -0.7 });
  jib.box(1.6, 0.008, 0.008, 'matte', YELLOW, { x: -0.8, y: 0.09 });
  jib.box(0.12, 0.1, 0.1, 'pane', '#ffffff', { x: 0.05, y: -0.11, z: 0.07 });
  jib.box(0.12, 0.1, 0.1, 'matte', YELLOW, { x: 0.05, y: -0.11, z: 0.07 });
  jib.box(0.14, 0.09, 0.09, 'matte', CONCRETE, { x: 0.38, y: -0.07 });
  jib.cone(0.04, 0.22, 'matte', YELLOW, { y: 0.05 }, 4);
  const jg = jib.finish();
  jg.position.y = h;
  g.add(jg);

  const hook = new Builder();
  hook.box(0.004, 0.9, 0.004, 'matte', '#37474f', { y: -0.9 });
  hook.box(0.04, 0.03, 0.025, 'matte', '#ff7043', { y: -0.93 });
  hook.box(0.18, 0.012, 0.012, 'matte', '#c25b3a', { y: -1.0 });
  const hg = hook.finish();
  hg.position.set(-1.1, 0, 0);
  jg.add(hg);
  return { g, jib: jg, hook: hg };
}

function excavator() {
  const body = new Builder();
  body.box(0.2, 0.04, 0.14, 'matte', '#37474f', { y: 0 });
  body.box(0.18, 0.08, 0.13, 'matte', YELLOW, { y: 0.04 });
  body.box(0.07, 0.07, 0.07, 'pane', '#ffffff', { y: 0.12, x: 0.04, z: 0.03 });
  const g = body.finish();
  const arm = new Builder();
  arm.box(0.24, 0.025, 0.025, 'matte', YELLOW, { x: 0.12 });
  arm.box(0.03, 0.04, 0.04, 'matte', '#37474f', { x: 0.25, y: -0.03 });
  const ag = arm.finish();
  ag.position.set(-0.08, 0.1, 0);
  ag.rotation.y = Math.PI;
  g.add(ag);
  return { g, arm: ag };
}

function floodlight(b: Builder, x: number, z: number, h: number) {
  b.cyl(0.008, 0.012, h, 'matte', '#607d8b', { x, z }, 6);
  b.box(0.1, 0.05, 0.03, 'matte', '#37474f', { x, z, y: h });
}

export function buildSite(scene: THREE.Scene): SiteRefs {
  const group = new THREE.Group();
  scene.add(group);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Steel I-beam rails around the sheet.
  const rails = new Builder();
  railBeam(rails, L + RAIL_W * 2, 'z', -W / 2 - RAIL_W / 2, -L / 2);
  railBeam(rails, L + RAIL_W * 2, 'z', W / 2 + RAIL_W / 2, -L / 2);
  railBeam(rails, W, 'x', 0, RAIL_W / 2);
  group.add(rails.finish());

  // Static set dressing around the table.
  const props = new Builder();
  brickPallet(props, -0.72, -0.55, 0.2);
  brickPallet(props, -0.76, -0.82, -0.1);
  rebar(props, 0.74, -1.25);
  rebar(props, -0.78, -1.5);
  for (const [x, z, s] of [
    [-0.66, -0.15, 1.2],
    [0.66, -0.15, 1.2],
    [0.7, -0.62, 1],
    [-0.68, -1.15, 1],
    [0.66, -1.75, 1.1],
  ] as const)
    cone(props, x, z, s);
  office(props, -0.55, -2.35);
  scaffold(props, 0.62, -2.62, 0.9, 0.34);
  floodlight(props, -0.72, -1.95, 0.75);
  floodlight(props, 0.74, -2.05, 0.75);
  group.add(props.finish());

  const mixer = new THREE.Group();
  const mb = new Builder();
  mixerBody(mb);
  mixer.add(mb.finish());
  const drumB = new Builder();
  mixerDrum(drumB);
  const drum = drumB.finish();
  drum.position.set(0.02, 0.12, 0);
  drum.rotation.z = -0.5;
  mixer.add(drum);
  mixer.position.set(0.78, 0, -0.95);
  mixer.rotation.y = -0.6;
  group.add(mixer);

  const cr = crane();
  cr.g.position.set(0.95, 0, -3.1);
  group.add(cr.g);

  const ex = excavator();
  ex.g.position.set(0.25, 0, -2.45);
  ex.g.rotation.y = -0.4;
  group.add(ex.g);

  let floors = -1;
  let building: THREE.Group | null = null;
  const buildingAt = new THREE.Vector3(-0.15, 0, -2.95);
  const setFloors = (n: number) => {
    n = Math.max(2, Math.min(12, n));
    if (n === floors) return;
    floors = n;
    if (building) {
      group.remove(building);
      building.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh || (o as THREE.LineSegments).isLineSegments) m.geometry.dispose();
      });
    }
    building = tower(n);
    building.position.copy(buildingAt);
    group.add(building);
  };
  setFloors(3);

  // Flag on the site office: a small cloth that ripples in the wind.
  const flagGeo = new THREE.PlaneGeometry(0.14, 0.08, 8, 3);
  flagGeo.translate(0.07, 0, 0);
  const flagBase = (flagGeo.getAttribute('position').array as Float32Array).slice();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: '#ff7043', side: THREE.DoubleSide }));
  flag.position.set(-0.36, 0.42, -2.35);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 5), new THREE.MeshLambertMaterial({ color: '#90a4ae' }));
  pole.position.set(-0.36, 0.33, -2.35);
  group.add(flag, pole);

  // Dust motes drifting in the light.
  const motes = 40;
  const mpos = new Float32Array(motes * 3);
  for (let i = 0; i < motes; i++) {
    mpos[i * 3] = (Math.random() - 0.5) * 1.6;
    mpos[i * 3 + 1] = Math.random() * 0.6;
    mpos[i * 3 + 2] = -Math.random() * 2.6;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const moteMat = new THREE.PointsMaterial({
    color: '#fff6d8',
    size: 0.012,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(moteGeo, moteMat);
  group.add(dust);

  // Welding sparks at the top of the half-built building.
  const sparkMat = new THREE.PointsMaterial({
    color: '#ffd27a',
    size: 0.02,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparkN = 24;
  const sparkPos = new Float32Array(sparkN * 3);
  const sparkVel = new Float32Array(sparkN * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.visible = false;
  group.add(sparks);
  const flashMat = new THREE.SpriteMaterial({ color: '#bfe3ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const weldFlash = new THREE.Sprite(flashMat);
  weldFlash.scale.setScalar(0.12);
  weldFlash.visible = false;
  group.add(weldFlash);
  let nextWeld = 3;
  let weldT = -1;

  // Floodlight glows (visible at dusk and night).
  const lampMat = new THREE.SpriteMaterial({ color: '#fff3c4', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
  const lamps = [
    [-0.72, 0.77, -1.93],
    [0.74, 0.77, -2.03],
  ].map(([x, y, z]) => {
    const s = new THREE.Sprite(lampMat);
    s.position.set(x, y, z);
    s.scale.setScalar(0.22);
    group.add(s);
    return s;
  });
  void lamps;

  let excavTarget = 0;
  let excavNext = 4;

  return {
    group,
    setFloors,
    setNight(k) {
      lampMat.opacity = k * 0.9;
    },
    update(dt, time) {
      if (reduced) return;
      // Crane: slow sweep of the jib, swaying hook.
      cr.jib.rotation.y = 0.35 + Math.sin(time * 0.07) * 0.55;
      cr.hook.rotation.z = Math.sin(time * 0.9) * 0.05;
      cr.hook.rotation.x = Math.sin(time * 0.7 + 1) * 0.04;
      // Mixer drum turns.
      drum.rotation.y += dt * 1.5;
      // Excavator arm moves to a new pose now and then.
      excavNext -= dt;
      if (excavNext <= 0) {
        excavTarget = (Math.random() - 0.5) * 1.2;
        excavNext = 4 + Math.random() * 5;
      }
      ex.arm.rotation.z += (excavTarget * 0.6 - ex.arm.rotation.z) * Math.min(1, dt * 1.2);
      ex.arm.rotation.y += (Math.PI + excavTarget - ex.arm.rotation.y) * Math.min(1, dt * 0.8);
      // Flag ripple.
      const p = flagGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = flagBase[i * 3];
        p.setZ(i, Math.sin(x * 40 - time * 6) * 0.012 * (x / 0.14));
      }
      p.needsUpdate = true;
      // Dust motes drift and wrap around.
      for (let i = 0; i < motes; i++) {
        mpos[i * 3] += Math.sin(time * 0.3 + i) * dt * 0.01 + dt * 0.006;
        mpos[i * 3 + 1] += Math.cos(time * 0.4 + i * 1.7) * dt * 0.006;
        if (mpos[i * 3] > 0.8) mpos[i * 3] = -0.8;
      }
      moteGeo.getAttribute('position').needsUpdate = true;
      // Welding: every 6-10 s a burst of sparks and a blue-white flicker.
      nextWeld -= dt;
      if (nextWeld <= 0 && building) {
        nextWeld = 6 + Math.random() * 4;
        weldT = 0;
        const top = buildingAt.clone().add(new THREE.Vector3(0.2, 0.04 + floors * 0.18, 0.18));
        weldFlash.position.copy(top);
        for (let i = 0; i < sparkN; i++) {
          sparkPos.set([top.x, top.y, top.z], i * 3);
          sparkVel.set([(Math.random() - 0.5) * 0.5, Math.random() * 0.4, (Math.random() - 0.2) * 0.5], i * 3);
        }
      }
      if (weldT >= 0) {
        weldT += dt;
        sparks.visible = weldFlash.visible = weldT < 1.2;
        flashMat.opacity = weldT < 0.8 ? 0.5 + 0.5 * Math.sin(weldT * 70) : 0;
        for (let i = 0; i < sparkN; i++) {
          sparkVel[i * 3 + 1] -= dt * 1.6;
          sparkPos[i * 3] += sparkVel[i * 3] * dt;
          sparkPos[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
          sparkPos[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
        }
        sparkGeo.getAttribute('position').needsUpdate = true;
        if (weldT > 1.2) weldT = -1;
      }
    },
  };
}
