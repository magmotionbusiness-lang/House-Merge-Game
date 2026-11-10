import { THEMES, type Theme, type ThemeId } from '../core/themes';

/**
 * Theme backdrops behind the (transparent) game canvas. A theme with painted
 * art uses it; until the art exists, a stylised scene is painted in code so
 * every theme already looks distinct. The board covers the middle and bottom
 * of the screen, so the scenery is composed around the top and the sides.
 *
 * Switching crossfades a new layer in over the old one.
 */

const W = 900;
const H = 1600;

type Ctx = CanvasRenderingContext2D;

/** Deterministic pseudo-random numbers so a backdrop never changes between visits. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function glowCircle(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function cloud(ctx: Ctx, x: number, y: number, s: number, fill: string, shade: string) {
  const puffs: [number, number, number][] = [[-60, 8, 38], [-20, -14, 50], [30, -6, 44], [68, 10, 32], [0, 14, 40]];
  ctx.fillStyle = shade;
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + (dy + 8) * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = fill;
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------------ beach

function palmTree(ctx: Ctx, x: number, y: number, h: number, lean: number, s: number) {
  ctx.lineCap = 'round';
  // Trunk: a curved, ringed band.
  const tx = x + lean;
  const ty = y - h;
  ctx.strokeStyle = '#7a5332';
  ctx.lineWidth = 26 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 0.2, y - h * 0.55, tx, ty);
  ctx.stroke();
  ctx.strokeStyle = '#a77b4f';
  ctx.lineWidth = 16 * s;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,60,35,0.6)';
  ctx.lineWidth = 3 * s;
  for (let i = 1; i < 12; i++) {
    const t = i / 12;
    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * (x + lean * 0.2) + t * t * tx;
    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y - h * 0.55) + t * t * ty;
    ctx.beginPath();
    ctx.moveTo(px - 11 * s, py);
    ctx.lineTo(px + 11 * s, py + 3 * s);
    ctx.stroke();
  }
  // Fronds.
  const fronds = [-2.7, -2.2, -1.6, -1.0, -0.45, 0.1, 0.6];
  for (const [i, a] of fronds.entries()) {
    const len = (150 + (i % 3) * 25) * s;
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.55 + len * 0.35;
    const mx = tx + Math.cos(a) * len * 0.5;
    const my = ty + Math.sin(a) * len * 0.5 - 30 * s;
    ctx.fillStyle = i % 2 ? '#2f9e44' : '#3fb653';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx - 20 * s * Math.sin(a), my - 26 * s, ex, ey);
    ctx.quadraticCurveTo(mx + 20 * s * Math.sin(a), my + 18 * s, tx, ty + 8 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,90,40,0.55)';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx, my - 4 * s, ex, ey);
    ctx.stroke();
  }
  ctx.fillStyle = '#6b4a2b';
  for (const [dx, dy] of [[-8, 10], [8, 12], [0, 20]]) {
    ctx.beginPath();
    ctx.arc(tx + dx * s, ty + dy * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintBeach(ctx: Ctx) {
  const r = rng(11);
  ctx.fillStyle = vgrad(ctx, 0, H * 0.42, [[0, '#2fa8e8'], [0.6, '#7fd3f7'], [1, '#d4f4ff']]);
  ctx.fillRect(0, 0, W, H);
  glowCircle(ctx, W * 0.78, H * 0.1, 240, 'rgba(255,250,220,0.95)', 'rgba(255,250,220,0)');
  glowCircle(ctx, W * 0.78, H * 0.1, 70, '#fffbe6', 'rgba(255,245,200,0.9)');
  cloud(ctx, W * 0.22, H * 0.09, 1.1, '#ffffff', '#d6efff');
  cloud(ctx, W * 0.6, H * 0.2, 0.8, '#ffffff', '#d6efff');
  cloud(ctx, W * 0.95, H * 0.27, 0.7, '#ffffff', '#d6efff');
  // Sea.
  const sea = H * 0.34;
  ctx.fillStyle = vgrad(ctx, sea, H * 0.56, [[0, '#1aa6c9'], [0.5, '#2fd0d8'], [1, '#8ff0e0']]);
  ctx.fillRect(0, sea, W, H * 0.25);
  // Distant island.
  ctx.fillStyle = '#3c9a6a';
  ctx.beginPath();
  ctx.ellipse(W * 0.3, sea + 4, 120, 26, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#e9d29d';
  ctx.fillRect(W * 0.3 - 130, sea, 260, 6);
  // Sparkles on the water.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 70; i++) {
    const y = sea + 10 + r() * H * 0.2;
    const w = 10 + r() * 40 * ((y - sea) / (H * 0.2));
    ctx.fillRect(r() * W, y, w, 3);
  }
  // Sand.
  const sand = H * 0.53;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, sand - 6);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, sand - 6 + Math.sin(x * 0.03) * 7);
  ctx.lineTo(W, sand + 20);
  ctx.lineTo(0, sand + 20);
  ctx.fill();
  ctx.fillStyle = vgrad(ctx, sand, H, [[0, '#f6dfa8'], [1, '#e2bd7c']]);
  ctx.beginPath();
  ctx.moveTo(0, sand);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, sand + Math.sin(x * 0.03) * 7);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,150,90,0.35)';
  for (let i = 0; i < 120; i++) ctx.fillRect(r() * W, sand + r() * (H - sand), 3, 3);
  // Shells and a starfish near the edges.
  for (const [x, y, c] of [[60, H * 0.88, '#ff8fa3'], [W - 70, H * 0.8, '#ffb07a'], [90, H * 0.66, '#fff1e0']] as const) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 11, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Framing palms on both sides.
  palmTree(ctx, 40, H * 0.66, 520, 90, 1.25);
  palmTree(ctx, W - 30, H * 0.6, 480, -110, 1.1);
  palmTree(ctx, W - 120, H * 0.48, 300, -60, 0.75);
}

// ------------------------------------------------------------------ alpine

function mountains(ctx: Ctx, base: number, peaks: [number, number][], fill: string, snow: string | null) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-20, base);
  for (const [x, y] of peaks) ctx.lineTo(x, y);
  ctx.lineTo(W + 20, base);
  ctx.closePath();
  ctx.fill();
  if (!snow) return;
  ctx.fillStyle = snow;
  for (let i = 1; i < peaks.length - 1; i++) {
    const [x, y] = peaks[i];
    const [px, py] = peaks[i - 1];
    const [nx, ny] = peaks[i + 1];
    if (y > py || y > ny) continue;
    const d = 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (nx - x) * d, y + (ny - y) * d);
    ctx.lineTo(x + (nx - x) * d * 0.5, y + (ny - y) * d * 0.7);
    ctx.lineTo(x, y + (ny - y) * d * 0.55);
    ctx.lineTo(x + (px - x) * d * 0.5, y + (py - y) * d * 0.8);
    ctx.lineTo(x + (px - x) * d, y + (py - y) * d);
    ctx.closePath();
    ctx.fill();
  }
}

function pineTree(ctx: Ctx, x: number, y: number, h: number, dark: string, light: string) {
  ctx.fillStyle = '#5a3d28';
  ctx.fillRect(x - h * 0.04, y - h * 0.12, h * 0.08, h * 0.12);
  for (let i = 0; i < 4; i++) {
    const w = h * (0.42 - i * 0.08);
    const ty = y - h * (0.1 + i * 0.22);
    ctx.fillStyle = i % 2 ? light : dark;
    ctx.beginPath();
    ctx.moveTo(x - w, ty);
    ctx.lineTo(x, ty - h * 0.36);
    ctx.lineTo(x + w, ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, ty - h * 0.14);
    ctx.lineTo(x, ty - h * 0.36);
    ctx.lineTo(x + w * 0.35, ty - h * 0.18);
    ctx.closePath();
    ctx.fill();
  }
}

function paintAlpine(ctx: Ctx) {
  const r = rng(23);
  ctx.fillStyle = vgrad(ctx, 0, H * 0.45, [[0, '#3f8fdc'], [0.7, '#9fd0f5'], [1, '#e4f3ff']]);
  ctx.fillRect(0, 0, W, H);
  glowCircle(ctx, W * 0.2, H * 0.08, 200, 'rgba(255,252,235,0.9)', 'rgba(255,252,235,0)');
  cloud(ctx, W * 0.7, H * 0.08, 0.9, '#ffffff', '#dbeaf7');
  mountains(ctx, H * 0.42, [[-20, H * 0.3], [120, H * 0.17], [260, H * 0.27], [420, H * 0.12], [600, H * 0.25], [760, H * 0.15], [920, H * 0.28]], '#a9bfd6', '#ffffff');
  mountains(ctx, H * 0.48, [[-20, H * 0.33], [80, H * 0.26], [230, H * 0.36], [380, H * 0.24], [540, H * 0.37], [700, H * 0.23], [920, H * 0.36]], '#7d96b3', '#f4f8ff');
  // Snowfield.
  ctx.fillStyle = vgrad(ctx, H * 0.42, H, [[0, '#ffffff'], [1, '#dfe9f5']]);
  ctx.beginPath();
  ctx.moveTo(0, H * 0.44);
  ctx.quadraticCurveTo(W * 0.3, H * 0.4, W * 0.6, H * 0.45);
  ctx.quadraticCurveTo(W * 0.85, H * 0.49, W, H * 0.43);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,185,215,0.35)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(r() * W, H * (0.55 + r() * 0.4), 120 + r() * 80, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pine forests framing both sides.
  for (let i = 0; i < 7; i++) pineTree(ctx, 30 + i * 30 + r() * 20, H * (0.47 + i * 0.012), 150 + r() * 60, '#2b6b47', '#357f55');
  for (let i = 0; i < 7; i++) pineTree(ctx, W - 30 - i * 30 - r() * 20, H * (0.46 + i * 0.012), 150 + r() * 60, '#2b6b47', '#357f55');
  pineTree(ctx, 50, H * 0.8, 380, '#1f5a3a', '#2b6b47');
  pineTree(ctx, W - 40, H * 0.74, 340, '#1f5a3a', '#2b6b47');
  // A cosy cabin peeking in at the top left.
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(150, H * 0.43 - 50, 90, 50);
  ctx.fillStyle = '#d6392f';
  ctx.beginPath();
  ctx.moveTo(140, H * 0.43 - 48);
  ctx.lineTo(195, H * 0.43 - 90);
  ctx.lineTo(250, H * 0.43 - 48);
  ctx.fill();
  ctx.fillStyle = '#ffe7a8';
  ctx.fillRect(180, H * 0.43 - 38, 22, 18);
  // Falling snow.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 140; i++) {
    ctx.beginPath();
    ctx.arc(r() * W, r() * H, 1.5 + r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------------ sweet

function lollipopProp(ctx: Ctx, x: number, y: number, h: number, r: number, c1: string, c2: string) {
  ctx.fillStyle = '#fff7ee';
  ctx.fillRect(x - 6, y - h, 12, h);
  ctx.save();
  ctx.translate(x, y - h);
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c2;
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 6; a += 0.1) {
    const rr = (a / (Math.PI * 6)) * r * 0.85;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.stroke();
  ctx.restore();
}

function caneProp(ctx: Ctx, x: number, y: number, h: number) {
  ctx.lineCap = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h);
    ctx.arc(x + 40, y - h, 40, Math.PI, 0);
  };
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 30;
  path();
  ctx.stroke();
  ctx.strokeStyle = '#e8384f';
  ctx.lineWidth = 30;
  ctx.setLineDash([22, 22]);
  path();
  ctx.stroke();
  ctx.setLineDash([]);
}

function paintSweet(ctx: Ctx) {
  const r = rng(37);
  ctx.fillStyle = vgrad(ctx, 0, H * 0.5, [[0, '#ff9ccf'], [0.55, '#ffc8e4'], [1, '#fff0f7']]);
  ctx.fillRect(0, 0, W, H);
  glowCircle(ctx, W * 0.75, H * 0.09, 210, 'rgba(255,248,210,0.95)', 'rgba(255,248,210,0)');
  cloud(ctx, W * 0.2, H * 0.1, 1.1, '#ffe3f1', '#ffc2de');
  cloud(ctx, W * 0.55, H * 0.2, 0.8, '#e3f4ff', '#c2e4ff');
  cloud(ctx, W * 0.95, H * 0.17, 0.75, '#fff6d6', '#ffe6a6');
  // Candy hills, striped like ribbon candy.
  const hills: [number, number, number, string, string][] = [
    [W * 0.15, H * 0.4, 260, '#9be3c9', '#c8f5e4'],
    [W * 0.75, H * 0.38, 300, '#c9b3ff', '#e2d6ff'],
    [W * 0.45, H * 0.44, 280, '#ffd27f', '#ffe6b3'],
  ];
  for (const [x, y, rr, a, b] of hills) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + rr * 0.5, rr, rr * 0.75, 0, Math.PI, 0);
    ctx.clip();
    ctx.fillStyle = a;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    ctx.fillStyle = b;
    for (let i = -6; i < 6; i++) {
      ctx.save();
      ctx.translate(x + i * 60, y);
      ctx.rotate(-0.5);
      ctx.fillRect(-12, -rr, 24, rr * 3);
      ctx.restore();
    }
    ctx.restore();
  }
  // Frosting ground with drips.
  const g = H * 0.47;
  ctx.fillStyle = vgrad(ctx, g, H, [[0, '#fff3f8'], [1, '#ffd6e8']]);
  ctx.beginPath();
  ctx.moveTo(0, g);
  for (let x = 0; x <= W; x += 45) ctx.quadraticCurveTo(x + 22, g - 20, x + 45, g);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  // Sprinkles everywhere on the ground.
  const cols = ['#ff5e8a', '#ffd84d', '#6fd6ff', '#7ee081', '#b48cff', '#ff9a3d'];
  for (let i = 0; i < 260; i++) {
    ctx.save();
    ctx.translate(r() * W, g + 20 + r() * (H - g));
    ctx.rotate(r() * Math.PI);
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(-7, -2.5, 14, 5);
    ctx.restore();
  }
  // Framing candy on both sides.
  caneProp(ctx, 60, H * 0.72, 380);
  lollipopProp(ctx, W - 70, H * 0.7, 300, 80, '#ff5e8a', '#ffffff');
  lollipopProp(ctx, 150, H * 0.5, 160, 50, '#6fd6ff', '#ffffff');
  lollipopProp(ctx, W - 170, H * 0.48, 140, 44, '#ffd84d', '#ff9a3d');
  // Gumdrops.
  for (const [x, y, c] of [[40, H * 0.92, '#7ee081'], [W - 50, H * 0.9, '#b48cff'], [W - 110, H * 0.95, '#ff9a3d']] as const) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, 36, 42, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(x - 10, y - 26, 8, 12, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------------ neon

function paintNeon(ctx: Ctx) {
  const r = rng(53);
  ctx.fillStyle = vgrad(ctx, 0, H * 0.55, [[0, '#070a24'], [0.6, '#1d1048'], [1, '#4a1a6b']]);
  ctx.fillRect(0, 0, W, H);
  // Stars.
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
    ctx.fillRect(r() * W, r() * H * 0.45, 2, 2);
  }
  // Ringed planet.
  glowCircle(ctx, W * 0.74, H * 0.11, 170, 'rgba(255,61,242,0.35)', 'rgba(255,61,242,0)');
  glowCircle(ctx, W * 0.74, H * 0.11, 70, '#ffb3f5', '#b13dff');
  ctx.strokeStyle = 'rgba(127,243,255,0.85)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(W * 0.74, H * 0.11, 130, 28, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  // Two layers of skyline with lit windows.
  const skyline = (base: number, minH: number, maxH: number, fill: string, lit: string[], seed: () => number) => {
    let x = -20;
    while (x < W + 20) {
      const w = 50 + seed() * 70;
      const h = minH + seed() * (maxH - minH);
      ctx.fillStyle = fill;
      ctx.fillRect(x, base - h, w, h);
      for (let wy = base - h + 14; wy < base - 10; wy += 22)
        for (let wx = x + 8; wx < x + w - 10; wx += 16) {
          if (seed() < 0.45) continue;
          ctx.fillStyle = lit[Math.floor(seed() * lit.length)];
          ctx.fillRect(wx, wy, 8, 10);
        }
      if (seed() < 0.4) {
        ctx.fillStyle = fill;
        ctx.fillRect(x + w / 2 - 3, base - h - 40, 6, 40);
        ctx.fillStyle = '#ff3d6e';
        ctx.fillRect(x + w / 2 - 4, base - h - 44, 8, 8);
      }
      x += w + 6;
    }
  };
  skyline(H * 0.44, 160, 420, '#241a4d', ['rgba(127,243,255,0.5)', 'rgba(255,61,242,0.45)', 'rgba(255,216,77,0.4)'], r);
  skyline(H * 0.5, 120, 330, '#140f33', ['#7ff3ff', '#ff3df2', '#ffd84d', '#b48cff'], r);
  // Neon signs with glow.
  const sign = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.save();
    ctx.shadowColor = c;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = c;
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = c;
    ctx.fillRect(x + 12, y + h / 2 - 3, w - 24, 6);
    ctx.restore();
  };
  sign(40, H * 0.3, 120, 60, '#ff3df2');
  sign(W - 170, H * 0.27, 130, 70, '#3df5ff');
  sign(W - 120, H * 0.4, 80, 40, '#7dff6b');
  // Glowing grid floor.
  const g = H * 0.5;
  ctx.fillStyle = vgrad(ctx, g, H, [[0, '#2a0f4a'], [1, '#0b0820']]);
  ctx.fillRect(0, g, W, H - g);
  ctx.save();
  ctx.shadowColor = '#ff3df2';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = 'rgba(255,61,242,0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const y = g + Math.pow(t, 1.8) * (H - g);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(61,245,255,0.6)';
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 30, g);
    ctx.lineTo(W / 2 + i * 190, H);
    ctx.stroke();
  }
  ctx.restore();
  // Horizon glow.
  ctx.fillStyle = vgrad(ctx, g - 40, g + 40, [[0, 'rgba(255,61,242,0)'], [0.5, 'rgba(255,61,242,0.55)'], [1, 'rgba(255,61,242,0)']]);
  ctx.fillRect(0, g - 40, W, 80);
}

const PAINTERS: Partial<Record<ThemeId, (ctx: Ctx) => void>> = {
  beach: paintBeach,
  alpine: paintAlpine,
  sweet: paintSweet,
  neon: paintNeon,
};

/** Colour shown under the backdrop and below the app (the iOS bottom strip): the scene's ground. */
const GROUND: Record<ThemeId, string> = {
  site: '#d9a35c',
  beach: '#e6b86e',
  alpine: '#eef2fb',
  sweet: '#f3d9ee',
  neon: '#3b2b78',
};

