import * as THREE from 'three';

/**
 * Shared material palette for every building, in a cel-shaded cartoon style.
 * Textures are drawn in near-white tones with dark "ink" outlines, and
 * per-vertex colours tint them, so one material serves every colour.
 * Toon shading is also far cheaper on phones than physically based lighting.
 */
export type MatKey =
  | 'matte'
  | 'gloss'
  | 'brick'
  | 'roof'
  | 'window'
  | 'wood'
  | 'siding'
  | 'plaster'
  | 'pane'
  | 'door'
  | 'glow'
  | 'pulse'
  | 'beam'
  | 'water'
  | 'smoke';

const INK = 'rgba(40,30,25,0.55)';
const INK_SOFT = 'rgba(40,30,25,0.28)';

/** Building textures are drawn at 2x their logical size for crisp HD detail. */
const HD = 2;

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w * HD;
  c.height = h * HD;
  const ctx = c.getContext('2d')!;
  ctx.scale(HD, HD);
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

// Deterministic jitter so textures are identical every run (and in baked thumbnails).
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const brickTex = () =>
  canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#c9c1b6';
    ctx.fillRect(0, 0, 128, 128);
    const bh = 16;
    for (let r = 0; r < 8; r++) {
      const off = r % 2 ? 16 : 0;
      for (let x = -32 + off; x < 128; x += 32) {
        const v = 238 + Math.floor(rnd() * 17);
        ctx.fillStyle = `rgb(${v},${v - 6},${v - 10})`;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, r * bh + 1.5, 29, bh - 3, 2);
        ctx.fill();
        ctx.strokeStyle = INK_SOFT;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 3, r * bh + 3, 25, 2);
      }
    }
  });

const roofTex = () =>
  canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 8; r++) {
      const off = r % 2 ? 8 : 0;
      for (let x = -16 + off; x < 144; x += 16) {
        const g = ctx.createLinearGradient(0, r * 16, 0, r * 16 + 16);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#dcdcdc');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, r * 16);
        ctx.lineTo(x + 15, r * 16);
        ctx.lineTo(x + 15, r * 16 + 11);
        ctx.quadraticCurveTo(x + 7.5, r * 16 + 18, x, r * 16 + 11);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
  });

const woodTex = () =>
  canvasTex(128, 128, (ctx) => {
    for (let y = 0; y < 128; y += 16) {
      const v = 232 + Math.floor(rnd() * 23);
      ctx.fillStyle = `rgb(${v},${v - 8},${v - 18})`;
      ctx.fillRect(0, y, 128, 16);
      ctx.strokeStyle = 'rgba(140,100,60,0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        const yy = y + 5 + i * 5;
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(40, yy + 2, 80, yy - 2, 128, yy);
        ctx.stroke();
      }
      ctx.fillStyle = INK;
      ctx.fillRect(0, y + 15, 128, 1.5);
      // Plank joints and a knot or two.
      const jx = Math.floor(rnd() * 100) + 10;
      ctx.fillRect(jx, y, 1.5, 16);
      if (rnd() < 0.4) {
        ctx.strokeStyle = 'rgba(110,70,40,0.4)';
        ctx.beginPath();
        ctx.ellipse(jx + 30, y + 8, 4, 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });

/** Clapboard siding: overlapping horizontal boards with shadow lines. */
const sidingTex = () =>
  canvasTex(128, 128, (ctx) => {
    for (let y = 0; y < 128; y += 16) {
      const g = ctx.createLinearGradient(0, y, 0, y + 16);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#e8e8e8');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, 128, 16);
      ctx.fillStyle = INK_SOFT;
      ctx.fillRect(0, y + 14, 128, 2);
    }
  });

/** Plaster: soft speckle with faint outlined panels. */
const plasterTex = () =>
  canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#f6f6f6';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      const v = 220 + Math.floor(rnd() * 30);
      ctx.fillStyle = `rgba(${v},${v},${v},0.6)`;
      ctx.fillRect(rnd() * 128, rnd() * 128, 2, 2);
    }
    ctx.strokeStyle = 'rgba(40,30,25,0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, 126.5, 126.5);
  });

