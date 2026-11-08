import * as THREE from 'three';
import { CONFIG } from '../core/config';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

/** Deep-blue blueprint sheet: fine grid, faint technical drawings, a title block and paper grain. */
export function blueprintTexture(): THREE.Texture {
  const W = CONFIG.tableWidth;
  const L = CONFIG.tableLength;
  const px = 768;
  const { c, ctx } = canvas(px, Math.round((px * L) / W));
  const H = c.height;
  ctx.fillStyle = '#1d4e89';
  ctx.fillRect(0, 0, px, H);

  // Paper grain.
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,30,0.05)';
    ctx.fillRect(rnd() * px, rnd() * H, 2, 2);
  }

  const g = ctx.createRadialGradient(px / 2, H * 0.45, px * 0.1, px / 2, H * 0.45, H * 0.65);
  g.addColorStop(0, 'rgba(120,180,255,0.3)');
  g.addColorStop(1, 'rgba(0,10,40,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, H);

  const step = px / 50;
  for (let i = 0; i * step <= Math.max(px, H) + 1; i++) {
    const major = i % 5 === 0;
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.07)';
    ctx.lineWidth = major ? 1.5 : 1;
    if (i * step <= H + 1) {
      ctx.beginPath();
      ctx.moveTo(0, H - i * step);
      ctx.lineTo(px, H - i * step);
      ctx.stroke();
    }
    if (i * step <= px + 1) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, H);
      ctx.stroke();
    }
  }

  // Faint technical drawings: house elevations and a floor plan with dimension lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  const elevation = (x: number, y: number, w: number, h: number, floors: number) => {
    ctx.strokeRect(x, y - h, w, h);
    ctx.beginPath();
    ctx.moveTo(x - 8, y - h);
    ctx.lineTo(x + w / 2, y - h - w * 0.4);
    ctx.lineTo(x + w + 8, y - h);
    ctx.stroke();
    for (let f = 0; f < floors; f++)
      for (let k = 0; k < 3; k++) ctx.strokeRect(x + 10 + k * ((w - 20) / 3), y - h + 10 + f * (h / floors), (w - 20) / 3 - 10, h / floors - 22);
  };
  elevation(70, H * 0.32, 150, 120, 2);
  elevation(520, H * 0.22, 170, 170, 3);
  ctx.strokeRect(470, H * 0.5, 220, 160);
  ctx.beginPath();
  ctx.moveTo(470, H * 0.5 + 80);
  ctx.lineTo(600, H * 0.5 + 80);
  ctx.moveTo(600, H * 0.5);
  ctx.lineTo(600, H * 0.5 + 160);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(600, H * 0.5 + 80, 40, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  const dim = (x1: number, y1: number, x2: number, y2: number, label: string) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (const [x, y, d] of [
      [x1, y1, 1],
      [x2, y2, -1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + d * 12 * Math.cos(a - 0.4), y + d * 12 * Math.sin(a - 0.4));
      ctx.moveTo(x, y);
      ctx.lineTo(x + d * 12 * Math.cos(a + 0.4), y + d * 12 * Math.sin(a + 0.4));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '18px "Architects Daughter", cursive';
    ctx.fillText(label, (x1 + x2) / 2 - 20, (y1 + y2) / 2 - 8);
  };
  dim(70, H * 0.32 + 26, 220, H * 0.32 + 26, '12.00 m');
  dim(470, H * 0.5 + 180, 690, H * 0.5 + 180, '18.50 m');
  dim(710, H * 0.5, 710, H * 0.5 + 160, '');
  ctx.beginPath();
  ctx.arc(150, H * 0.62, 70, 0, Math.PI * 2);
  ctx.moveTo(60, H * 0.62);
  ctx.lineTo(240, H * 0.62);
  ctx.moveTo(150, H * 0.62 - 90);
  ctx.lineTo(150, H * 0.62 + 90);
  ctx.stroke();

  // Launch "cut line": dashed white with a scissors mark.
  const ly = H - (CONFIG.launchY / L) * H;
  ctx.setLineDash([20, 14]);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, ly);
  ctx.lineTo(px, ly);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '30px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2702', 6, ly + 1);

  // Title block in the near-right corner.
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px - 220, H - 100, 205, 84);
  ctx.beginPath();
  ctx.moveTo(px - 220, H - 62);
  ctx.lineTo(px - 15, H - 62);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.26)';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '900 27px "Big Shoulders Display", system-ui, sans-serif';
  ctx.fillText('BLUEPRINT MERGE', px - 208, H - 71);
  ctx.font = '18px "Architects Daughter", system-ui, sans-serif';
  ctx.fillText('Sheet 01 · Scale 1:100', px - 208, H - 32);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Packed-dirt construction ground with pebbles and tyre tracks (tiles). */
export function groundTexture(): THREE.Texture {
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = '#c9a26b';
  ctx.fillRect(0, 0, 256, 256);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1800; i++) {
    const v = rnd();
    ctx.fillStyle = v < 0.5 ? 'rgba(120,85,50,0.18)' : 'rgba(255,240,210,0.16)';
    const s = 1 + rnd() * 3;
    ctx.fillRect(rnd() * 256, rnd() * 256, s, s);
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = 'rgba(110,95,80,0.45)';
    ctx.beginPath();
    ctx.ellipse(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 1.5 + rnd() * 2, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(100,70,40,0.12)';
  for (let y = 0; y < 256; y += 10) {
    ctx.fillRect(60, y, 16, 5);
    ctx.fillRect(110, y + 5, 16, 5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
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

/** Starburst: soft core with long rays, for the merge impact. */
export function starTexture(): THREE.Texture {
  const { c, ctx } = canvas(128, 128);
  ctx.translate(64, 64);
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.4, 'rgba(255,250,220,0.8)');
  core.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = core;
  ctx.fillRect(-64, -64, 128, 128);
  ctx.fillStyle = 'rgba(255,255,240,0.9)';
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i / 8) * Math.PI * 2);
    const len = i % 2 ? 40 : 62;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, 5);
    ctx.fill();
    ctx.restore();
  }
  return new THREE.CanvasTexture(c);
}

/** Four-point sparkle. */
export function sparkleTexture(): THREE.Texture {
  const { c, ctx } = canvas(64, 64);
  ctx.translate(32, 32);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-32, -32, 64, 64);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(0, -30);
    ctx.lineTo(3, 0);
    ctx.fill();
    ctx.restore();
  }
  return new THREE.CanvasTexture(c);
}
