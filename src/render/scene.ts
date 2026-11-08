import * as THREE from 'three';
import { CONFIG } from '../core/config';
import { ERA_RING, tier } from '../core/tiers';
import { badgeTexture, blobTexture, blueprintTexture, dashTexture, dotTexture, hazardTexture } from './textures';
import { Lighting, type TimeOfDay } from './lighting';
import { buildRails, RAIL_H, RAIL_W } from './site';
import { animateMaterials } from '../models/materials';
import { createModel, modelSize, tickAnims, wireframe, type ModelAnims } from '../models';
import { Builder } from '../models/kit';
import { ParticleFx, type Effect } from './fx';

const W = CONFIG.tableWidth;
const L = CONFIG.tableLength;

/** Table coords (x across, y away from player) -> world (x, up, -y). */
const toWorld = (x: number, y: number, h = 0) => new THREE.Vector3(x, h, -y);

export interface PieceView {
  tier: number;
  group: THREE.Group; // positioned on the table
  body: THREE.Group; // the building model (scaled to world size)
  anims: ModelAnims;
  radius: number;
  height: number;
  flash: number;
  flashObj: THREE.Object3D | null;
  pop: number; // seconds since spawn-pop started; <0 = no pop
  build: number; // seconds into the merge build-in sequence; <0 = none
  wire: THREE.LineSegments | null;
  /** Crane Lift in progress: the building arcs from one spot to another. */
  held?: { from: { x: number; y: number }; to: { x: number; y: number }; t: number; done: () => void; cable: THREE.Line };
  /** Crane Lift drag: the building hovers on a cable at this table position. */
  carry?: { x: number; y: number; cable: THREE.Line; lift: number };
}

// Merge build-in timeline (seconds): twins converge, blueprint wireframe draws in,
// then the solid fills from the bottom up with a squash-and-stretch pop.
// After filling, the new building hops up and lands with a squash.
const BUILD_CONVERGE = 0.08;
const BUILD_WIRE = 0.17;
const BUILD_FILL = 0.29;
const BUILD_HOP = 0.46;
const BUILD_END = 0.6;

const clamp01 = (u: number) => Math.min(1, Math.max(0, u));
const easeOut = (u: number) => 1 - Math.pow(1 - u, 3);

export function pieceRadius(tierId: number) {
  return (tier(tierId).footprint * CONFIG.footprintScale) / 2;
}