/** Tower window grid: 4 x 4 framed windows per tile. */
function windowTex(lit: boolean) {
  return canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = lit ? '#000000' : '#f4f4f4';
    ctx.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const on = (r * 7 + c * 3) % 3 === 0;
        const x = c * 32 + 6;
        const y = r * 32 + 5;
        if (lit) {
          if (!on) continue;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 20, 22);
          continue;
        }
        const g = ctx.createLinearGradient(x, y, x + 20, y + 22);
        g.addColorStop(0, '#b7d4ea');
        g.addColorStop(1, '#6f8ca8');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 20, 22);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.moveTo(x, y + 14);
        ctx.lineTo(x + 12, y);
        ctx.lineTo(x + 17, y);
        ctx.lineTo(x, y + 20);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, 20, 22);
        ctx.fillStyle = INK_SOFT;
        ctx.fillRect(x + 9.5, y, 1.5, 22);
      }
  });
}

/** One house window (mapped once per window face): frame, cross bars, glass shine, curtains. */
const paneTex = () =>
  canvasTex(64, 64, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 64, 64);
    const g = ctx.createLinearGradient(0, 8, 0, 56);
    g.addColorStop(0, '#cdeaff');
    g.addColorStop(1, '#6ea9d6');
    ctx.fillStyle = g;
    ctx.fillRect(8, 8, 48, 48);
    ctx.fillStyle = 'rgba(255,240,220,0.9)';
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(20, 8);
    ctx.quadraticCurveTo(14, 26, 8, 38);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(56, 8);
    ctx.lineTo(44, 8);
    ctx.quadraticCurveTo(50, 26, 56, 38);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(22, 56);
    ctx.lineTo(42, 8);
    ctx.lineTo(50, 8);
    ctx.lineTo(30, 56);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 8, 4, 48);
    ctx.fillRect(8, 30, 48, 4);
    ctx.strokeStyle = 'rgba(40,30,25,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 61, 61);
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, 48, 48);
  });

/** Panelled front door with a knob. */
const doorTex = () =>
  canvasTex(64, 96, (ctx) => {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, 64, 96);
    ctx.strokeStyle = 'rgba(40,30,25,0.45)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(11, 10, 42, 30);
    ctx.strokeRect(11, 48, 42, 38);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(13, 12, 38, 4);
    ctx.fillStyle = '#ffd45a';
    ctx.beginPath();
    ctx.arc(50, 50, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,25,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 61, 93);
  });

const stripeTex = () =>
  canvasTex(
    16,
    64,
    (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(255,255,255,0.0)');
      g.addColorStop(0.5, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 64);
    },
    false,
  );

