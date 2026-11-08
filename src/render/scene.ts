import * as THREE from 'three';
import { CONFIG } from '../core/config';
import { tier } from '../core/tiers';
import { blobTexture, blueprintTexture, capTexture, dashTexture, dotTexture, hazardTexture } from './textures';

const W = CONFIG.tableWidth;
const L = CONFIG.tableLength;
const RAIL_W = 0.045;
const RAIL_H = 0.05;

/** Table coords (x across, y away from player) -> world (x, up, -y). */
const toWorld = (x: number, y: number, h = 0) => new THREE.Vector3(x, h, -y);

export interface PieceView {
  group: THREE.Group;
  body: THREE.Mesh;
  side: THREE.MeshStandardMaterial;
  radius: number;
  height: number;
  flash: number;
  pop: number; // seconds since spawn-pop started; <0 = no pop
}

interface Effect {
  update(dt: number): boolean; // false when finished
  dispose(): void;
}

export function pieceRadius(tierId: number) {
  return (tier(tierId).footprint * CONFIG.footprintScale) / 2;
}

export class SceneView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.05, 60);
  private target = new THREE.Vector3(0, 0, -L / 2);
  private dist = 3;
  private readonly tilt = THREE.MathUtils.degToRad(55);
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
  private burstGeo = new THREE.BoxGeometry(0.014, 0.014, 0.014);
  private burstMats = new Map<string, THREE.MeshStandardMaterial>();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.scene.background = new THREE.Color('#e7cf9f');
    this.scene.fog = new THREE.Fog('#e7cf9f', 4, 10);

    const hemi = new THREE.HemisphereLight('#fff6e6', '#8a6f4a', 1.4);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
    sun.position.set(-1.2, 3, 0.6);
    sun.target.position.set(0, 0, -L / 2);
    this.scene.add(sun, sun.target);

    this.buildTable();

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
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#c79a5c', roughness: 0.9 }),
    );
    ground.position.set(0, -0.06, -L / 2);
    this.scene.add(ground);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(W + RAIL_W * 2 + 0.06, 0.06, L + RAIL_W * 2 + 0.06),
      new THREE.MeshStandardMaterial({ color: '#7a5634', roughness: 0.7 }),
    );
    base.position.set(0, -0.031, -L / 2);
    this.scene.add(base);

    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: blueprintTexture(), roughness: 0.85 }),
    );
    sheet.position.set(0, 0, -L / 2);
    this.scene.add(sheet);

    const steel = new THREE.MeshStandardMaterial({ color: '#8d99a8', roughness: 0.35, metalness: 0.6 });
    const railGeo = (lx: number, lz: number) => new THREE.BoxGeometry(lx, RAIL_H, lz);
    const addRail = (geo: THREE.BufferGeometry, x: number, z: number, mat: THREE.Material = steel) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, RAIL_H / 2, z);
      this.scene.add(m);
    };
    addRail(railGeo(RAIL_W, L + RAIL_W * 2), -W / 2 - RAIL_W / 2, -L / 2);
    addRail(railGeo(RAIL_W, L + RAIL_W * 2), W / 2 + RAIL_W / 2, -L / 2);
    addRail(railGeo(W, RAIL_W), 0, RAIL_W / 2);
    const hazard = new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.5 });
    const yellow = new THREE.MeshStandardMaterial({ color: '#f5c400', roughness: 0.5 });
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
      new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.5 }),
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
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = 35;
    this.camera.updateProjectionMatrix();
    this.fit();
  }

  private fit() {
    const top = 1 - (2 * this.hudTop) / this.height;
    const bottom = -1 + (2 * this.hudBottom) / this.height;
    const xr = 0.96;
    const pts = [
      toWorld(-W / 2 - RAIL_W, -RAIL_W),
      toWorld(W / 2 + RAIL_W, -RAIL_W),
      toWorld(-W / 2 - RAIL_W, L + RAIL_W, 0.12),
      toWorld(W / 2 + RAIL_W, L + RAIL_W, 0.12),
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
    this.placeCamera();
  }

  private placeCamera() {
    const d = this.dist;
    this.camera.position.set(
      this.target.x,
      this.target.y + Math.sin(this.tilt) * d,
      this.target.z + Math.cos(this.tilt) * d,
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

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
    const t = tier(tierId);
    const r = pieceRadius(tierId);
    const h = Math.max(0.035, t.height * CONFIG.heightScale);
    const taper = tierId >= 11 ? 0.8 : 1;
    const geo = new THREE.CylinderGeometry(r * taper, r, h, 36);
    geo.translate(0, h / 2, 0);
    const side = new THREE.MeshStandardMaterial({
      color: t.color,
      roughness: 0.45,
      metalness: t.era >= 3 ? 0.15 : 0,
      emissive: new THREE.Color(tierId === 18 ? '#bfe9ff' : '#000000'),
      emissiveIntensity: tierId === 18 ? 0.6 : 1,
    });
    const top = new THREE.MeshStandardMaterial({ map: capTexture(tierId, t.color), roughness: 0.4 });
    const body = new THREE.Mesh(geo, [side, top, side]);
    body.userData.tier = tierId;
    const group = new THREE.Group();
    // Cheap blob shadow instead of a real-time shadow map (much faster on phones).
    const blob = new THREE.Mesh(this.blobGeo, this.blobMat);
    const bs = r * 2.5 + h * 0.6;
    blob.scale.set(bs, 1, bs);
    blob.position.set(r * 0.2 + h * 0.25, 0.0015, -h * 0.15);
    blob.renderOrder = 1;
    group.add(blob, body);
    this.scene.add(group);
    return { group, body, side, radius: r, height: h, flash: 0, pop: -1 };
  }

  removePiece(p: PieceView) {
    this.scene.remove(p.group);
    p.body.geometry.dispose();
    p.side.dispose();
    (p.body.material as THREE.Material[])[1].dispose();
  }

  /** Greybox pieces stay upright so their numbers read; `tilt` is a small aiming wobble. */
  placePiece(p: PieceView, x: number, y: number, tilt = 0) {
    p.group.position.set(x, 0, -y);
    p.group.rotation.z = tilt;
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

  animatePiece(p: PieceView, dt: number) {
    if (p.pop >= 0) {
      p.pop += dt;
      const s = this.popScale(p.pop);
      p.group.scale.set(s, 1 + (s - 1) * 1.4, s);
      if (p.pop >= 0.32) {
        p.pop = -1;
        p.group.scale.set(1, 1, 1);
      }
    }
    if (p.flash > 0) {
      p.flash = Math.max(0, p.flash - dt);
      const k = p.flash / 0.16;
      p.side.emissive.setRGB(k, k, k);
      if (p.flash === 0) p.side.emissive.set(p.body.userData.tier === 18 ? '#bfe9ff' : '#000000');
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
    this.aim.position.copy(toWorld(x, y0, 0.004));
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

  burst(x: number, y: number, color: string, count: number, power: number) {
    const geo = this.burstGeo;
    let mat = this.burstMats.get(color);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      this.burstMats.set(color, mat);
    }
    const parts: { m: THREE.Mesh; v: THREE.Vector3; s: number }[] = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(toWorld(x, y, 0.03));
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random() * 0.8) * power;
      parts.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, 0.6 + Math.random() * 1.0, Math.sin(a) * sp), s: 0.6 + Math.random() });
      m.scale.setScalar(parts[i].s);
      this.scene.add(m);
    }
    let t = 0;
    this.effects.push({
      update: (dt) => {
        t += dt;
        for (const p of parts) {
          p.v.y -= 4.5 * dt;
          p.m.position.addScaledVector(p.v, dt);
          if (p.m.position.y < 0.007) {
            p.m.position.y = 0.007;
            p.v.multiplyScalar(0.5);
            p.v.y = Math.abs(p.v.y) * 0.3;
          }
          p.m.rotation.x += dt * 8;
          p.m.rotation.z += dt * 6;
          p.m.scale.setScalar(p.s * Math.max(0, 1 - t / 0.7));
        }
        return t < 0.7;
      },
      dispose: () => {
        for (const p of parts) this.scene.remove(p.m);
      },
    });
  }

  shake(amount: number) {
    this.camShake = Math.max(this.camShake, amount);
  }

  private adaptQuality(dt: number) {
    if (dt <= 0 || dt > 0.25) return;
    this.frameAvg += (dt - this.frameAvg) * 0.05;
    this.frameClock += dt;
    if (this.frameClock < 1.5) return;
    this.frameClock = 0;
    if (this.frameAvg > 1 / 50 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(this.width, this.height, false);
    }
  }

  update(dt: number) {
    this.adaptQuality(dt);
    this.time += dt;
    this.effects = this.effects.filter((e) => {
      const alive = e.update(dt);
      if (!alive) e.dispose();
      return alive;
    });
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
