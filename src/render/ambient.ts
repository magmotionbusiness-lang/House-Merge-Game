import { currentTheme, onTheme, type ThemeId } from '../core/themes';

/**
 * A light animated layer between the painted backdrop and the game: the
 * scenery comes alive without touching the board.
 * - Site: warm dust motes drifting up.
 * - Beach: sun glints twinkling, hibiscus petals and the odd seagull.
 * - Alpine: falling snow.
 * - Sweet: tumbling sprinkles and sparkles.
 * - Neon: rain streaks and drifting glow orbs.
 *
 * A theme change lets the old particles fade out while the new ones fill in.
 */

type Kind = 'mote' | 'glint' | 'petal' | 'bird' | 'snow' | 'sprinkle' | 'twinkle' | 'rain' | 'orb' | 'bubble' | 'fish' | 'ray' | 'blossom' | 'gust' | 'sandgrain' | 'falcon' | 'shimmer';

interface P {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  phase: number;
  color: string;
  alpha: number; // fades in on spawn, out on theme change
  leaving: boolean;
}

interface Mix {
  kind: Kind;
  count: number;
}

const MIX: Record<ThemeId, Mix[]> = {
  site: [{ kind: 'mote', count: 22 }],
  beach: [
    { kind: 'glint', count: 16 },
    { kind: 'petal', count: 8 },
    { kind: 'bird', count: 2 },
  ],
  alpine: [{ kind: 'snow', count: 75 }],
  sweet: [
    { kind: 'sprinkle', count: 30 },
    { kind: 'twinkle', count: 12 },
  ],
  neon: [
    { kind: 'rain', count: 55 },
    { kind: 'orb', count: 10 },
  ],
  // Bubbles wobbling up, little fish schools crossing, light rays swaying from the surface.
  atlantis: [
    { kind: 'ray', count: 4 },
    { kind: 'bubble', count: 34 },
    { kind: 'fish', count: 5 },
  ],
  // Cherry petals riding a calm, gusting breeze.
  sakura: [{ kind: 'blossom', count: 42 }],
  // Sand streams blowing across, heat shimmer over the dunes, a falcon circling, sun glints on the oasis.
  desert: [
    { kind: 'gust', count: 7 },
    { kind: 'sandgrain', count: 46 },
    { kind: 'shimmer', count: 10 },
    { kind: 'falcon', count: 1 },
  ],
};

const SPRINKLES = ['#ff7fb5', '#ffd84d', '#7fd8ff', '#9be3c9', '#c9b3ff', '#ffffff'];
const PETALS = ['#ff6b8b', '#ff8fa3', '#ffb347', '#ffffff'];
const ORBS = ['#ff3df2', '#3df5ff', '#b48cff'];
const FISH = ['#ff9a3d', '#ffd84d', '#4fc3f7', '#ff7fb5', '#b48cff'];
const BLOSSOMS = ['#ffc2dc', '#ffb3d1', '#ffd6e8', '#ffe8f2', '#ff9ec4'];