/** Three-step light ramp for cel shading. */
function toonRamp() {
  const data = new Uint8Array([150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/**
 * All surface textures live in one 512 px atlas (4 x 4 cells of 128 px), so a
 * building's textured and plain parts share a single material and draw call.
 * A per-vertex `atlas` rect tells the shader which cell to tile.
 */
const CELL = 256;
const ATLAS_SIZE = 1024;
type Cell = [col: number, row: number];
export const ATLAS_CELLS: Partial<Record<MatKey, Cell>> = {
  matte: [0, 0],
  brick: [1, 0],
  roof: [2, 0],
  wood: [3, 0],
  siding: [0, 1],
  plaster: [1, 1],
  pane: [2, 1],
  door: [3, 1],
  window: [0, 2],
};

/** Atlas rect (u, v, width, height) for a cell, inset to avoid bleeding. */
export function atlasRect(mat: MatKey): [number, number, number, number] | null {
  const cell = ATLAS_CELLS[mat];
  if (!cell) return null;
  const inset = 4;
  const u = (cell[0] * CELL + inset) / ATLAS_SIZE;
  // Canvas rows go down; texture v goes up (flipY).
  const v = 1 - ((cell[1] + 1) * CELL - inset) / ATLAS_SIZE;
  const w = (CELL - inset * 2) / ATLAS_SIZE;
  return [u, v, w, w];
}

function buildAtlas(emissive: boolean) {
  const c = document.createElement('canvas');
  c.width = c.height = ATLAS_SIZE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = emissive ? '#000000' : '#ffffff';
  ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  const put = (mat: MatKey, tex: THREE.Texture) => {
    const [col, row] = ATLAS_CELLS[mat]!;
    ctx.drawImage(tex.image as HTMLCanvasElement, col * CELL, row * CELL, CELL, CELL);
    tex.dispose();
  };
  seed = 7;
  if (emissive) {
    put('window', windowTex(true));
    // Panes glow evenly at night.
    const [col, row] = ATLAS_CELLS.pane!;
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(col * CELL + 16, row * CELL + 16, CELL - 32, CELL - 32);
  } else {
    put('brick', brickTex());
    put('roof', roofTex());
    put('wood', woodTex());
    put('siding', sidingTex());
    put('plaster', plasterTex());
    put('pane', paneTex());
    put('door', doorTex());
    put('window', windowTex(false));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

/** Patches a toon material to tile its maps inside the atlas cell given per vertex. */
function useAtlas(m: THREE.MeshToonMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 atlas;\nvarying vec4 vAtlas;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvAtlas = atlas;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vAtlas;\nvec2 atlasUv(vec2 uv) { return vAtlas.xy + fract(uv) * vAtlas.zw; }')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = textureGrad(map, atlasUv(vMapUv), dFdx(vMapUv) * vAtlas.zw, dFdy(vMapUv) * vAtlas.zw);
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#ifdef USE_EMISSIVEMAP
          totalEmissiveRadiance *= textureGrad(emissiveMap, atlasUv(vEmissiveMapUv), dFdx(vEmissiveMapUv) * vAtlas.zw, dFdy(vEmissiveMapUv) * vAtlas.zw).rgb;
        #endif`,
      );
  };
  m.customProgramCacheKey = () => 'atlas-toon';
  return m;
}

/** Material buckets a building is split into (one draw call each). */
export type Bucket = 'toon' | 'gloss' | 'glow' | 'pulse' | 'beam' | 'water' | 'smoke';

export function bucketOf(mat: MatKey): Bucket {
  if (ATLAS_CELLS[mat]) return 'toon';
  return mat as Bucket;
}

let palette: Record<Bucket, THREE.Material> | null = null;
let ink: THREE.LineBasicMaterial | null = null;

export function materials(): Record<Bucket, THREE.Material> {
  if (palette) return palette;
  const ramp = toonRamp();
  const toon = (o: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp, ...o });
  palette = {
    toon: useAtlas(
      toon({ map: buildAtlas(false), emissiveMap: buildAtlas(true), emissive: new THREE.Color('#ffc864'), emissiveIntensity: 0.4 }),
    ),
    gloss: new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: new THREE.Color('#9aa4ad') }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    pulse: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    beam: new THREE.MeshBasicMaterial({
      vertexColors: true,
      map: stripeTex(),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    water: new THREE.MeshBasicMaterial({
      vertexColors: true,
      map: stripeTex(),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    smoke: toon({ transparent: true, opacity: 0.85 }),
  };
  return palette;
}

/** Dark "ink" outline drawn along every crease of a building. */
export function inkMaterial() {
  ink ??= new THREE.LineBasicMaterial({ color: '#2a211c', transparent: true, opacity: 0.6 });
  return ink;
}

/** Texture repeats per model unit (a footprint is 1 unit across). */
export const UV_DENSITY: Partial<Record<MatKey, number>> = {
  brick: 3.2,
  roof: 3,
  window: 2.4,
  wood: 2.5,
  siding: 3.4,
  plaster: 1.5,
};

/** Materials that keep each face's own 0-1 UVs (one window or door per face). */
export const FACE_UV = new Set<MatKey>(['pane', 'door', 'beam', 'water']);

/** Shared, time-driven material animation (energy cores, beams, waterfalls). */
export function animateMaterials(time: number) {
  if (!palette) return;
  const pulse = palette.pulse as THREE.MeshBasicMaterial;
  const k = 0.75 + 0.25 * Math.sin(time * 5);
  pulse.color.setRGB(k, k, k);
  (palette.beam as THREE.MeshBasicMaterial).map!.offset.y = -time * 0.6;
  (palette.water as THREE.MeshBasicMaterial).map!.offset.y = time * 1.5;
}

/** Night-time window glow (0 by day, 1 at night), driven by the district lighting. */
export function setWindowGlow(k: number) {
  (materials().toon as THREE.MeshToonMaterial).emissiveIntensity = 0.4 + k * 1.1;
}
