import * as THREE from 'three';

/**
 * Shared material palette for every building. Textures are drawn in near-white
 * greys so per-vertex colours tint them; that keeps one material per surface
 * type instead of one per colour.
 */
export type MatKey =
  | 'matte'
  | 'gloss'
  | 'brick'
  | 'roof'
  | 'window'
  | 'wood'
  | 'glow'
  | 'pulse'
  | 'beam'
  | 'water'
  | 'smoke';

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const brickTex = () =>
  canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#b9b2a8'; // mortar
    ctx.fillRect(0, 0, 128, 128);
    const rows = 8;
    const bh = 128 / rows;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? 16 : 0;
      for (let x = -32 + off; x < 128; x += 32) {
        const v = 235 + Math.floor(Math.random() * 20);
        ctx.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, r * bh + 1.5, 29, bh - 3, 2);
        ctx.fill();
      }
    }
  });

const roofTex = () =>
  canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 8; r++) {
      const off = r % 2 ? 8 : 0;
      for (let x = -16 + off; x < 144; x += 16) {
        const g = ctx.createLinearGradient(0, r * 16, 0, r * 16 + 16);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#d8d8d8');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, r * 16);
        ctx.lineTo(x + 15, r * 16);
        ctx.lineTo(x + 15, r * 16 + 10);
        ctx.quadraticCurveTo(x + 7.5, r * 16 + 17, x, r * 16 + 10);
        ctx.fill();
      }
    }
  });

const woodTex = () =>
  canvasTex(128, 128, (ctx) => {
    for (let y = 0; y < 128; y += 16) {
      const v = 228 + Math.floor(Math.random() * 27);
      ctx.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
      ctx.fillRect(0, y, 128, 16);
      ctx.fillStyle = 'rgba(120,90,60,0.35)';
      ctx.fillRect(0, y + 15, 128, 1);
      ctx.strokeStyle = 'rgba(150,110,70,0.18)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const yy = y + 3 + i * 4;
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(40, yy + 2, 80, yy - 2, 128, yy);
        ctx.stroke();
      }
    }
  });

/** Window grid: 4 x 4 windows per tile. The emissive map lights a random third of them. */
function windowTex(lit: boolean) {
  return canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = lit ? '#000000' : '#f4f4f4';
    ctx.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const on = (r * 7 + c * 3) % 3 === 0;
        if (lit) {
          if (!on) continue;
          ctx.fillStyle = '#ffffff';
        } else ctx.fillStyle = '#7f95ad';
        ctx.fillRect(c * 32 + 7, r * 32 + 6, 18, 20);
        if (!lit) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(c * 32 + 7, r * 32 + 6, 7, 20);
        }
      }
  });
}

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

let palette: Record<MatKey, THREE.Material> | null = null;

export function materials(): Record<MatKey, THREE.Material> {
  if (palette) return palette;
  const winLit = windowTex(true);
  const beamTex = stripeTex();
  const waterTex = stripeTex();
  palette = {
    matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
    gloss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, metalness: 0.55 }),
    brick: new THREE.MeshStandardMaterial({ vertexColors: true, map: brickTex(), roughness: 0.8 }),
    roof: new THREE.MeshStandardMaterial({ vertexColors: true, map: roofTex(), roughness: 0.55 }),
    window: new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: windowTex(false),
      emissiveMap: winLit,
      emissive: new THREE.Color('#ffc864'),
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.2,
    }),
    wood: new THREE.MeshStandardMaterial({ vertexColors: true, map: woodTex(), roughness: 0.7 }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    pulse: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    beam: new THREE.MeshBasicMaterial({
      vertexColors: true,
      map: beamTex,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    water: new THREE.MeshBasicMaterial({
      vertexColors: true,
      map: waterTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    smoke: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true, opacity: 0.85 }),
  };
  return palette;
}

/** Texture repeats per model unit (a footprint is 1 unit across). */
export const UV_DENSITY: Partial<Record<MatKey, number>> = {
  brick: 3.2,
  roof: 3,
  window: 2.4,
  wood: 2.5,
  beam: 1,
  water: 1,
};

/** Shared, time-driven material animation (energy cores, beams, waterfalls). */
export function animateMaterials(time: number) {
  if (!palette) return;
  const pulse = palette.pulse as THREE.MeshBasicMaterial;
  const k = 0.75 + 0.25 * Math.sin(time * 5);
  pulse.color.setRGB(k, k, k);
  (palette.beam as THREE.MeshBasicMaterial).map!.offset.y = -time * 0.6;
  (palette.water as THREE.MeshBasicMaterial).map!.offset.y = time * 1.5;
}

/** Night-time window glow, for district lighting later. */
export function setWindowGlow(intensity: number) {
  (materials().window as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
}
