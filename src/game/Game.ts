import { CONFIG, type AimMode } from '../core/config';
import { Rng } from '../core/rng';
import { Combo, mergeResult } from '../core/scoring';
import { nextSpawn } from '../core/spawn';
import { MAX_TIER, tier } from '../core/tiers';
import { TableWorld, type Body } from '../physics/world';
import { SceneView, pieceRadius, type PieceView } from '../render/scene';
import { Hud } from '../ui/hud';
import { store } from './storage';

const DT = 1 / 60;
const W = CONFIG.tableWidth;
const L = CONFIG.tableLength;

interface Piece {
  id: number;
  tier: number;
  b: Body;
  view: PieceView;
  radius: number;
  born: number;
  still: number;
  over: number;
  dead: boolean;
}

interface Launcher {
  tier: number;
  view: PieceView;
  x: number;
}

interface Aim {
  pointerId: number;
  startY: number;
  power: number;
}

export class Game {
  private world = new TableWorld();
  private pieces = new Map<number, Piece>(); // collider handle -> piece
  private rng = new Rng(Date.now());
  private combo = new Combo();
  private launcher: Launcher | null = null;
  private nextTier = 1;
  private aim: Aim | null = null;
  private pendingLaunch = false;
  private lastLaunch = -10;
  private launchedCount = 0;
  private time = 0;
  private acc = 0;
  private score = 0;
  private best = store.num('bm.best', 0);
  private highestEver = store.num('bm.highest', 0);
  private highestRun = 0;
  private mode: AimMode = store.str('bm.mode', 'slide') === 'sling' ? 'sling' : 'slide';
  private over = false;
  private paused = false;
  private ids = 0;
  private aimX = 0;

  constructor(
    private view: SceneView,
    private hud: Hud,
    private canvas: HTMLCanvasElement,
  ) {
    this.bindInput();
    this.hud.setMode(this.mode);
    this.reset();
  }

  // ------------------------------------------------------------ lifecycle

