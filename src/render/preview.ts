import * as THREE from 'three';
import type { PieceView } from './scene';

/**
 * Aim preview: while aiming, the buildings the shot would merge with glow on
 * the table, and the better the outcome, the flashier the glow (as Block Blast
 * lights up the lines a placement would clear):
 *  1. a plain merge: a soft ring in the new building's colour;
 *  2. a chain of two: brighter, pulsing rings on every building in the chain;
 *  3. a chain of three or more, or a merge that completes a contract: a
 *     chasing rainbow neon ring with sparkles.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uRainbow;
uniform float uStrength;
uniform float uPhase;
varying vec2 vUv;

vec3 hue(float h) {
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return k * k * (3.0 - 2.0 * k);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float d = length(p);
  float ang = atan(p.y, p.x) / 6.2832 + 0.5;
  // A bright ring at d = 0.72 with a soft halo inside and out.
  float ring = exp(-pow((d - 0.72) / 0.06, 2.0));
  float halo = exp(-pow((d - 0.72) / 0.2, 2.0)) * 0.6;
  float fill = smoothstep(0.75, 0.0, d) * 0.18;
  vec3 col = mix(uColor, hue(ang - uTime * 0.6), uRainbow);
  // Chasing highlights around the ring (stronger for better outcomes).
  float chase = pow(0.5 + 0.5 * cos(6.2832 * (ang * 3.0 - uTime * 0.9)), 10.0) * uRainbow;
  float pulse = 0.78 + 0.22 * sin(uTime * 7.0 + uPhase);
  float a = clamp((ring * (1.0 + chase * 1.5) + halo + fill) * uStrength * pulse, 0.0, 1.0) * step(d, 1.0);
  vec3 c = mix(col, vec3(1.0), ring * 0.35 * uStrength);
  c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  gl_FragColor = vec4(c * a, a);
}`;

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
}

export class AimPreview {
  private rings: Ring[] = [];
  private geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private targets: PieceView[] = [];
  private level = 0;
  private color = new THREE.Color();
  private shown = 0; // eases in and out

  constructor(private scene: THREE.Scene) {}

  private ring(i: number) {
    while (this.rings.length <= i) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color() },
          uRainbow: { value: 0 },
          uStrength: { value: 0 },
          uPhase: { value: this.rings.length * 1.3 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.renderOrder = 2;
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.rings.push({ mesh, mat });
    }
    return this.rings[i];
  }

  /** `level` 0 hides the preview; `color` is the colour of the building the merge makes. */
  set(targets: PieceView[], level: number, color: string) {
    this.targets = targets;
    this.level = level;
    if (level > 0) this.color.set(color);
  }

  /** Called every frame. Returns the aim line colour (null = default). */
  tick(dt: number, time: number) {
    const want = this.level > 0 ? 1 : 0;
    this.shown += (want - this.shown) * Math.min(1, dt * 14);
    const best = this.level >= 3;
    const strength = [0, 0.85, 1.05, 1.25][Math.min(3, this.level)] * this.shown;
    const n = this.level > 0 ? this.targets.length : 0;
    for (let i = 0; i < Math.max(n, this.rings.length); i++) {
      const r = this.ring(i);
      const t = this.targets[i];
      if (i >= n || !t || this.shown < 0.02) {
        r.mesh.visible = false;
        continue;
      }
      r.mesh.visible = true;
      // The ring sits just outside the building's base disc (ring at 0.36 of the quad).
      const s = t.radius * (best ? 4.2 : 3.9) * (1 + 0.04 * Math.sin(time * 7 + i));
      r.mesh.position.set(t.group.position.x, 0.0035, t.group.position.z);
      r.mesh.scale.set(s, 1, s);
      const u = r.mat.uniforms;
      u.uTime.value = time;
      (u.uColor.value as THREE.Color).copy(this.color);
      u.uRainbow.value += ((best ? 1 : 0) - u.uRainbow.value) * Math.min(1, dt * 10);
      u.uStrength.value = strength * (i === 0 ? 1 : 0.85);
    }
    return this.level;
  }
}
