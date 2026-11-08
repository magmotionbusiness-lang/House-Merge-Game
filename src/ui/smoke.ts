/**
 * Full-screen construction-dust transition: a wall of grey smoke and dust
 * billows up from the bottom of the screen, carrying chunks of brick,
 * concrete and wood, covers everything for a moment (when the scene behind it
 * changes), then rises off the top and thins away.
 *
 * Drawn on its own 2D canvas with pre-rendered puff sprites, so it stays at
 * 60 fps on phones.
 */

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  grow: number;
  rot: number;
  spin: number;
  sprite: number;
  alpha: number;
  born: number;
  life: number;
  edge: 'front' | 'back';
}

interface Chunk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  spin: number;
  color: string;
  born: number;
}

interface Speck {
  x: number;
  y: number;
  vy: number;
  vx: number;
  r: number;
  a: number;
}

const COVER_AT = 0.62; // seconds: screen fully hidden, swap the scene now
const DURATION = 1.75;

let sprites: HTMLCanvasElement[] | null = null;

/** Soft, lumpy smoke puffs in three tones (light grey, mid grey, warm dust). */
function makeSprites() {
  const tones = [
    [226, 226, 230],
    [196, 197, 203],
    [214, 196, 172],
    [176, 178, 186],
  ];
  return tones.map(([r, g, b], ti) => {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d')!;
    let seed = 17 + ti * 31;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // A cluster of overlapping soft blobs reads as billowing smoke.
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * s * 0.16;
      const cx = s / 2 + Math.cos(a) * d;
      const cy = s / 2 + Math.sin(a) * d;
      const rad = s * (0.22 + rnd() * 0.16);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const shade = 1 - rnd() * 0.12;
      grd.addColorStop(0, `rgba(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)},0.9)`);
      grd.addColorStop(0.55, `rgba(${r},${g},${b},0.55)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  });
}

const CHUNK_COLORS = ['#c8643c', '#b5552f', '#9aa0a8', '#7d838c', '#b88a55', '#8d6a43', '#d6d0c4'];

/**
 * Plays the transition. `onCover` runs once the screen is fully hidden; the
 * returned promise resolves when the smoke has cleared.
 */
export function smokeTransition(onCover?: () => void): Promise<void> {
  sprites ??= makeSprites();
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'smoke-layer';
  // Smoke is soft, so a modest resolution looks identical and keeps phones at 60 fps.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  const W = window.innerWidth;
  const H = Math.max(window.innerHeight, document.documentElement.clientHeight);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  document.body.append(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  if (reduced) {
    // Reduced motion: a simple fade through dust colour.
    return new Promise((resolve) => {
      canvas.style.background = '#cfcbc4';
      canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' }).onfinish = () => {
        onCover?.();
        canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).onfinish = () => {
          canvas.remove();
          resolve();
        };
      };
    });
  }

  const puffs: Puff[] = [];
  const chunks: Chunk[] = [];
  const specks: Speck[] = [];
  const unit = Math.max(W, H * 0.6);

  // The leading edge of the smoke rises to the top by COVER_AT; the trailing
  // edge follows, clearing the screen from the bottom up.
  const frontY = (t: number) => H * (1.15 - (t / COVER_AT) * 1.35);
  const backY = (t: number) => (t < COVER_AT + 0.08 ? H * 1.3 : H * (1.3 - ((t - COVER_AT - 0.08) / (DURATION - COVER_AT - 0.35)) * 1.75));

  const spawnPuff = (t: number, edge: 'front' | 'back', y: number) => {
    puffs.push({
      x: Math.random() * W,
      y: y + (Math.random() - 0.3) * unit * 0.12,
      vx: (Math.random() - 0.5) * unit * 0.12,
      vy: -unit * (edge === 'front' ? 0.35 + Math.random() * 0.4 : 0.6 + Math.random() * 0.5),
      size: unit * (0.38 + Math.random() * 0.32),
      grow: 0.5 + Math.random() * 0.6,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 1.2,
      sprite: Math.floor(Math.random() * sprites!.length),
      alpha: 0,
      born: t,
      life: edge === 'front' ? 1.0 + Math.random() * 0.5 : 0.7 + Math.random() * 0.35,
      edge,
    });
  };

  // Debris kicked up with the first burst of dust.
  for (let i = 0; i < 46; i++) {
    const big = Math.random() < 0.3;
    chunks.push({
      x: Math.random() * W,
      y: H + 20 + Math.random() * 60,
      vx: (Math.random() - 0.5) * W * 0.5,
      vy: -H * (1.25 + Math.random() * 0.75),
      w: (big ? 14 : 6) + Math.random() * (big ? 12 : 8),
      h: (big ? 8 : 4) + Math.random() * (big ? 7 : 5),
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 14,
      color: CHUNK_COLORS[Math.floor(Math.random() * CHUNK_COLORS.length)],
      born: Math.random() * 0.35,
    });
  }
  for (let i = 0; i < 140; i++)
    specks.push({ x: Math.random() * W, y: H + Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 40, vy: -H * (0.8 + Math.random() * 1.2), r: 0.8 + Math.random() * 1.8, a: 0.4 + Math.random() * 0.5 });

  return new Promise((resolve) => {
    let start = -1;
    let last = 0;
    let covered = false;
    let spawnFront = 0;
    let spawnBack = 0;
    const frame = (now: number) => {
      if (start < 0) {
        start = now;
        last = now;
      }
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Keep the two smoke edges thick and billowy.
      const fy = frontY(t);
      while (spawnFront < t && spawnFront < COVER_AT + 0.15) {
        for (let k = 0; k < 3; k++) spawnPuff(spawnFront, 'front', Math.max(fy, -unit * 0.3));
        spawnFront += 0.03;
      }
      const by = backY(t);
      while (t > COVER_AT && spawnBack < t && by > -unit * 0.2) {
        for (let k = 0; k < 3; k++) spawnPuff(spawnBack, 'back', by);
        spawnBack = Math.max(spawnBack, COVER_AT) + 0.032;
      }

      ctx.clearRect(0, 0, W, H);

      // Solid dust body between the edges guarantees full cover mid-transition.
      const top = Math.max(-10, fy + unit * 0.08);
      const bottom = Math.min(H + 10, by - unit * 0.05);
      if (bottom > top) {
        const g = ctx.createLinearGradient(0, top, 0, bottom);
        g.addColorStop(0, '#d9d8dc');
        g.addColorStop(0.5, '#c9c7c6');
        g.addColorStop(1, '#bdb6aa');
        ctx.fillStyle = g;
        ctx.fillRect(0, top, W, bottom - top);
      }

      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        const age = t - p.born;
        if (age > p.life) {
          puffs.splice(i, 1);
          continue;
        }
        const u = age / p.life;
        p.x += (p.vx + Math.sin((t + i) * 2.1) * unit * 0.04) * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        const fadeIn = Math.min(1, age / 0.12);
        const fadeOut = p.edge === 'back' ? 1 - u : 1 - Math.max(0, (u - 0.6) / 0.4);
        const s = p.size * (1 + p.grow * u);
        ctx.globalAlpha = Math.max(0, fadeIn * fadeOut) * 0.95;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(sprites![p.sprite], -s / 2, -s / 2, s, s);
        ctx.restore();
      }

      // Fine dust specks catching the light.
      ctx.fillStyle = '#fffaf0';
      for (const sp of specks) {
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        const a = sp.a * Math.max(0, 1 - t / DURATION);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Debris tumbling up through the smoke and falling back.
      for (const c of chunks) {
        const age = t - c.born;
        if (age < 0) continue;
        c.vy += H * 1.6 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.spin * dt;
        if (c.y > H + 80 && c.vy > 0) continue;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1.2) / 0.4);
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(-c.w / 2, c.h / 4, c.w, c.h / 4);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (!covered && t >= COVER_AT) {
        covered = true;
        onCover?.();
      }
      if (t < DURATION || puffs.length) requestAnimationFrame(frame);
      else {
        canvas.remove();
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}
