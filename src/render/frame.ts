import * as THREE from 'three';

/**
 * A glowing neon stroke that runs around the board on top of the rails.
 * It never covers the playing area: a bright core line on the rails, a soft
 * halo fading outward over the scenery, and lights that chase around the loop.
 *
 * Heat sets its resting look (off, then cyan, green, orange, pink, rainbow),
 * Fever adds flame flicker, and pulse() fires bright flashes for big moments.
 */

const VERT = /* glsl */ `
attribute float aS;
attribute float aOff;
varying float vS;
varying float vOff;
void main() {
  vS = aS;
  vOff = aOff;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uLevel;      // resting brightness 0..1
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uRainbow;    // 0..1
uniform float uChase;      // chase light strength
uniform float uChaseN;     // number of chase lights
uniform float uChaseSpeed;
uniform float uFever;      // 0..1 flame flicker
uniform float uPulse;      // 0..1 flash amount
uniform vec3 uPulseCol;
uniform float uLen;        // loop length (world units), for even chase spacing
varying float vS;
varying float vOff;

vec3 hue(float h) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return k * k * (3.0 - 2.0 * k);
}

void main() {
  float off = vOff;
  // A solid neon tube over the rail, a white-hot centre line and a soft outward halo.
  float band = smoothstep(0.024, 0.014, abs(off));
  float core = exp(-pow(off / 0.006, 2.0));
  float halo = off > 0.0 ? exp(-off / 0.07) : exp(off / 0.01);

  float wave = 0.5 + 0.5 * sin(6.2832 * (vS * 2.0 - uTime * 0.25));
  vec3 col = mix(uColA, uColB, wave);
  col = mix(col, hue(vS * 1.5 - uTime * 0.18), uRainbow);

  float chase = pow(0.5 + 0.5 * cos(6.2832 * (vS * uChaseN - uTime * uChaseSpeed)), 14.0) * uChase;
  float breathe = 0.82 + 0.18 * sin(uTime * 4.0);
  float k = uLevel * breathe * (1.0 + chase * 2.2);

  // Fever: flickering flame colours licking along the stroke.
  float flick = 0.5 + 0.5 * sin(vS * 90.0 + uTime * 23.0) * sin(vS * 37.0 - uTime * 17.0);
  vec3 flame = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.75, 0.1), flick);
  col = mix(col, flame, uFever * 0.8);
  k = max(k, uFever * (0.55 + 0.45 * flick));

  // Pulse flashes override the resting look.
  col = mix(col, uPulseCol, clamp(uPulse * 1.4, 0.0, 1.0));
  k = max(k, uPulse * 1.25);

  // Painted over the scene (not added), so it stays saturated over a bright daytime backdrop:
  // a solid colour halo and a hot, lighter core line.
  float a = clamp((band * 0.95 + halo * 0.8 + core) * k, 0.0, 1.0);
  vec3 c = mix(col, vec3(1.0), core * 0.6 * min(k, 1.0));
  c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  gl_FragColor = vec4(c * a, a);
}`;

interface Look {
  level: number;
  a: string;
  b: string;
  rainbow: number;
  chase: number;
  n: number;
  speed: number;
}

/** Resting look per heat level. */
const LOOKS: Look[] = [
  { level: 0, a: '#6fd6ff', b: '#6fd6ff', rainbow: 0, chase: 0, n: 1, speed: 0 },
  { level: 0.6, a: '#6fd6ff', b: '#b8f0ff', rainbow: 0, chase: 0.35, n: 1, speed: 0.12 },
  { level: 0.72, a: '#5cffb0', b: '#6fd6ff', rainbow: 0, chase: 0.6, n: 2, speed: 0.18 },
  { level: 0.82, a: '#ff9a3d', b: '#ffd84d', rainbow: 0, chase: 0.8, n: 3, speed: 0.24 },
  { level: 0.92, a: '#ff5ec4', b: '#b48cff', rainbow: 0, chase: 1, n: 4, speed: 0.3 },
  { level: 1, a: '#ffd84d', b: '#ffffff', rainbow: 1, chase: 1, n: 4, speed: 0.36 },
];

export class FrameGlow {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private u: Record<string, THREE.IUniform>;
  private target: Look = LOOKS[0];
  private fever = 0;
  private feverOn = false;
  private pulseT = -1;
  private pulseN = 3;
  private pulseDur = 1;
  private colA = new THREE.Color();
  private colB = new THREE.Color();

