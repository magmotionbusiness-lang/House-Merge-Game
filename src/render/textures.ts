import * as THREE from 'three';
import { CONFIG } from '../core/config';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

/** Deep-blue blueprint sheet with a fine grid and a soft centre spotlight. */
export function blueprintTexture(): THREE.Texture {
  const W = CONFIG.tableWidth;
  const L = CONFIG.tableLength;
  const px = 512;
  const { c, ctx } = canvas(px, Math.round((px * L) / W));
  const H = c.height;
  ctx.fillStyle = '#1d4e89';
  ctx.fillRect(0, 0, px, H);

  const g = ctx.createRadialGradient(px / 2, H * 0.45, px * 0.1, px / 2, H * 0.45, H * 0.65);
  g.addColorStop(0, 'rgba(120,180,255,0.28)');
  g.addColorStop(1, 'rgba(0,10,40,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, H);

  const step = px / 50;
  for (let i = 0; i * step <= H + 1; i++) {
    const major = i % 5 === 0;
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = major ? 1.5 : 1;
    const y = H - i * step;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(px, y);
    ctx.stroke();
  }
  for (let i = 0; i * step <= px + 1; i++) {
    const major = i % 5 === 0;
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = major ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, H);
    ctx.stroke();
  }

  // Launch "cut line": dashed white.
  const ly = H - (CONFIG.launchY / L) * H;
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, ly);
  ctx.lineTo(px, ly);
  ctx.stroke();
  ctx.setLineDash([]);

  // Title block in the back-right corner.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px - 150, H - 70, 140, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = '900 19px "Big Shoulders Display", system-ui, sans-serif';
  ctx.fillText('BLUEPRINT MERGE', px - 142, H - 47);
  ctx.font = '13px "Architects Daughter", system-ui, sans-serif';
  ctx.fillText('Sheet 01 · Scale 1:100', px - 142, H - 25);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function dashTexture(color: string, dash = 0.6): THREE.Texture {
  const { c, ctx } = canvas(64, 8);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 64 * dash, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function dotTexture(): THREE.Texture {
  const { c, ctx } = canvas(32, 32);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(16, 16, 9, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function hazardTexture(): THREE.Texture {
  const { c, ctx } = canvas(128, 16);
  ctx.fillStyle = '#f5c400';
  ctx.fillRect(0, 0, 128, 16);
  ctx.fillStyle = '#1b1b1b';
  for (let x = -16; x < 144; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 16);
    ctx.lineTo(x + 8, 0);
    ctx.lineTo(x + 16, 0);
    ctx.lineTo(x + 8, 16);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft radial shadow used under every piece. */
export function blobTexture(): THREE.Texture {
  const { c, ctx } = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
  g.addColorStop(0, 'rgba(0,10,30,0.85)');
  g.addColorStop(0.5, 'rgba(0,10,30,0.4)');
  g.addColorStop(1, 'rgba(0,10,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** Soft white puff for dust sprites (tinted by the sprite material). */
export function puffTexture(): THREE.Texture {
  const { c, ctx } = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Rank badge: the tier number on its colour, inside a ring that shows the era
 * (bronze, silver, gold, diamond), so value reads at a glance.
 */
export function badgeTexture(tierId: number, color: string, ring: string, diamond: boolean): THREE.Texture {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createLinearGradient(0, 0, 128, 128);
  if (diamond) {
    g.addColorStop(0, '#b9fbff');
    g.addColorStop(0.5, '#7ff3ff');
    g.addColorStop(1, '#c8a8ff');
  } else {
    g.addColorStop(0, new THREE.Color(ring).lerp(new THREE.Color('#ffffff'), 0.45).getStyle());
    g.addColorStop(1, new THREE.Color(ring).multiplyScalar(0.75).getStyle());
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(64, 68, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(64, 64, 45, 0, Math.PI * 2);
  ctx.fill();
  const light = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).l > 0.72;
  ctx.font = '900 66px "Big Shoulders Display", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.35)';
  ctx.strokeText(String(tierId), 64, 68);
  ctx.fillStyle = light ? '#1b2333' : '#ffffff';
  ctx.fillText(String(tierId), 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