/** The breeze in Sakura Spring: calm with slow gusts, shared by every petal. */
const breeze = (t: number) => 26 + 18 * Math.sin(t * 0.35) + 10 * Math.sin(t * 0.9 + 1.3);

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** A soft round glow drawn once and reused (cheaper than a gradient per particle per frame). */
function glowSprite(color: string, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export class Ambient {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private parts: P[] = [];
  private theme: ThemeId = currentTheme().id;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private time = 0;
  private density = 1;
  private sprites = new Map<string, HTMLCanvasElement>();

  constructor(host: HTMLElement, before: Element | null) {
    this.canvas.id = 'bg-fx';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(this.canvas, before);
    onTheme((t) => this.setTheme(t.id));
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.density = 0.3;
  }

  /** Fewer particles in Calm mode. */
  setCalm(calm: boolean) {
    this.density = calm ? 0.4 : 1;
  }

  setTheme(id: ThemeId) {
    if (id === this.theme) return;
    this.theme = id;
    for (const p of this.parts) p.leaving = true;
  }

  private sprite(color: string) {
    let s = this.sprites.get(color);
    if (!s) {
      s = glowSprite(color);
      this.sprites.set(color, s);
    }
    return s;
  }

  private fit() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  private spawn(kind: Kind, anywhere: boolean): P {
    const W = this.w;
    const H = this.h;
    const p: P = { kind, x: rand(0, W), y: rand(0, H), vx: 0, vy: 0, size: 2, rot: rand(0, 6.28), vr: 0, phase: rand(0, 6.28), color: '#fff', alpha: 0, leaving: false };
    switch (kind) {
      case 'mote':
        p.size = rand(1.2, 3.2);
        p.vx = rand(-8, 8);
        p.vy = rand(-16, -5);
        p.color = '#fff1d0';
        if (!anywhere) p.y = H + 10;
        break;
      case 'glint':
        // Sun sparkling on the sea and wet sand (the visible strips beside the board).
        p.size = rand(5, 11);
        p.y = rand(H * 0.5, H * 0.66);
        p.vx = rand(-3, 3);
        break;
      case 'petal':
        p.size = rand(4, 7);
        p.vx = rand(8, 22);
        p.vy = rand(14, 28);
        p.vr = rand(-2, 2);
        p.color = PETALS[Math.floor(Math.random() * PETALS.length)];
        if (!anywhere) {
          p.y = -10;
          p.x = rand(-W * 0.2, W);
        }
        break;
      case 'bird':
        p.size = rand(7, 11);
        p.y = rand(H * 0.06, H * 0.3);
        p.vx = rand(28, 46) * (Math.random() < 0.5 ? -1 : 1);
        p.x = p.vx > 0 ? -30 - rand(0, W) : W + 30 + rand(0, W);
        break;
      case 'snow':
        p.size = rand(1.3, 4.2);
        p.vy = 18 + p.size * 11;
        p.vx = rand(-6, 6);
        if (!anywhere) p.y = -8;
        break;
      case 'sprinkle':
        p.size = rand(5, 8);
        p.vy = rand(14, 30);
        p.vx = rand(-6, 6);
        p.vr = rand(-3, 3);
        p.color = SPRINKLES[Math.floor(Math.random() * SPRINKLES.length)];
        if (!anywhere) p.y = -10;
        break;
      case 'twinkle':
        p.size = rand(5, 10);
        p.color = Math.random() < 0.5 ? '#ffffff' : '#ffd1e8';
        break;
      case 'rain':
        p.size = rand(14, 26);
        p.vy = rand(520, 760);
        p.vx = -p.vy * 0.12;
        if (!anywhere) p.y = -30;
        break;
      case 'bubble':
        p.size = rand(2, 7);
        p.vy = -(18 + p.size * 7);
        p.vx = 0;
        if (!anywhere) p.y = H + 10;
        break;
      case 'fish':
        // A small school: `size` is fish length; it swims across and loops.
        p.size = rand(9, 15);
        p.y = rand(H * 0.08, H * 0.42);
        p.vx = rand(22, 40) * (Math.random() < 0.5 ? -1 : 1);
        p.x = p.vx > 0 ? -60 - rand(0, W * 0.6) : W + 60 + rand(0, W * 0.6);
        p.color = FISH[Math.floor(Math.random() * FISH.length)];
        p.vr = 2 + Math.floor(Math.random() * 3); // fish in the school
        break;
      case 'ray':
        p.x = rand(-W * 0.1, W * 1.1);
        p.y = 0;
        p.size = rand(40, 90);
        break;
      case 'blossom':
        p.size = rand(4, 8);
        p.vy = rand(16, 30);
        p.vr = rand(-2.5, 2.5);
        p.color = BLOSSOMS[Math.floor(Math.random() * BLOSSOMS.length)];
        if (!anywhere) {
          p.y = -10;
          p.x = rand(-W * 0.35, W);
        }
        break;
      case 'gust':
        p.size = rand(60, 140); // streak length
        p.y = rand(H * 0.35, H * 0.98);
        p.vx = rand(90, 150);
        p.x = -p.size - rand(0, W);
        break;
      case 'sandgrain':
        p.size = rand(1, 2.4);
        p.vx = rand(40, 110);
        p.vy = rand(-6, 10);
        p.color = Math.random() < 0.5 ? '#ffe2a0' : '#f3c27a';
        if (!anywhere) p.x = -10;
        break;
      case 'shimmer':
        p.size = rand(18, 40);
        p.y = rand(H * 0.3, H * 0.55);
        break;
      case 'falcon':
        p.size = rand(10, 13);
        p.x = rand(W * 0.2, W * 0.8);
        p.y = rand(H * 0.1, H * 0.22);
        break;
      case 'orb':
        p.size = rand(16, 34);
        p.vy = rand(-14, -6);
        p.vx = rand(-5, 5);
        p.color = ORBS[Math.floor(Math.random() * ORBS.length)];
        if (!anywhere) p.y = H + 30;
        break;
    }
    return p;
  }

  tick(dt: number) {
    if (document.hidden) return;
    this.fit();
    if (!this.w || !this.h) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const W = this.w;
    const H = this.h;

    // Keep the current theme's mix topped up.
    for (const m of MIX[this.theme]) {
      const want = Math.round(m.count * this.density);
      let have = 0;
      for (const p of this.parts) if (p.kind === m.kind && !p.leaving) have++;
      for (let i = have; i < want; i++) this.parts.push(this.spawn(m.kind, this.parts.length < 4 || Math.random() < 0.5));
    }

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const keep: P[] = [];
    for (const p of this.parts) {
      p.alpha = p.leaving ? p.alpha - dt * 1.5 : Math.min(1, p.alpha + dt * 1.2);
      if (p.alpha <= 0 && p.leaving) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const t = this.time + p.phase;
      let gone = false;
      ctx.globalAlpha = Math.max(0, p.alpha);
      switch (p.kind) {
        case 'mote': {
          p.x += Math.sin(t * 0.8) * 6 * dt;
          ctx.globalAlpha *= 0.35 + 0.25 * Math.sin(t * 2);
          ctx.drawImage(this.sprite(p.color), p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
          gone = p.y < -10;
          break;
        }
        case 'glint': {
          const k = Math.max(0, Math.sin(t * 2.2));
          const s = p.size * k * k;
          ctx.globalAlpha *= k;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x + s * 0.18, p.y - s * 0.18);
          ctx.lineTo(p.x + s, p.y);
          ctx.lineTo(p.x + s * 0.18, p.y + s * 0.18);
          ctx.lineTo(p.x, p.y + s);
          ctx.lineTo(p.x - s * 0.18, p.y + s * 0.18);
          ctx.lineTo(p.x - s, p.y);
          ctx.lineTo(p.x - s * 0.18, p.y - s * 0.18);
          ctx.fill();
          gone = p.x < -20 || p.x > W + 20;
          break;
        }
        case 'petal': {
          p.x += Math.sin(t * 1.6) * 14 * dt;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, 0.45 + 0.35 * Math.sin(t * 3));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          gone = p.y > H + 12 || p.x > W + 20;
          break;
        }
        case 'bird': {
          const flap = Math.sin(t * 9) * p.size * 0.45;
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y - flap);
          ctx.quadraticCurveTo(p.x - p.size * 0.4, p.y - p.size * 0.2, p.x, p.y);
          ctx.quadraticCurveTo(p.x + p.size * 0.4, p.y - p.size * 0.2, p.x + p.size, p.y - flap);
          ctx.stroke();
          p.y += Math.sin(t * 0.7) * 4 * dt;
          gone = (p.vx > 0 && p.x > W + 40) || (p.vx < 0 && p.x < -40);
          break;
        }
        case 'snow': {
          p.x += Math.sin(t * 1.3) * 12 * dt;
          ctx.globalAlpha *= p.size > 3.5 ? 0.75 : 0.95;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          gone = p.y > H + 10;
          break;
        }
        case 'sprinkle': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          const w = p.size;
          const r = 1.6;
          ctx.beginPath();
          ctx.roundRect?.(-w / 2, -r, w, r * 2, r);
          if (!ctx.roundRect) ctx.rect(-w / 2, -r, w, r * 2);
          ctx.fill();
          ctx.restore();
          gone = p.y > H + 12;
          break;
        }
        case 'twinkle': {
          const k = Math.max(0, Math.sin(t * 1.7));
          ctx.globalAlpha *= k * 0.9;
          ctx.drawImage(this.sprite(p.color), p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
          break;
        }
        case 'rain': {
          ctx.strokeStyle = 'rgba(170,210,255,0.38)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.size);
          ctx.stroke();
          gone = p.y > H + 30;
          break;
        }
        case 'bubble': {
          p.x += Math.sin(t * 2.4) * 10 * dt;
          ctx.strokeStyle = 'rgba(230,252,255,0.85)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.beginPath();
          ctx.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.28, 0, Math.PI * 2);
          ctx.fill();
          gone = p.y < -12;
          break;
        }
        case 'fish': {
          const dir = Math.sign(p.vx);
          p.y += Math.sin(t * 0.8) * 6 * dt;
          ctx.fillStyle = p.color;
          for (let k = 0; k < p.vr; k++) {
            const fx = p.x - dir * k * p.size * 1.6 + Math.sin(k * 2.1) * 4;
            const fy = p.y + (k % 2 ? 1 : -1) * k * p.size * 0.55;
            const wag = Math.sin(t * 9 + k) * p.size * 0.18;
            ctx.beginPath();
            ctx.ellipse(fx, fy, p.size * 0.5, p.size * 0.26, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(fx - dir * p.size * 0.42, fy);
            ctx.lineTo(fx - dir * p.size * 0.85, fy - p.size * 0.26 + wag);
            ctx.lineTo(fx - dir * p.size * 0.85, fy + p.size * 0.26 + wag);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(fx + dir * p.size * 0.2 - 1, fy - 2, 2, 2);
            ctx.fillStyle = p.color;
          }
          gone = (p.vx > 0 && p.x > W + 80) || (p.vx < 0 && p.x < -80);
          break;
        }
        case 'ray': {
          const sway = Math.sin(t * 0.25) * 40;
          const g = ctx.createLinearGradient(0, 0, 0, H * 0.7);
          const a = 0.1 + 0.06 * Math.sin(t * 0.7);
          g.addColorStop(0, `rgba(255,255,240,${a})`);
          g.addColorStop(1, 'rgba(255,255,240,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size * 0.3, 0);
          ctx.lineTo(p.x + p.size * 0.3, 0);
          ctx.lineTo(p.x + sway + p.size, H * 0.7);
          ctx.lineTo(p.x + sway - p.size * 0.2, H * 0.7);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'blossom': {
          // The breeze carries every petal; each also flutters and tumbles on its own.
          p.x += (breeze(this.time) + Math.sin(t * 1.7) * 14) * dt;
          p.y += Math.sin(t * 2.3) * 8 * dt;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, 0.4 + 0.45 * Math.abs(Math.sin(t * 2.6)));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.quadraticCurveTo(p.size * 0.9, -p.size * 0.2, 0, p.size);
          ctx.quadraticCurveTo(-p.size * 0.9, -p.size * 0.2, 0, -p.size);
          ctx.fill();
          ctx.restore();
          gone = p.y > H + 12 || p.x > W + 20;
          break;
        }
        case 'gust': {
          ctx.globalAlpha *= 0.28;
          ctx.strokeStyle = '#fff1d0';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x + p.size * 0.5, p.y - 8 + Math.sin(t * 2) * 6, p.x + p.size, p.y);
          ctx.stroke();
          gone = p.x > W + 20;
          break;
        }
        case 'sandgrain': {
          p.y += Math.sin(t * 3) * 6 * dt;
          ctx.globalAlpha *= 0.8;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size * 2.2, p.size);
          gone = p.x > W + 10;
          break;
        }
        case 'shimmer': {
          // Heat haze: faint wavy lines rising off the dunes.
          ctx.globalAlpha *= 0.18 + 0.12 * Math.sin(t * 1.3);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let k = 0; k <= 8; k++) {
            const xx = p.x - p.size + (k / 8) * p.size * 2;
            const yy = p.y + Math.sin(k * 1.2 + t * 4) * 2.5;
            if (k === 0) ctx.moveTo(xx, yy);
            else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
          break;
        }
        case 'falcon': {
          // Circles slowly high above the oasis.
          const cx = p.x + Math.cos(t * 0.3) * W * 0.22;
          const cy = p.y + Math.sin(t * 0.3) * H * 0.04;
          const flap = Math.sin(t * 2.2) > 0.85 ? Math.sin(t * 14) * p.size * 0.3 : p.size * 0.12;
          ctx.strokeStyle = 'rgba(70,45,25,0.85)';
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx - p.size, cy - flap);
          ctx.quadraticCurveTo(cx - p.size * 0.4, cy - p.size * 0.15, cx, cy);
          ctx.quadraticCurveTo(cx + p.size * 0.4, cy - p.size * 0.15, cx + p.size, cy - flap);
          ctx.stroke();
          break;
        }
        case 'orb': {
          p.x += Math.sin(t * 0.6) * 8 * dt;
          ctx.globalAlpha *= 0.35 + 0.2 * Math.sin(t * 2.3);
          ctx.drawImage(this.sprite(p.color), p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
          gone = p.y < -40;
          break;
        }
      }
      if (gone) {
        // Recycle in place unless this kind no longer belongs to the theme.
        if (!p.leaving) keep.push(this.spawn(p.kind, false));
        continue;
      }
      keep.push(p);
    }
    ctx.globalAlpha = 1;
    this.parts = keep;
  }
}
