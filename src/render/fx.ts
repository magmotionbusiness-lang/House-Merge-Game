import * as THREE from 'three';
import type { Era } from '../core/tiers';
import { puffTexture } from './textures';

export interface Effect {
  update(dt: number): boolean; // false when finished
  dispose(): void;
}

interface Particle {
  obj: THREE.Object3D;
  v: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  age: number;
  size: number;
  gravity: number;
  drag: number;
  bounce: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Era-themed merge particles and small impact effects. Geometries and
 * materials are shared and cached, so a merge allocates only plain meshes.
 */
export class ParticleFx {
  private geo = {
    chip: new THREE.BoxGeometry(0.014, 0.01, 0.012),
    shaving: new THREE.BoxGeometry(0.022, 0.003, 0.008),
    tile: new THREE.BoxGeometry(0.016, 0.004, 0.012),
    glint: new THREE.OctahedronGeometry(0.008),
    confetti: new THREE.PlaneGeometry(0.014, 0.008),
    spark: new THREE.SphereGeometry(0.006, 6, 4),
    ray: new THREE.CylinderGeometry(0.006, 0.012, 1, 6, 1, true).translate(0, 0.5, 0),
  };
  private mats = new Map<string, THREE.Material>();
  private puff = puffTexture();

  constructor(
    private scene: THREE.Scene,
    private add: (e: Effect) => void,
  ) {}

  private mat(key: string, make: () => THREE.Material) {
    let m = this.mats.get(key);
    if (!m) {
      m = make();
      this.mats.set(key, m);
    }
    return m;
  }
  private solid(color: string) {
    return this.mat('s' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  }
  private glow(color: string) {
    return this.mat(
      'g' + color,
      () =>
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
    );
  }
  private flat(color: string) {
    return this.mat('f' + color, () => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  }

  /** Burst for a merge that produced a tier of `era`. `power` grows with tier and combo. */
  merge(x: number, y: number, era: Era, color: string, power: number) {
    const n = Math.round(10 + power * 10);
    const parts: Particle[] = [];
    const spawn = (geo: THREE.BufferGeometry, mat: THREE.Material, opts: Partial<Particle> & { speed: number; up: number }) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x + rand(-0.02, 0.02), 0.03, -y + rand(-0.02, 0.02));
      m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
      const a = rand(0, Math.PI * 2);
      const sp = opts.speed * rand(0.5, 1.2);
      const p: Particle = {
        obj: m,
        v: new THREE.Vector3(Math.cos(a) * sp, opts.up * rand(0.6, 1.3), Math.sin(a) * sp),
        spin: new THREE.Vector3(rand(-12, 12), rand(-12, 12), rand(-12, 12)),
        life: opts.life ?? rand(0.5, 0.8),
        age: 0,
        size: opts.size ?? rand(0.7, 1.3),
        gravity: opts.gravity ?? 4.5,
        drag: opts.drag ?? 0,
        bounce: opts.bounce ?? true,
      };
      m.scale.setScalar(p.size);
      this.scene.add(m);
      parts.push(p);
    };

    const sp = 0.45 + power * 0.25;
    if (era === 1) {
      // Brick dust and mortar chips.
      for (let i = 0; i < n; i++)
        spawn(this.geo.chip, this.solid(i % 3 === 0 ? '#c9c2b4' : color), { speed: sp, up: 1.1 });
      this.dust(x, y, 0.07 + power * 0.03, '#e8d9c4', 4);
    } else if (era === 2) {
      // Wood shavings and roof tiles.
      for (let i = 0; i < n; i++) {
        const tile = i % 3 === 0;
        spawn(tile ? this.geo.tile : this.geo.shaving, this.solid(tile ? '#c8382f' : i % 2 ? '#d9a066' : '#b9773e'), {
          speed: sp,
          up: 1.3,
          drag: 1.2,
        });
      }
      this.dust(x, y, 0.08 + power * 0.03, '#f1e3cf', 3);
    } else if (era === 3) {
      // Glass glints and confetti.
      const conf = ['#ff5a7a', '#ffd23f', '#3ec1ff', '#7dff8a', '#ffffff'];
      for (let i = 0; i < n; i++) {
        if (i % 3 === 0) spawn(this.geo.glint, this.glow('#cfefff'), { speed: sp * 1.2, up: 1.6, life: 0.6 });
        else
          spawn(this.geo.confetti, this.flat(conf[i % conf.length]), {
            speed: sp,
            up: 2.2,
            gravity: 2.2,
            drag: 2.4,
            life: rand(0.9, 1.3),
            bounce: false,
          });
      }
    } else {
      // Energy sparks rising and light rays.
      for (let i = 0; i < n; i++)
        spawn(this.geo.spark, this.glow(i % 2 ? '#9f7bff' : '#6ff3ff'), {
          speed: sp * 0.8,
          up: 0.8,
          gravity: -1.5,
          drag: 1.5,
          life: rand(0.7, 1.1),
          bounce: false,
        });
      this.rays(x, y, color, 5);
    }

    this.add({
      update: (dt) => {
        let alive = false;
        for (const p of parts) {
          p.age += dt;
          if (p.age >= p.life) {
            p.obj.visible = false;
            continue;
          }
          alive = true;
          p.v.y -= p.gravity * dt;
          if (p.drag) p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
          p.obj.position.addScaledVector(p.v, dt);
          if (p.bounce && p.obj.position.y < 0.006) {
            p.obj.position.y = 0.006;
            p.v.multiplyScalar(0.45);
            p.v.y = Math.abs(p.v.y) * 0.35;
            p.spin.multiplyScalar(0.5);
          }
          p.obj.rotation.x += p.spin.x * dt;
          p.obj.rotation.y += p.spin.y * dt;
          p.obj.rotation.z += p.spin.z * dt;
          const fade = 1 - Math.max(0, (p.age - p.life * 0.6) / (p.life * 0.4));
          p.obj.scale.setScalar(p.size * fade);
        }
        return alive;
      },
      dispose: () => {
        for (const p of parts) this.scene.remove(p.obj);
      },
    });
  }