const painted = new Map<ThemeId, HTMLCanvasElement>();

/** Paints (once) and returns a theme's code-drawn backdrop. */
function paint(id: ThemeId) {
  let c = painted.get(id);
  if (!c) {
    c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    PAINTERS[id]?.(c.getContext('2d')!);
    painted.set(id, c);
  }
  return c;
}

const artUrl = (t: Theme) => `${import.meta.env.BASE_URL}${t.art}`;
const loaded = new Map<string, HTMLImageElement>();

/** Starts downloading a painting (once) and calls back when it is ready to show. */
function loadArt(t: Theme, done?: () => void) {
  const url = artUrl(t);
  let img = loaded.get(url);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = url;
    loaded.set(url, img);
  }
  if (!done) return;
  if (img.complete) done();
  else {
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  }
}

/** Builds the layer element for a theme: its painted art when it exists, else the code-drawn scene. */
function layerFor(t: Theme): HTMLElement {
  if (t.art) {
    const d = document.createElement('div');
    d.className = 'bg-layer';
    d.style.backgroundImage = `url('${artUrl(t)}')`;
    return d;
  }
  const src = paint(t.id);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  c.getContext('2d')!.drawImage(src, 0, 0);
  c.className = 'bg-layer';
  return c;
}

/** Prepares a theme's backdrop ahead of time (call during idle time before a switch). */
export function prepareBackdrop(id: ThemeId) {
  if (THEMES[id].art) loadArt(THEMES[id]);
  else paint(id);
}

let shown: ThemeId = 'site';

/** Shows a theme's backdrop, crossfading over the current one unless `instant`. */
export function showBackdrop(id: ThemeId, instant = false) {
  const host = document.getElementById('bg');
  if (!host || id === shown) return;
  shown = id;
  document.documentElement.style.setProperty('--ground', GROUND[id]);
  document.body.classList.toggle('themed', id !== 'site');
  const layer = layerFor(THEMES[id]);
  if (instant) layer.style.opacity = '1';
  host.append(layer);
  const old = [...host.querySelectorAll('.bg-layer')].filter((l) => l !== layer);
  if (instant) {
    old.forEach((l) => l.remove());
    return;
  }
  // Fade in only once the painting has loaded, so the switch never flashes an empty frame.
  const reveal = () =>
    requestAnimationFrame(() => {
      if (!layer.isConnected) return;
      layer.classList.add('in');
      window.setTimeout(() => old.forEach((l) => l.remove()), 700);
    });
  if (THEMES[id].art) loadArt(THEMES[id], reveal);
  else reveal();
}