export class SceneView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.05, 60);
  private target = new THREE.Vector3(0, 0, -L / 2);
  private dist = 3;
  private readonly tilt = THREE.MathUtils.degToRad(CONFIG.cameraTilt);
  private effects: Effect[] = [];
  private aim: THREE.Mesh;
  private failLine: THREE.Mesh;
  private failMat: THREE.MeshBasicMaterial;
  private ray = new THREE.Raycaster();
  private camShake = 0;
  private time = 0;
  private hudTop = 0;
  private hudBottom = 0;
  private width = 1;
  private height = 1;
  // Adaptive resolution: drop the pixel ratio when frames run slow (older iPhones).
  private dpr = 1;
  private frameAvg = 1 / 60;
  private frameClock = 0;
  private blobMat = new THREE.MeshBasicMaterial({
    map: blobTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  private blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  readonly fx: ParticleFx;
  private badgeMats = new Map<number, THREE.SpriteMaterial>();
  private sheetMat = new THREE.MeshBasicMaterial({ map: blueprintTexture() });
  private lighting!: Lighting;
  // Camera ease-back for tall buildings: fitted camera for normal and tall tables.
  private fitNormal = { dist: 3, z: -L / 2 };
  private fitTall = { dist: 3, z: -L / 2 };
  private tallK = 0;
  private tallTarget = 0;

  constructor(canvas: HTMLCanvasElement, onTint: (css: string) => void = () => undefined) {
    // MSAA is nearly free on iPhone/iPad GPUs (tile-based), so edges stay clean.
    // The canvas is transparent: the painted construction site shows through behind it.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.dpr = this.targetDpr(window.innerWidth);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.buildTable();
    buildRails(this.scene);
    this.lighting = new Lighting(this.scene, this.sheetMat, () => undefined, onTint);
    this.fx = new ParticleFx(this.scene, (e) => this.effects.push(e));

    // Aim line: dotted strip, scaled along its length every frame.
    const dots = dotTexture();
    const aimGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -0.5);
    this.aim = new THREE.Mesh(
      aimGeo,
      new THREE.MeshBasicMaterial({ map: dots, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.aim.renderOrder = 2;
    this.aim.visible = false;
    this.scene.add(this.aim);

    // Fail line (site boundary): red dashes that pulse when in danger.
    const red = dashTexture('#ff3b30', 0.55);
    red.repeat.set(14, 1);
    this.failMat = new THREE.MeshBasicMaterial({ map: red, transparent: true, opacity: 0.85, depthWrite: false });
    this.failLine = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.014).rotateX(-Math.PI / 2), this.failMat);
    this.failLine.position.copy(toWorld(0, CONFIG.failY, 0.003));
    this.failLine.renderOrder = 1;
    this.scene.add(this.failLine);
    for (const sx of [-1, 1]) this.scene.add(this.cone(sx * (W / 2 - 0.025), CONFIG.failY));
  }

  private buildTable() {
    // Soft contact shadow so the table sits on the painted ground.
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 1.6, L * 1.25).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, opacity: 0.7, depthWrite: false }),
    );
    shadow.position.set(0.05, -0.07, -L / 2 - 0.04);
    this.scene.add(shadow);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(W + RAIL_W * 2 + 0.06, 0.06, L + RAIL_W * 2 + 0.06),
      new THREE.MeshLambertMaterial({ color: '#7a5634' }),
    );
    base.position.set(0, -0.031, -L / 2);
    this.scene.add(base);

    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2), this.sheetMat);
    sheet.position.set(0, 0, -L / 2);
    this.scene.add(sheet);

    // Heavier back beam with hazard tape facing the player.
    const hazard = new THREE.MeshLambertMaterial({ map: hazardTexture() });
    const yellow = new THREE.MeshLambertMaterial({ color: '#f5c400' });
    const back = new THREE.Mesh(new THREE.BoxGeometry(W + RAIL_W * 2, RAIL_H * 1.6, RAIL_W * 1.4), [
      yellow, yellow, yellow, yellow, hazard, yellow,
    ]);
    back.position.set(0, RAIL_H * 0.8, -L - RAIL_W * 0.7);
    this.scene.add(back);
  }

  private cone(x: number, y: number) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(
      new THREE.ConeGeometry(0.016, 0.045, 12),
      new THREE.MeshLambertMaterial({ color: '#ff7a1a' }),
    );
    c.position.y = 0.0225;
    g.add(c);
    g.position.copy(toWorld(x, y));
    return g;
  }

  // ---------------------------------------------------------------- layout

  /** Fit the table into the screen band between the top and bottom HUD. */
  resize(width: number, height: number, hudTop: number, hudBottom: number) {
    this.width = width;
    this.height = height;
    this.hudTop = hudTop;
    this.hudBottom = hudBottom;
    this.dpr = Math.max(Math.min(this.dpr, this.targetDpr(width)), this.minDpr());
    if (this.dpr < this.targetDpr(width) && this.frameAvg <= 1 / 58) this.dpr = this.targetDpr(width);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = 35;
    this.camera.updateProjectionMatrix();
    this.fit();
  }

  /**
   * Fit the table into the band between the HUDs, leaving a little scenery at
   * the sides. `headroom` is how much height above the back rail must stay in
   * view (more when tall towers stand on the table).
   */
  private fitFor(headroom: number) {
    this.fitting = true;
    const top = 1 - (2 * (this.hudTop + CONFIG.topGap * this.height)) / this.height;
    const bottom = -1 + (2 * this.hudBottom) / this.height;
    const xr = 0.9;
    const pts = [
      toWorld(-W / 2 - RAIL_W, -RAIL_W),
      toWorld(W / 2 + RAIL_W, -RAIL_W),
      toWorld(-W / 2 - RAIL_W, L + RAIL_W, headroom),
      toWorld(W / 2 + RAIL_W, L + RAIL_W, headroom),
    ];
    const v = new THREE.Vector3();
    for (let i = 0; i < 60; i++) {
      this.placeCamera();
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const p of pts) {
        v.copy(p).project(this.camera);
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }
      const s = Math.max((maxX - minX) / (2 * xr), (maxY - minY) / (top - bottom));
      this.dist *= Math.pow(s, 0.6);
      const off = (maxY + minY) / 2 - (top + bottom) / 2;
      this.target.z -= off * 0.35 * this.dist;
    }
    this.fitting = false;
    return { dist: this.dist, z: this.target.z };
  }

  private fit() {
    this.fitTall = this.fitFor(0.55);
    this.fitNormal = this.fitFor(0.12);
    // The brief caps the ease-back at 10%.
    this.fitTall.dist = Math.min(this.fitTall.dist, this.fitNormal.dist * 1.1);
    this.applyFit();
  }

  private applyFit() {
    const k = this.tallK;
    this.dist = this.fitNormal.dist + (this.fitTall.dist - this.fitNormal.dist) * k;
    this.target.z = this.fitNormal.z + (this.fitTall.z - this.fitNormal.z) * k;
    this.placeCamera();
  }

  private obstacleGroup: THREE.Group | null = null;

  /** Scaffold bumpers: a plank barrier on two posts with a top rail and hazard tape. */
  setObstacles(list: [number, number, number, number][]) {
    if (this.obstacleGroup) {
      this.scene.remove(this.obstacleGroup);
      this.obstacleGroup.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      this.obstacleGroup = null;
    }
    if (!list.length) return;
    const b = new Builder();
    for (const [x, y, w, h] of list) {
      const z = -y;
      b.box(w, 0.035, h, 'wood', '#d39b4a', { x, z });
      for (let i = 0; i < 5; i++) b.box(w / 10, 0.012, 0.004, 'matte', i % 2 ? '#222222' : '#f5c400', { x: x - w / 2 + (w / 5) * (i + 0.5), z: z + h / 2 + 0.002, y: 0.012 });
      for (const sx of [-1, 1]) b.cyl(0.008, 0.009, 0.085, 'matte', '#9aa3ad', { x: x + sx * (w / 2 - 0.01), z }, 8);
      b.box(w, 0.01, 0.012, 'matte', '#c0c6cc', { x, z, y: 0.075 });
    }
    this.obstacleGroup = b.finish();
    this.scene.add(this.obstacleGroup);
  }

  /** Height (world) of the tallest building on the table; the camera eases back for 13+. */
  setTallest(h: number) {
    this.tallTarget = Math.min(1, Math.max(0, (h - 0.35) / 0.3));
  }

  setTimeOfDay(t: TimeOfDay) {
    this.lighting.set(t);
  }


  /**
   * Showcase camera for the title screen: higher, further back and gently
   * swaying. `showK` blends between it (1) and the play camera (0).
   */
  private showK = 1;
  private showFrom = 1;
  private showTo = 1;
  private showT = 1;
  private showDur = 1.2;

  /** Glide between the title showcase (true) and the play view (false). */
  setShowcase(on: boolean, duration = 1.2) {
    this.showFrom = this.showK;
    this.showTo = on ? 1 : 0;
    this.showT = 0;
    this.showDur = duration;
  }

  private placeCamera() {
    const k = this.fitting ? 0 : this.showK;
    const tilt = this.tilt + THREE.MathUtils.degToRad(17) * k;
    const d = this.dist * (1 + 0.28 * k);
    const yaw = k * Math.sin(this.time * 0.35) * 0.1;
    const ty = this.target.z - 0.15 * k;
    this.camera.position.set(
      this.target.x + Math.sin(yaw) * Math.cos(tilt) * d,
      this.target.y + Math.sin(tilt) * d,
      ty + Math.cos(yaw) * Math.cos(tilt) * d,
    );
    this.camera.lookAt(this.target.x, this.target.y, ty);
    this.camera.updateMatrixWorld();
  }
  private fitting = false;

  /** Screen pixel -> table coordinates (or null if off the plane). */
  toTable(px: number, py: number): { x: number; y: number } | null {
    const ndc = new THREE.Vector2((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const o = this.ray.ray.origin;
    const d = this.ray.ray.direction;
    if (Math.abs(d.y) < 1e-6) return null;
    const t = -o.y / d.y;
    if (t < 0) return null;
    return { x: o.x + d.x * t, y: -(o.z + d.z * t) };
  }

  toScreen(x: number, y: number, h = 0): { x: number; y: number } {
    const v = toWorld(x, y, h).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }

  // ---------------------------------------------------------------- pieces

  createPiece(tierId: number): PieceView {
    const r = pieceRadius(tierId);
    const { height } = modelSize(tierId);
    const { group: body, anims } = createModel(tierId);
    const group = new THREE.Group();
    // Cheap blob shadow instead of a real-time shadow map (much faster on phones).
    const blob = new THREE.Mesh(this.blobGeo, this.blobMat);
    const bs = r * 2.6 + Math.min(height, 0.3) * 0.5;
    blob.scale.set(bs, 1, bs);
    blob.position.set(r * 0.2 + Math.min(height, 0.3) * 0.2, 0.0015, -Math.min(height, 0.3) * 0.12);
    blob.renderOrder = 1;
    group.add(blob, body, this.badge(tierId, r));
    this.scene.add(group);
    return { tier: tierId, group, body, anims, radius: r, height, flash: 0, flashObj: null, pop: -1, build: -1, wire: null };
  }

  /** Rank badge standing at the front edge of the piece, always facing the camera. */
  private badge(tierId: number, r: number) {
    let mat = this.badgeMats.get(tierId);
    if (!mat) {
      const t = tier(tierId);
      // Drawn over its own building so the rank is never hidden.
      mat = new THREE.SpriteMaterial({
        map: badgeTexture(tierId, t.color, ERA_RING[t.era], t.era === 4),
        depthWrite: false,
        depthTest: false,
      });
      this.badgeMats.set(tierId, mat);
    }
    const s = new THREE.Sprite(mat);
    const size = Math.max(0.06, r * 0.7);
    s.scale.set(size, size, 1);
    s.center.set(0.5, 0.35);
    s.position.set(0, 0.004, r * 0.95);
    s.renderOrder = 7;
    return s;
  }

  removePiece(p: PieceView) {
    this.scene.remove(p.group);
    this.dropWire(p);
    this.dropFlash(p);
  }

  private dropWire(p: PieceView) {
    if (!p.wire) return;
    p.body.remove(p.wire);
    p.wire.geometry.dispose();
    (p.wire.material as THREE.Material).dispose();
    p.wire = null;
  }

  /** White silhouette flash: a clone of the model drawn in flat white, fading out. */
  private startFlash(p: PieceView, dur: number) {
    this.dropFlash(p);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1, depthWrite: false });
    const ghost = p.body.clone();
    ghost.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = mat;
      if ((o as THREE.LineSegments).isLineSegments) o.visible = false;
    });
    ghost.scale.multiplyScalar(1.03);
    ghost.renderOrder = 6;
    p.group.add(ghost);
    p.flashObj = ghost;
    p.flash = dur;
  }

  private dropFlash(p: PieceView) {
    if (!p.flashObj) return;
    p.group.remove(p.flashObj);
    let mat: THREE.Material | null = null;
    p.flashObj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) mat = m.material as THREE.Material;
    });
    (mat as THREE.Material | null)?.dispose();
    p.flashObj = null;
    p.flash = 0;
  }

  /** The two merging pieces slide into their midpoint and vanish. */
  converge(a: PieceView, b: PieceView, x: number, y: number, onImpact?: () => void) {
    const starts = [a, b].map((v) => v.group.position.clone());
    const target = toWorld(x, y);
    this.startFlash(a, BUILD_CONVERGE + 0.03);
    this.startFlash(b, BUILD_CONVERGE + 0.03);
    let t = 0;
    this.effects.push({
      update: (dt) => {
        t += dt;
        const u = clamp01(t / BUILD_CONVERGE);
        const e = u * u * u; // accelerate into each other
        [a, b].forEach((v, i) => {
          v.group.position.lerpVectors(starts[i], target, e);
          // Swell slightly as they collide, then get swallowed by the flash.
          const sw = 1 + 0.18 * Math.sin(u * Math.PI * 0.5);
          v.group.scale.set(sw, sw * (1 - 0.15 * e), sw);
        });
        return u < 1;
      },
      dispose: () => {
        this.removePiece(a);
        this.removePiece(b);
        onImpact?.();
      },
    });
  }

  /** `yaw` is the physics spin on the table; `tilt` is a small aiming wobble. */
  placePiece(p: PieceView, x: number, y: number, tilt = 0, yaw = 0) {
    if (p.carry) {
      // Lifted by the crane: hover above the drop spot with a gentle sway.
      const c = p.carry;
      p.group.position.set(c.x, c.lift + Math.sin(this.time * 4) * 0.008, -c.y);
      p.group.rotation.set(Math.sin(this.time * 2.6) * 0.03, 0, Math.sin(this.time * 3.1) * 0.04);
      return;
    }
    if (p.held) {
      // Lift, swing over, set down: an arc with ease in and out.
      const u = p.held.t;
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const hx = p.held.from.x + (p.held.to.x - p.held.from.x) * e;
      const hy = p.held.from.y + (p.held.to.y - p.held.from.y) * e;
      p.group.position.set(hx, Math.sin(u * Math.PI) * 0.22, -hy);
      p.group.rotation.set(0, 0, Math.sin(u * Math.PI * 3) * 0.06);
      return;
    }
    p.group.position.set(x, 0, -y);
    p.group.rotation.set(0, yaw, tilt);
  }

  /** Squash-and-stretch pop: 0.6 -> 1.18 -> 0.95 -> 1.0 over 0.32 s. */
  private popScale(t: number) {
    const k = [
      [0, 0.6],
      [0.1, 1.18],
      [0.2, 0.95],
      [0.32, 1],
    ];
    if (t >= 0.32) return 1;
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i][0]) {
        const a = k[i - 1];
        const b = k[i];
        const u = (t - a[0]) / (b[0] - a[0]);
        const e = u * u * (3 - 2 * u);
        return a[1] + (b[1] - a[1]) * e;
      }
    }
    return 1;
  }

  private cableFor(p: PieceView) {
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, p.height + 0.01, 0), new THREE.Vector3(0, 4, 0)]),
      new THREE.LineBasicMaterial({ color: '#37474f' }),
    );
  }

  /** Crane Lift drag: lift the building on a cable; move it with `moveCarry`, set it down with `endCarry`. */
  startCarry(p: PieceView, x: number, y: number) {
    const cable = this.cableFor(p);
    p.group.add(cable);
    p.carry = { x, y, cable, lift: 0.1 + Math.min(0.15, p.height * 0.3) };
  }

  moveCarry(p: PieceView, x: number, y: number) {
    if (!p.carry) return;
    // Ease toward the finger so the swing feels weighty, not glued.
    p.carry.x += (x - p.carry.x) * 0.55;
    p.carry.y += (y - p.carry.y) * 0.55;
  }

  endCarry(p: PieceView, landed: boolean) {
    if (!p.carry) return;
    p.group.remove(p.carry.cable);
    p.carry.cable.geometry.dispose();
    (p.carry.cable.material as THREE.Material).dispose();
    p.carry = undefined;
    if (landed) p.pop = 0.1;
  }

  private dropMarker: THREE.Mesh | null = null;

  /** Footprint ring where a carried building will land: green if it fits, red if not. */
  setDropMarker(x: number, y: number, r: number, ok: boolean): void;
  setDropMarker(hide: null): void;
  setDropMarker(x: number | null, y = 0, r = 0, ok = true) {
    if (x === null) {
      if (this.dropMarker) this.dropMarker.visible = false;
      return;
    }
    if (!this.dropMarker) {
      const mat = new THREE.MeshBasicMaterial({ color: '#4cff7a', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2), mat);
      const fill = new THREE.Mesh(new THREE.CircleGeometry(0.86, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#4cff7a', transparent: true, opacity: 0.18, depthWrite: false }));
      ring.add(fill);
      ring.renderOrder = 3;
      this.scene.add(ring);
      this.dropMarker = ring;
    }
    const m = this.dropMarker;
    m.visible = true;
    m.position.set(x, 0.005, -y);
    const pulse = 1 + Math.sin(this.time * 8) * 0.04;
    m.scale.set(r * pulse, 1, r * pulse);
    const col = ok ? '#4cff7a' : '#ff4d4d';
    (m.material as THREE.MeshBasicMaterial).color.set(col);
    ((m.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(col);
  }

  /** Crane Lift: animates the building along an arc on a cable, then calls `done` on landing. */
  craneLift(p: PieceView, from: { x: number; y: number }, to: { x: number; y: number }, done: () => void) {
    const cable = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, p.height + 0.01, 0), new THREE.Vector3(0, 4, 0)]),
      new THREE.LineBasicMaterial({ color: '#37474f' }),
    );
    p.group.add(cable);
    p.held = { from, to, t: 0, done, cable };
  }

  animatePiece(p: PieceView, dt: number) {
    if (p.held) {
      p.held.t = Math.min(1, p.held.t + dt / 0.65);
      if (p.held.t >= 1) {
        const h = p.held;
        p.held = undefined;
        p.group.remove(h.cable);
        h.cable.geometry.dispose();
        (h.cable.material as THREE.Material).dispose();
        p.pop = 0.1;
        h.done();
      }
    }
    if (p.build >= 0) this.animateBuild(p, dt);
    if (p.pop >= 0) {
      p.pop += dt;
      const s = this.popScale(p.pop);
      p.group.scale.set(s, 1 + (s - 1) * 1.4, s);
      if (p.pop >= 0.32) {
        p.pop = -1;
        p.group.scale.set(1, 1, 1);
      }
    }
    if (p.flashObj) {
      p.flash = Math.max(0, p.flash - dt);
      p.flashObj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) (m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, p.flash / 0.12);
      });
      if (p.flash === 0) this.dropFlash(p);
    }
    tickAnims(p.anims, this.time);
  }

  /** Squash on landing: wide and short, springing back. */
  private landScale(t: number) {
    const u = clamp01(t / (BUILD_END - BUILD_HOP));
    const k = Math.sin(u * Math.PI) * (1 - u) * 1.6;
    return { xz: 1 + 0.14 * k, y: 1 - 0.2 * k };
  }

  private animateBuild(p: PieceView, dt: number) {
    const before = p.build;
    p.build += dt;
    const t = p.build;
    if (t < BUILD_CONVERGE) {
      p.group.visible = false;
      return;
    }
    p.group.visible = true;
    if (!p.wire) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', wireframe(p.tier));
      const mat = new THREE.LineBasicMaterial({ color: '#e6f6ff', transparent: true, opacity: 1, depthTest: false });
      p.wire = new THREE.LineSegments(geo, mat);
      p.wire.renderOrder = 5;
      p.body.add(p.wire);
    }
    const count = wireframe(p.tier).count;
    const wireU = clamp01((t - BUILD_CONVERGE) / (BUILD_WIRE - BUILD_CONVERGE));
    p.wire.geometry.setDrawRange(0, Math.max(2, Math.floor((wireU * count) / 2) * 2));
    const fillU = clamp01((t - BUILD_WIRE) / (BUILD_FILL - BUILD_WIRE));
    // Fill solid from the bottom up; the wireframe (a child of the body) is kept at full height.
    const d = modelSize(p.tier).diameter;
    const fy = Math.max(0.001, easeOut(fillU));
    p.body.scale.set(d, d * fy, d);
    p.wire.scale.set(1, 1 / fy, 1);
    for (const c of p.body.children) if (c !== p.wire) c.visible = fillU > 0;
    const pop = this.popScale(t - BUILD_CONVERGE);
    p.group.scale.set(pop, 1, pop);
    // Hop: up and back down between fill and landing.
    if (t > BUILD_FILL && t < BUILD_HOP) {
      const u = (t - BUILD_FILL) / (BUILD_HOP - BUILD_FILL);
      p.group.position.y += Math.sin(u * Math.PI) * (p.radius * 0.45 + 0.01);
    } else if (t >= BUILD_HOP) {
      const l = this.landScale(t - BUILD_HOP);
      p.group.scale.set(l.xz, l.y, l.xz);
      if (before < BUILD_HOP) this.fx.dust(p.group.position.x, -p.group.position.z, p.radius * 1.4, '#ffffff', 4);
    }
    if (before < BUILD_WIRE && t >= BUILD_WIRE) this.startFlash(p, 0.16);
    (p.wire.material as THREE.LineBasicMaterial).opacity = 1 - clamp01((t - BUILD_FILL) / (BUILD_END - BUILD_FILL));
    if (t >= BUILD_END) {
      p.build = -1;
      p.body.scale.setScalar(d);
      for (const c of p.body.children) c.visible = true;
      p.group.scale.set(1, 1, 1);
      this.dropWire(p);
    }
  }

  // ---------------------------------------------------------------- effects

  setAim(x: number, y0: number, y1: number | null) {
    if (y1 === null) {
      this.aim.visible = false;
      return;
    }
    const len = Math.max(0.01, y1 - y0);
    this.aim.visible = true;
    this.aim.position.set(x, 0.004, -y0);
    this.aim.scale.set(0.014, 1, len);
    const map = (this.aim.material as THREE.MeshBasicMaterial).map!;
    map.repeat.set(1, len / 0.03);
    map.offset.y = -this.time * 1.2;
  }

  setDanger(level: number) {
    const pulse = level > 0 ? 0.5 + 0.5 * Math.sin(this.time * 10) : 0;
    this.failMat.opacity = 0.75 + 0.25 * pulse;
    this.failLine.scale.z = 1 + pulse * 1.5;
    this.failMat.color.setRGB(1, 1 - pulse * 0.3, 1 - pulse * 0.3);
  }

  ring(x: number, y: number, radius: number, color: string) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2), mat);
    m.position.copy(toWorld(x, y, 0.006));
    m.renderOrder = 3;
    this.scene.add(m);
    let t = 0;
    const dur = 0.4;
    this.effects.push({
      update: (dt) => {
        t += dt;
        const u = Math.min(1, t / dur);
        const s = radius * (1 + 1.6 * (1 - Math.pow(1 - u, 3)));
        m.scale.set(s, 1, s);
        mat.opacity = 0.9 * (1 - u);
        return u < 1;
      },
      dispose: () => {
        this.scene.remove(m);
        m.geometry.dispose();
        mat.dispose();
      },
    });
  }

  /**
   * Builds a tier's model, outline and blueprint wireframe ahead of time and
   * compiles its shaders, so the first merge into a new tier never stalls a frame.
   */
  prewarm(tierId: number) {
    wireframe(tierId);
    const tmp = new THREE.Scene();
    const p = this.createPiece(tierId);
    this.scene.remove(p.group);
    tmp.add(p.group, ...this.scene.children.filter((o) => (o as THREE.Light).isLight).map((l) => l.clone()));
    this.renderer.compile(tmp, this.camera);
    this.removePiece(p);
  }

  /**
   * Plays every effect once, out of sight, and compiles its shaders, so the
   * first merge of the session is as smooth as the hundredth.
   */
  prewarmFx() {
    const p = this.createPiece(6);
    p.group.position.set(0, -40, 0);
    p.build = 0.2;
    this.animatePiece(p, 0.05);
    this.startFlash(p, 0.1);
    for (const era of [1, 2, 3, 4] as const) this.fx.merge(0, 0, era, '#ffffff', 2);
    this.fx.impact(0, 0, 0.1, '#ffffff', 2);
    this.fx.dust(0, 0, 0.1);
    this.ring(0, 0, 0.1, '#ffffff');
    // Nothing is rendered in between, so none of this is ever seen.
    for (const e of this.effects) e.update(0.016);
    this.renderer.compile(this.scene, this.camera);
    for (const e of this.effects) e.dispose();
    this.effects = [];
    this.removePiece(p);
  }

  quality() {
    const info = this.renderer.info.render;
    return `${this.dpr.toFixed(2)}x · ${info.calls} draws · ${info.triangles} tris`;
  }

  /** Brief screen-space kick for big moments. */
  shake(amount: number) {
    this.camShake = Math.max(this.camShake, amount);
  }

  /**
   * Render resolution: at least 1080 physical pixels across (true 1080p on
   * phones), never more than the screen has, and never above 3x.
   */
  private targetDpr(cssWidth: number) {
    const dev = window.devicePixelRatio || 1;
    return Math.min(dev, 3, Math.max(2, 1080 / Math.max(1, cssWidth)));
  }

  /** The lowest resolution allowed when frames run slow: never blurrier than 2x. */
  private minDpr() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  private setDpr(d: number) {
    if (Math.abs(d - this.dpr) < 0.01) return;
    this.dpr = d;
    this.renderer.setPixelRatio(d);
    this.renderer.setSize(this.width, this.height, false);
  }

  /** Ignore frame times while loading or animating menus; only steady play counts. */
  private qualityWarmup = 4;

  /**
   * Adaptive resolution with hysteresis: steps down 0.25x after 2 s of
   * sustained slow frames (never below 2x), and back up after 6 s of fast ones.
   * One-off hitches don't count: it uses a trimmed average of the window.
   */
  private frameTimes: number[] = [];
  private adaptQuality(dt: number) {
    if (dt <= 0 || dt > 0.25) return;
    if (this.qualityWarmup > 0) {
      this.qualityWarmup -= dt;
      return;
    }
    this.frameTimes.push(dt);
    this.frameClock += dt;
    if (this.frameClock < 2) return;
    const sorted = this.frameTimes.sort((a, b) => a - b);
    const trimmed = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.9)));
    const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    this.frameTimes = [];
    this.frameClock = 0;
    this.frameAvg = avg;
    if (avg > 1 / 52) this.setDpr(Math.max(this.minDpr(), this.dpr - 0.25));
    else if (avg < 1 / 58) {
      this.fastWindows++;
      if (this.fastWindows >= 3) {
        this.fastWindows = 0;
        this.setDpr(Math.min(this.targetDpr(this.width), this.dpr + 0.25));
      }
      return;
    }
    this.fastWindows = 0;
  }
  private fastWindows = 0;

  /** Restart the quality warm-up (after loading or big transitions). */
  settleQuality(seconds = 2) {
    this.qualityWarmup = Math.max(this.qualityWarmup, seconds);
  }

  update(dt: number) {
    this.adaptQuality(dt);
    this.time += dt;
    animateMaterials(this.time);
    this.lighting.update(dt);
    if (this.showT < 1) {
      this.showT = Math.min(1, this.showT + dt / this.showDur);
      const u = this.showT;
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      this.showK = this.showFrom + (this.showTo - this.showFrom) * e;
    }
    if (Math.abs(this.tallK - this.tallTarget) > 0.001) {
      this.tallK += (this.tallTarget - this.tallK) * Math.min(1, dt * 1.5);
      this.applyFit();
    }
    // Effects may spawn new effects when they finish (a merge's impact), so
    // swap in a fresh list first and keep anything added meanwhile.
    const running = this.effects;
    this.effects = [];
    const alive = running.filter((e) => {
      const ok = e.update(dt);
      if (!ok) e.dispose();
      return ok;
    });
    this.effects = alive.concat(this.effects);
    this.placeCamera();
    if (this.camShake > 0) {
      const px = this.camShake * 0.0025;
      this.camera.position.x += (Math.random() - 0.5) * px;
      this.camera.position.y += (Math.random() - 0.5) * px;
      this.camShake = Math.max(0, this.camShake - dt * 30);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
