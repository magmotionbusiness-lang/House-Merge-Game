import * as THREE from 'three';
import type { ShotPath } from '../physics/world';

/**
 * The aim guide: bold dots flowing along the predicted path of the shot
 * (including glancing bounces off scaffold corners and rails), up to where it lands
 * where the building will end up, a pulse at each bounce, and a red stop sign
 * when a scaffold will stop it dead.
 */

const SPACING = 0.058;
const MAX_DOTS = 90;
const toWorld = (x: number, y: number, h = 0) => new THREE.Vector3(x, h, -y);

function dotTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  // Dark rim so the dots read on the bright blueprint, white core so they can be tinted.
  ctx.fillStyle = 'rgba(10,25,50,0.75)';
  ctx.beginPath();
  ctx.arc(32, 32, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(32, 32, 18, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class AimPath {
  private geo = new THREE.BufferGeometry();
  private pos = new Float32Array(MAX_DOTS * 3);
  private dots: THREE.Points;
  private mat: THREE.PointsMaterial;
  private stop: THREE.Group;
  private bounceRings: THREE.Mesh[] = [];
  private path: ShotPath | null = null;
  private radius = 0.05;
  private len = 0;
  private cum: number[] = [];

  constructor(scene: THREE.Scene) {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.PointsMaterial({ size: 0.1, map: dotTex(), transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: 0.05 });
    this.dots = new THREE.Points(this.geo, this.mat);
    this.dots.renderOrder = 3;
    this.dots.frustumCulled = false;
    scene.add(this.dots);
    // Red stop sign: a ring with a cross.
    this.stop = new THREE.Group();
    const red = new THREE.MeshBasicMaterial({ color: '#ff3b3b', transparent: true, opacity: 0.95, depthWrite: false });
    this.stop.add(new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2), red));
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.22).rotateX(-Math.PI / 2), red);
      bar.rotation.y = a;
      this.stop.add(bar);
    }
    this.stop.renderOrder = 4;
    scene.add(this.stop);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }));
      m.renderOrder = 3;
      scene.add(m);
      this.bounceRings.push(m);
    }
    this.hide();
  }

  hide() {
    this.path = null;
    this.dots.visible = false;
    this.stop.visible = false;
    for (const r of this.bounceRings) r.visible = false;
  }

  /** Shows a predicted path for a building of `radius`. */
  set(path: ShotPath, radius: number) {
    this.path = path;
    this.radius = radius;
    this.cum = [0];
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1];
      const b = path.points[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.len = this.cum[this.cum.length - 1];
  }

  get color() {
    return this.mat.color;
  }

  private at(d: number) {
    const p = this.path!.points;
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const u = Math.min(1, Math.max(0, (d - this.cum[i - 1]) / seg));
    return { x: p[i - 1].x + (p[i].x - p[i - 1].x) * u, y: p[i - 1].y + (p[i].y - p[i - 1].y) * u };
  }

  tick(time: number) {
    const path = this.path;
    if (!path || this.len < 0.01) {
      this.dots.visible = false;
      this.stop.visible = false;
      for (const r of this.bounceRings) r.visible = false;
      return;
    }
    // Dots start just past the launcher's edge and run up to where it lands, flowing forward.
    const start = this.radius + 0.01;
    const stopAt = Math.max(start, this.len);
    const phase = (time * 0.11) % SPACING;
    let n = 0;
    for (let d = start + phase; d < stopAt && n < MAX_DOTS; d += SPACING) {
      const q = this.at(d);
      this.pos.set([q.x, 0.006, -q.y], n * 3);
      n++;
    }
    this.geo.setDrawRange(0, n);
    this.geo.getAttribute('position').needsUpdate = true;
    this.dots.visible = n > 0;

    const e = path.end;
    const pulse = 1 + 0.05 * Math.sin(time * 6);
    if (path.blocked) {
      this.stop.visible = true;
      this.stop.position.copy(toWorld(e.x, e.y, 0.007));
      this.stop.scale.setScalar(this.radius * 0.9 * pulse);
    } else {
      this.stop.visible = false;
    }
    this.bounceRings.forEach((r, i) => {
      const b = path.bounces[i];
      r.visible = !!b;
      if (!b) return;
      const u = (time * 1.6 + i * 0.3) % 1;
      r.position.copy(toWorld(b.x, b.y, 0.006));
      r.scale.setScalar(0.02 + u * 0.05);
      (r.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - u);
      (r.material as THREE.MeshBasicMaterial).color.copy(this.mat.color);
    });
  }
}