  /** Soft dust puffs, used for impacts and Era 1-2 merges. */
  dust(x: number, y: number, size: number, color = '#e9dcc7', count = 2) {
    const sprites: { s: THREE.Sprite; m: THREE.SpriteMaterial; v: THREE.Vector3; grow: number }[] = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: this.puff, color, transparent: true, depthWrite: false, opacity: 0.7 });
      const s = new THREE.Sprite(m);
      s.position.set(x + rand(-0.015, 0.015), 0.02, -y + rand(-0.015, 0.015));
      const a = rand(0, Math.PI * 2);
      sprites.push({ s, m, v: new THREE.Vector3(Math.cos(a) * 0.12, rand(0.05, 0.12), Math.sin(a) * 0.12), grow: size * rand(0.8, 1.2) });
      s.scale.setScalar(size * 0.4);
      this.scene.add(s);
    }
    let t = 0;
    const life = 0.5;
    this.add({
      update: (dt) => {
        t += dt;
        const u = Math.min(1, t / life);
        for (const p of sprites) {
          p.s.position.addScaledVector(p.v, dt);
          p.s.scale.setScalar(p.grow * (0.4 + 0.8 * Math.sqrt(u)));
          p.m.opacity = 0.7 * (1 - u);
        }
        return u < 1;
      },
      dispose: () => {
        for (const p of sprites) {
          this.scene.remove(p.s);
          p.m.dispose();
        }
      },
    });
  }

  private rays(x: number, y: number, color: string, count: number) {
    const rays: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; h: number }[] = [];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 ? '#ffffff' : color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const m = new THREE.Mesh(this.geo.ray, mat);
      const a = (i / count) * Math.PI * 2;
      m.position.set(x + Math.cos(a) * 0.05, 0, -y + Math.sin(a) * 0.05);
      m.rotation.set(Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35);
      rays.push({ m, mat, h: rand(0.5, 0.9) });
      this.scene.add(m);
    }
    let t = 0;
    this.add({
      update: (dt) => {
        t += dt;
        const u = Math.min(1, t / 0.7);
        for (const r of rays) {
          r.m.scale.set(1 + u, r.h * Math.sqrt(u) + 0.01, 1 + u);
          r.mat.opacity = 0.8 * (1 - u);
        }
        return u < 1;
      },
      dispose: () => {
        for (const r of rays) {
          this.scene.remove(r.m);
          r.mat.dispose();
        }
      },
    });
  }
}