  /**
   * `loop`: the stroke's centre line as [x, y, z] points (closed loop, outward
   * normal to the right of travel when seen from above).
   */
  constructor(loop: [number, number, number][], inner = 0.03, outer = 0.2) {
    const pos: number[] = [];
    const sAttr: number[] = [];
    const offAttr: number[] = [];
    const idx: number[] = [];
    // Resample the loop densely so the chase lights stay smooth.
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < loop.length; i++) {
      const a = new THREE.Vector3(...loop[i]);
      const b = new THREE.Vector3(...loop[(i + 1) % loop.length]);
      const n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.02));
      for (let j = 0; j < n; j++) pts.push(a.clone().lerp(b, j / n));
    }
    let total = 0;
    const acc: number[] = [0];
    for (let i = 1; i <= pts.length; i++) {
      total += pts[i - 1].distanceTo(pts[i % pts.length]);
      acc.push(total);
    }
    const offs = [-inner, 0, outer * 0.35, outer];
    for (let i = 0; i <= pts.length; i++) {
      const p = pts[i % pts.length];
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const next = pts[(i + 1) % pts.length];
      const t = next.clone().sub(prev).setY(0).normalize();
      // Outward normal in the table plane.
      const nrm = new THREE.Vector3(-t.z, 0, t.x);
      for (const o of offs) {
        pos.push(p.x + nrm.x * o, p.y, p.z + nrm.z * o);
        sAttr.push(acc[i] / total);
        offAttr.push(o);
      }
      if (i < pts.length) {
        const m = offs.length;
        const r = i * m;
        for (let k = 0; k < m - 1; k++) idx.push(r + k, r + k + 1, r + k + m, r + k + 1, r + k + 1 + m, r + k + m);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aS', new THREE.Float32BufferAttribute(sAttr, 1));
    geo.setAttribute('aOff', new THREE.Float32BufferAttribute(offAttr, 1));
    geo.setIndex(idx);
    this.u = {
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uColA: { value: new THREE.Color('#6fd6ff') },
      uColB: { value: new THREE.Color('#6fd6ff') },
      uRainbow: { value: 0 },
      uChase: { value: 0 },
      uChaseN: { value: 1 },
      uChaseSpeed: { value: 0 },
      uFever: { value: 0 },
      uPulse: { value: 0 },
      uPulseCol: { value: new THREE.Color('#ffffff') },
      uLen: { value: total },
    };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.renderOrder = 5;
    this.mesh.frustumCulled = false;
  }

  setHeat(level: number) {
    this.target = LOOKS[Math.max(0, Math.min(level, LOOKS.length - 1))];
  }

  setFever(on: boolean) {
    this.feverOn = on;
  }

  /** `count` bright flashes in `color` (deliveries, clean site, theme changes). */
  pulse(color: string, count = 3) {
    this.pulseT = 0;
    this.pulseN = count;
    this.pulseDur = 0.3 * count;
    (this.u.uPulseCol.value as THREE.Color).set(color).lerp(new THREE.Color('#ffffff'), 0.3);
  }

  /** Current resting colour, for matching sparks. */
  color(out: THREE.Color) {
    return out.copy(this.u.uColA.value as THREE.Color);
  }

  tick(dt: number, time: number) {
    const u = this.u;
    u.uTime.value = time;
    const k = Math.min(1, dt * 2.5);
    const t = this.target;
    u.uLevel.value += (t.level - u.uLevel.value) * k;
    (u.uColA.value as THREE.Color).lerp(this.colA.set(t.a), k);
    (u.uColB.value as THREE.Color).lerp(this.colB.set(t.b), k);
    u.uRainbow.value += (t.rainbow - u.uRainbow.value) * k;
    u.uChase.value += (t.chase - u.uChase.value) * k;
    u.uChaseN.value = t.n;
    u.uChaseSpeed.value = t.speed;
    this.fever += ((this.feverOn ? 1 : 0) - this.fever) * Math.min(1, dt * 4);
    u.uFever.value = this.fever;
    if (this.pulseT >= 0) {
      this.pulseT += dt;
      const p = this.pulseT / this.pulseDur;
      if (p >= 1) {
        this.pulseT = -1;
        u.uPulse.value = 0;
      } else u.uPulse.value = Math.abs(Math.sin(p * Math.PI * this.pulseN)) * (1 - p * 0.35);
    }
    this.mesh.visible = u.uLevel.value > 0.01 || this.fever > 0.01 || this.pulseT >= 0;
  }
}
