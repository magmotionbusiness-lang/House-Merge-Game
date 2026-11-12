import * as THREE from 'three';
import { CONFIG } from '../core/config';
import { MAX_TIER, tier } from '../core/tiers';
import type { Anim } from './kit';
import { build as t01 } from './tier01';
import { build as t02 } from './tier02';
import { build as t03 } from './tier03';
import { build as t04 } from './tier04';
import { build as t05 } from './tier05';
import { build as t06 } from './tier06';
import { build as t07 } from './tier07';
import { build as t08 } from './tier08';
import { build as t09 } from './tier09';
import { build as t10 } from './tier10';
import { build as t11 } from './tier11';
import { build as t12 } from './tier12';
import { build as t13 } from './tier13';
import { build as t14 } from './tier14';
import { build as t15 } from './tier15';
import { build as t16 } from './tier16';
import { build as t17 } from './tier17';
import { build as t18 } from './tier18';
import { BEACH } from './beach';
import { ALPINE } from './alpine';
import { SWEET } from './sweet';
import { NEON } from './neon';
import { ATLANTIS } from './atlantis';
import { SAKURA } from './sakura';
import { DESERT } from './desert';
import { currentTheme, type ThemeId } from '../core/themes';

type Build = (H: number, color: string) => THREE.Group;
const SITE: Build[] = [t01, t02, t03, t04, t05, t06, t07, t08, t09, t10, t11, t12, t13, t14, t15, t16, t17, t18];
const LINEUPS: Record<ThemeId, Build[]> = { site: SITE, beach: BEACH, alpine: ALPINE, sweet: SWEET, neon: NEON, atlantis: ATLANTIS, sakura: SAKURA, desert: DESERT };

/** World size of a tier's model: footprint diameter and target visual height. */
export function modelSize(tierId: number) {
  const t = tier(tierId);
  const diameter = t.footprint * CONFIG.footprintScale;
  const height = Math.max(0.035, t.height * CONFIG.heightScale);
  return { diameter, height, unitHeight: height / diameter };
}

const templates = new Map<string, THREE.Group>();

/** The shared model for a tier in a theme (default: the current one), in model units (footprint 1 across). Clone it per piece. */
export function modelTemplate(tierId: number, theme: ThemeId = currentTheme().id): THREE.Group {
  const key = `${theme}:${tierId}`;
  let g = templates.get(key);
  if (!g) {
    const build = LINEUPS[theme][tierId - 1];
    if (!build) throw new Error(`No model for tier ${tierId}`);
    g = build(modelSize(tierId).unitHeight, tier(tierId).color);
    g.name = `${theme}-tier${String(tierId).padStart(2, '0')}`;
    templates.set(key, g);
  }
  return g;
}

/** A new instance (geometry and materials shared) scaled to world size. */
export function createModel(tierId: number, theme: ThemeId = currentTheme().id) {
  const g = modelTemplate(tierId, theme).clone();
  g.scale.setScalar(modelSize(tierId).diameter);
  const anims: { obj: THREE.Object3D; anim: Anim; base: THREE.Vector3; phase: number }[] = [];
  g.traverse((o) => {
    const anim = o.userData.anim as Anim | undefined;
    if (anim) anims.push({ obj: o, anim, base: o.position.clone(), phase: Math.random() * Math.PI * 2 });
  });
  return { group: g, anims };
}

export type ModelAnims = ReturnType<typeof createModel>['anims'];

export function tickAnims(anims: ModelAnims, time: number) {
  for (const a of anims) {
    const t = time + a.phase;
    switch (a.anim.type) {
      case 'bob':
        a.obj.position.y = a.base.y + Math.sin(t * a.anim.speed) * a.anim.amp;
        break;
      case 'spin':
        a.obj.rotation.y = t * a.anim.speed;
        break;
      case 'sway': {
        const k = 1 + Math.sin(t * a.anim.speed * 3.1) * a.anim.amp;
        a.obj.scale.set(k, 1 + Math.sin(t * a.anim.speed) * a.anim.amp * 0.5, 2 - k);
        break;
      }
      case 'puff': {
        const u = (t * a.anim.speed) % 1;
        a.obj.position.y = a.base.y + u * a.anim.rise;
        a.obj.scale.setScalar(0.6 + u * 0.8);
        a.obj.visible = u < 0.9;
        break;
      }
    }
  }
}

/** Blueprint wireframe (crease edges) of a tier, segments sorted bottom-up so it "draws in". */
const wires = new Map<string, THREE.BufferAttribute>();
export function wireframe(tierId: number, theme: ThemeId = currentTheme().id): THREE.BufferAttribute {
  const key = `${theme}:${tierId}`;
  let attr = wires.get(key);
  if (attr) return attr;
  const segs: number[][] = [];
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tpl = modelTemplate(tierId, theme);
  tpl.updateMatrixWorld(true);
  tpl.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (['beam', 'water', 'smoke', 'glow', 'pulse'].includes(m.name)) return;
    const edges = new THREE.EdgesGeometry(m.geometry, 28);
    const p = edges.getAttribute('position');
    for (let i = 0; i < p.count; i += 2) {
      tmp.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      tmp2.fromBufferAttribute(p, i + 1).applyMatrix4(m.matrixWorld);
      segs.push([tmp.x, tmp.y, tmp.z, tmp2.x, tmp2.y, tmp2.z]);
    }
    edges.dispose();
  });
  segs.sort((a, b) => Math.min(a[1], a[4]) - Math.min(b[1], b[4]));
  // Keep phones fast: cap very dense wireframes.
  const step = Math.max(1, Math.ceil(segs.length / 900));
  const flat = segs.filter((_, i) => i % step === 0).flat();
  attr = new THREE.Float32BufferAttribute(flat, 3);
  wires.set(key, attr);
  return attr;
}

export const TIER_COUNT = MAX_TIER;