  reset() {
    for (const p of this.pieces.values()) this.destroy(p);
    this.pieces.clear();
    if (this.launcher) this.view.removePiece(this.launcher.view);
    this.launcher = null;
    this.rng = new Rng(Date.now());
    this.combo.reset();
    this.score = 0;
    this.highestRun = 0;
    this.over = false;
    this.pendingLaunch = false;
    this.aim = null;
    this.launchedCount = 0;
    this.nextTier = nextSpawn(this.rng, null, 0);
    this.spawnLauncher();
    this.lastLaunch = this.time - 10;
    this.hud.hideOverlay();
    this.hud.setDanger(false);
    this.refreshHud();
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  toggleMode() {
    this.mode = this.mode === 'slide' ? 'sling' : 'slide';
    store.set('bm.mode', this.mode);
    this.hud.setMode(this.mode);
  }

  /** Called every animation frame with real elapsed seconds. */
  frame(dt: number) {
    dt = Math.min(dt, 0.1);
    if (!this.paused) {
      this.acc += dt;
      while (this.acc >= DT) {
        this.fixedStep();
        this.acc -= DT;
      }
    }
    this.syncViews(this.paused ? 0 : dt);
    this.view.update(this.paused ? 0 : dt);
    this.view.render();
  }

  // ------------------------------------------------------------ simulation

  private fixedStep() {
    this.time += DT;
    this.combo.update(this.time);
    if (this.over) {
      this.world.step();
      return;
    }

    const started = this.world.step();
    for (const [a, b] of started) this.tryMerge(a, b);

    // Settling and the fail rule.
    let allSettled = true;
    let danger = false;
    let worst = 0;
    for (const p of this.pieces.values()) {
      const v = this.world.vel(p.b);
      const speed = Math.hypot(v.x, v.y);
      p.still = speed < CONFIG.settleSpeed ? p.still + DT : 0;
      const settled = p.still >= CONFIG.settleTime;
      if (!settled) allSettled = false;
      const pos = this.world.pos(p.b);
      const crossing = pos.y - p.radius < CONFIG.failY && this.time - p.born > 0.6;
      if (!crossing) p.over = 0;
      else if (settled) p.over += DT;
      if (crossing && settled) danger = true;
      worst = Math.max(worst, p.over);
    }
    this.view.setDanger(danger ? 1 : 0);
    this.hud.setDanger(danger);
    if (worst >= CONFIG.failHoldTime) {
      this.gameOver();
      return;
    }

    // Unlock the launcher once the table settles (or after a timeout).
    if (this.launcher === null && this.time - this.lastLaunch >= CONFIG.nextBlankTime) {
      this.spawnLauncher();
    }
    const since = this.time - this.lastLaunch;
    if (this.pendingLaunch && this.launcher && (allSettled || since >= CONFIG.unlockTimeout)) {
      this.pendingLaunch = false;
      this.launch();
    }
  }

  private canLaunchNow() {
    const since = this.time - this.lastLaunch;
    if (!this.launcher) return false;
    if (since >= CONFIG.unlockTimeout) return true;
    for (const p of this.pieces.values()) if (p.still < CONFIG.settleTime) return false;
    return true;
  }

  private spawnLauncher() {
    const t = this.nextTier;
    const v = this.view.createPiece(t);
    v.pop = 0;
    const r = pieceRadius(t);
    this.launcher = { tier: t, view: v, x: this.clampX(this.aimX, r) };
    this.nextTier = nextSpawn(this.rng, t, this.highestOnTable());
    this.hud.setNext(this.nextTier);
  }

  private launch() {
    const l = this.launcher;
    if (!l || this.over) return;
    const speed =
      this.mode === 'slide'
        ? CONFIG.slideSpeed
        : CONFIG.slideSpeed * (CONFIG.slingMin + (CONFIG.slingMax - CONFIG.slingMin) * (this.aim?.power ?? this.lastPower));
    this.view.removePiece(l.view);
    const p = this.addPiece(l.tier, l.x, CONFIG.launchY, 0, speed);
    p.view.pop = -1;
    this.launcher = null;
    this.lastLaunch = this.time;
    this.launchedCount++;
    this.hud.setNext(null);
  }
  private lastPower = 0.75;

  private addPiece(tierId: number, x: number, y: number, vx: number, vy: number): Piece {
    const r = pieceRadius(tierId);
    x = this.clampX(x, r);
    y = Math.min(Math.max(y, r), L - r);
    const b = this.world.addPiece(x, y, r, tier(tierId).mass);
    this.world.setVel(b, vx, vy);
    const view = this.view.createPiece(tierId);
    const p: Piece = { id: ++this.ids, tier: tierId, b, view, radius: r, born: this.time, still: 0, over: 0, dead: false };
    this.pieces.set(b.collider.handle, p);
    if (tierId > this.highestRun) this.highestRun = tierId;
    return p;
  }

  private destroy(p: Piece) {
    p.dead = true;
    this.pieces.delete(p.b.collider.handle);
    this.world.remove(p.b);
    this.view.removePiece(p.view);
  }

  private tryMerge(ha: number, hb: number) {
    const a = this.pieces.get(ha);
    const b = this.pieces.get(hb);
    if (!a || !b || a.dead || b.dead || a.tier !== b.tier) return;

    const pa = this.world.pos(a.b);
    const pb = this.world.pos(b.b);
    const va = this.world.vel(a.b);
    const vb = this.world.vel(b.b);
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    this.destroy(a);
    this.destroy(b);

    const combo = this.combo.hit(this.time);
    const res = mergeResult(a.tier, combo);
    this.addScore(res.points);
    const sp = this.view.toScreen(mx, my, 0.1);

    if (res.newTier === null) {
      this.hud.floatText(sp.x, sp.y, `+${res.points.toLocaleString('en-US')}`, true);
      this.hud.showToast('Wonder Complete!', 'The skyline salutes you.', MAX_TIER);
      this.view.ring(mx, my, 0.4, '#ffffff');
      this.view.burst(mx, my, '#ffe27a', 40, 1.4);
      this.view.shake(10);
      return;
    }

    const nt = res.newTier;
    const n = this.addPiece(nt, mx, my, (va.x + vb.x) / 2, (va.y + vb.y) / 2);
    n.view.pop = 0;
    n.view.flash = 0.16;
    const t = tier(nt);
    this.view.ring(mx, my, n.radius * 1.1, '#ffffff');
    this.view.burst(mx, my, tier(a.tier).color, 8 + Math.min(nt, 12), 0.5 + nt * 0.03);
    if (nt >= 10) this.view.shake(2 + Math.min(4, nt - 10));
    this.hud.floatText(sp.x, sp.y, `+${res.points.toLocaleString('en-US')}`, nt >= 10);
    this.hud.showCombo(combo);

    // Radial shove so merges cause little chain reactions.
    for (const o of this.pieces.values()) {
      if (o === n) continue;
      const op = this.world.pos(o.b);
      const dx = op.x - mx;
      const dy = op.y - my;
      const d = Math.hypot(dx, dy);
      const reach = n.radius + o.radius + 0.06;
      if (d > 1e-4 && d < reach) {
        const k = (CONFIG.mergeImpulse * (1 - d / reach) * Math.min(1, tier(nt).mass / tier(o.tier).mass)) / d;
        this.world.kick(o.b, dx * k, dy * k);
      }
    }

    if (nt > this.highestEver) {
      this.highestEver = nt;
      store.set('bm.highest', nt);
      if (nt > 5) this.hud.showToast('New Building!', t.name, nt);
    }
    this.refreshHud();
  }

  private addScore(p: number) {
    this.score += p;
    if (this.score > this.best) {
      this.best = this.score;
      store.set('bm.best', this.best);
    }
    this.refreshHud();
  }

  private refreshHud() {
    this.hud.setScore(this.score, this.best);
    this.hud.setProgress(Math.max(5, this.highestEver), this.highestRun);
  }

  private gameOver() {
    this.over = true;
    this.aim = null;
    this.pendingLaunch = false;
    this.view.setAim(0, 0, null);
    this.view.shake(6);
    this.hud.showGameOver(this.score, this.best, this.highestRun, () => this.reset());
  }

  private highestOnTable() {
    let h = 0;
    for (const p of this.pieces.values()) h = Math.max(h, p.tier);
    return h;
  }

  private clampX(x: number, r: number) {
    return Math.min(Math.max(x, -W / 2 + r + 0.004), W / 2 - r - 0.004);
  }

  // ------------------------------------------------------------ rendering sync

  private syncViews(dt: number) {
    for (const p of this.pieces.values()) {
      const pos = this.world.pos(p.b);
      this.view.placePiece(p.view, pos.x, pos.y);
      this.view.animatePiece(p.view, dt);
    }
    const l = this.launcher;
    if (l) {
      const wobble = this.aim ? Math.sin(this.time * 18) * 0.06 : 0;
      this.view.placePiece(l.view, l.x, CONFIG.launchY, wobble);
      this.view.animatePiece(l.view, dt);
      const locked = !this.canLaunchNow();
      l.view.side.opacity = locked ? 0.55 : 1;
      if (l.view.side.transparent !== locked) {
        l.view.side.transparent = locked;
        l.view.side.needsUpdate = true;
      }
      this.view.setAim(l.x, CONFIG.launchY + l.view.radius, this.aimEnd(l));
    } else {
      this.view.setAim(0, 0, null);
    }
  }

  /** Where the aim line stops: the first piece in the straight path, the back rail, or the sling's reach. */
  private aimEnd(l: Launcher): number | null {
    if (this.over) return null;
    const r = l.view.radius;
    let end = L - r;
    if (this.mode === 'sling') {
      if (!this.aim) return null;
      const v = CONFIG.slideSpeed * (CONFIG.slingMin + (CONFIG.slingMax - CONFIG.slingMin) * this.aim.power);
      end = Math.min(end, CONFIG.launchY + v / CONFIG.linearDamping);
    }
    for (const p of this.pieces.values()) {
      const pos = this.world.pos(p.b);
      const dx = Math.abs(pos.x - l.x);
      const rr = r + p.radius;
      if (dx < rr && pos.y > CONFIG.launchY) end = Math.min(end, pos.y - Math.sqrt(rr * rr - dx * dx));
    }
    return Math.max(CONFIG.launchY + r, end) - r;
  }

  // ------------------------------------------------------------ input

  private screenToAimX(clientX: number) {
    const rect = this.canvas.getBoundingClientRect();
    const a = this.view.toScreen(-W / 2, CONFIG.launchY);
    const b = this.view.toScreen(W / 2, CONFIG.launchY);
    const u = (clientX - rect.left - a.x) / (b.x - a.x);
    return -W / 2 + u * W;
  }

  private bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (this.over || this.aim) return;
      c.setPointerCapture(e.pointerId);
      this.aim = { pointerId: e.pointerId, startY: e.clientY, power: 0 };
      this.updateAim(e);
    });
    c.addEventListener('pointermove', (e) => {
      if (this.aim?.pointerId === e.pointerId) this.updateAim(e);
    });
    const end = (e: PointerEvent, cancel: boolean) => {
      if (this.aim?.pointerId !== e.pointerId) return;
      this.updateAim(e);
      this.lastPower = this.aim.power;
      this.aim = null;
      if (cancel || this.over) return;
      if (this.canLaunchNow()) this.launch();
      else this.pendingLaunch = true;
    };
    c.addEventListener('pointerup', (e) => end(e, false));
    c.addEventListener('pointercancel', (e) => end(e, true));
  }

  private updateAim(e: PointerEvent) {
    if (!this.aim) return;
    this.aimX = this.screenToAimX(e.clientX);
    if (this.launcher) this.launcher.x = this.clampX(this.aimX, this.launcher.view.radius);
    const pull = (e.clientY - this.aim.startY) / (window.innerHeight * CONFIG.slingPullPx);
    this.aim.power = Math.min(1, Math.max(0, pull));
  }

  // ------------------------------------------------------------ test hooks

  /** Used by automated browser tests: aim at table x and launch. */
  debugShoot(x: number, power = 0.8) {
    if (!this.launcher || this.over) return false;
    this.aimX = x;
    this.launcher.x = this.clampX(x, this.launcher.view.radius);
    this.lastPower = power;
    if (this.canLaunchNow()) this.launch();
    else this.pendingLaunch = true;
    return true;
  }

  debugState() {
    return {
      pieces: [...this.pieces.values()].map((p) => ({ tier: p.tier, ...this.world.pos(p.b) })),
      score: this.score,
      over: this.over,
      launched: this.launchedCount,
      launcher: this.launcher?.tier ?? null,
      next: this.nextTier,
    };
  }
}
