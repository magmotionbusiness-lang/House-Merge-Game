import * as THREE from 'three';
import { setWindowGlow } from '../models/materials';

/**
 * Time-of-day lighting presets. Each district gets one (campaign); in endless
 * play the light moves through the day as the player reaches higher tiers.
 */
export type TimeOfDay = 'morning' | 'noon' | 'golden' | 'dusk' | 'night';

interface Preset {
  sky: string;
  ground: string;
  hemi: number;
  sun: string;
  sunI: number;
  sunPos: [number, number, number];
  bg: string;
  sheet: string; // tint multiplier for the unlit blueprint sheet
  night: number; // 0 day .. 1 night: window glow and floodlights
}

export const PRESETS: Record<TimeOfDay, Preset> = {
  morning: { sky: '#fff1e4', ground: '#9a7e66', hemi: 1.35, sun: '#ffd9b0', sunI: 1.9, sunPos: [-2, 2.2, 1], bg: '#f2d9b8', sheet: '#f4f1ff', night: 0 },
  noon: { sky: '#ffffff', ground: '#8a6f4a', hemi: 1.5, sun: '#fff6e6', sunI: 2.3, sunPos: [-0.6, 3.2, 0.5], bg: '#e7cf9f', sheet: '#ffffff', night: 0 },
  golden: { sky: '#ffe2b8', ground: '#8a5a3a', hemi: 1.25, sun: '#ffb070', sunI: 2.4, sunPos: [2.2, 1.4, 0.6], bg: '#f0b97a', sheet: '#ffe9cf', night: 0.15 },
  dusk: { sky: '#b9a6e8', ground: '#4a3a58', hemi: 1.05, sun: '#ff8f7a', sunI: 1.3, sunPos: [2.5, 0.8, -0.5], bg: '#8f78b8', sheet: '#d6d0f2', night: 0.6 },
  night: { sky: '#7c8fd8', ground: '#1f2440', hemi: 0.85, sun: '#a9c4ff', sunI: 0.9, sunPos: [-1, 2.5, 1], bg: '#2c3460', sheet: '#aab6e8', night: 1 },
};

export class Lighting {
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  private cur: Preset;
  private target: Preset;
  private c = {
    sky: new THREE.Color(),
    ground: new THREE.Color(),
    sun: new THREE.Color(),
    bg: new THREE.Color(),
    sheet: new THREE.Color(),
  };
  private blend = 1;
  private from!: Preset;
  name: TimeOfDay;

  constructor(
    private scene: THREE.Scene,
    private sheet: THREE.MeshBasicMaterial,
    private onNight: (k: number) => void,
    start: TimeOfDay = 'morning',
  ) {
    this.cur = this.target = PRESETS[start];
    this.name = start;
    this.hemi = new THREE.HemisphereLight();
    this.sun = new THREE.DirectionalLight();
    this.sun.target.position.set(0, 0, -0.9);
    scene.add(this.hemi, this.sun, this.sun.target);
    scene.background = new THREE.Color();
    this.apply(this.cur, this.cur, 1);
  }

  set(name: TimeOfDay) {
    if (name === this.name) return;
    this.name = name;
    this.from = this.snapshot();
    this.target = PRESETS[name];
    this.blend = 0;
  }

  private snapshot(): Preset {
    return {
      sky: `#${this.c.sky.getHexString()}`,
      ground: `#${this.c.ground.getHexString()}`,
      hemi: this.hemi.intensity,
      sun: `#${this.c.sun.getHexString()}`,
      sunI: this.sun.intensity,
      sunPos: [this.sun.position.x, this.sun.position.y, this.sun.position.z],
      bg: `#${this.c.bg.getHexString()}`,
      sheet: `#${this.c.sheet.getHexString()}`,
      night: this.cur.night,
    };
  }

  private apply(a: Preset, b: Preset, u: number) {
    const lerpC = (out: THREE.Color, x: string, y: string) => out.set(x).lerp(new THREE.Color(y), u);
    lerpC(this.c.sky, a.sky, b.sky);
    lerpC(this.c.ground, a.ground, b.ground);
    lerpC(this.c.sun, a.sun, b.sun);
    lerpC(this.c.bg, a.bg, b.bg);
    lerpC(this.c.sheet, a.sheet, b.sheet);
    this.hemi.color.copy(this.c.sky);
    this.hemi.groundColor.copy(this.c.ground);
    this.hemi.intensity = a.hemi + (b.hemi - a.hemi) * u;
    this.sun.color.copy(this.c.sun);
    this.sun.intensity = a.sunI + (b.sunI - a.sunI) * u;
    this.sun.position.set(
      a.sunPos[0] + (b.sunPos[0] - a.sunPos[0]) * u,
      a.sunPos[1] + (b.sunPos[1] - a.sunPos[1]) * u,
      a.sunPos[2] + (b.sunPos[2] - a.sunPos[2]) * u,
    );
    (this.scene.background as THREE.Color).copy(this.c.bg);
    if (this.scene.fog) this.scene.fog.color.copy(this.c.bg);
    this.sheet.color.copy(this.c.sheet);
    const night = a.night + (b.night - a.night) * u;
    this.cur = { ...b, night };
    setWindowGlow(night);
    this.onNight(night);
  }

  update(dt: number) {
    if (this.blend >= 1) return;
    this.blend = Math.min(1, this.blend + dt / 2.5);
    const u = this.blend * this.blend * (3 - 2 * this.blend);
    this.apply(this.from, this.target, u);
  }

  /** Endless mode: the day moves on as the player reaches higher tiers. */
  static forTier(tierId: number): TimeOfDay {
    if (tierId >= 16) return 'night';
    if (tierId >= 13) return 'dusk';
    if (tierId >= 10) return 'golden';
    if (tierId >= 6) return 'noon';
    return 'morning';
  }
}
