import { Sfx } from '../audio/sfx';
import { CONFIG, type AimMode } from '../core/config';
import { Rng } from '../core/rng';
import { Combo, mergeResult } from '../core/scoring';
import { nextSpawn } from '../core/spawn';
import { MAX_TIER, tier } from '../core/tiers';
import { TableWorld, type Body } from '../physics/world';
import { SceneView, pieceRadius, type PieceView } from '../render/scene';
import { Lighting } from '../render/lighting';
import { modelSize } from '../models';
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
  ticks: number;
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
  private lastPower = 0.75;
  private slowmo = 0; // real seconds of slow motion left
  private hitstop = 0; // real seconds the physics stays frozen on a merge impact
  private lastDust = 0;
  private wasDanger = false;
  readonly sfx = new Sfx(store.str('bm.sound', 'on') === 'off');

  constructor(
    private view: SceneView,
    private hud: Hud,
    private canvas: HTMLCanvasElement,
  ) {
    this.bindInput();
    this.hud.setMode(this.mode);
    this.hud.setSound(store.str('bm.sound', 'on') !== 'off');
    this.reset();
  }

  // ------------------------------------------------------------ lifecycle

  reset() {
    for (const p of [...this.pieces.values()]) this.destroy(p);
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
    this.slowmo = 0;
    this.nextTier = nextSpawn(this.rng, null, 0);
    this.spawnLauncher();
    this.lastLaunch = this.time - 10;
    this.hud.hideOverlay();
    this.setDanger(false);
    this.refreshHud();
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) this.sfx.slide(0);
  }

  toggleMode() {
    this.mode = this.mode === 'slide' ? 'sling' : 'slide';
    store.set('bm.mode', this.mode);
    this.hud.setMode(this.mode);
    this.sfx.tap();
  }

  toggleSound() {
    const on = store.str('bm.sound', 'on') === 'off';
    store.set('bm.sound', on ? 'on' : 'off');
    this.sfx.unlock();
    this.sfx.setMuted(!on);
    this.hud.setSound(on);
    this.sfx.tap();
  }

  /** Called every animation frame with real elapsed seconds. */
  frame(realDt: number) {
    realDt = Math.min(realDt, 0.1);
    let dt = realDt;
    if (this.slowmo > 0) {
      this.slowmo -= realDt;
      dt *= 0.3;
    }
    if (this.paused) dt = 0;
    // Hit-stop: freeze the simulation for a beat on merge impacts (visuals keep playing).
    let simDt = dt;
    if (this.hitstop > 0) {
      this.hitstop -= realDt;
      simDt = 0;
    }
    this.acc += simDt;
    while (this.acc >= DT) {
      this.fixedStep();
      this.acc -= DT;
    }
    this.syncViews(dt);
    this.view.update(dt);
    this.view.render();
    this.sfx.update();
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
    for (const [a, b] of started) {
      if (!this.tryMerge(a, b)) this.impact(a, b);
    }

    // Settling and the fail rule.
    let danger = false;
    let worst = 0;
    for (const p of this.pieces.values()) {
      const v = this.world.vel(p.b);
      const speed = Math.hypot(v.x, v.y);
      p.still = speed < CONFIG.settleSpeed ? p.still + DT : 0;
      const settled = p.still >= CONFIG.settleTime;
      const pos = this.world.pos(p.b);
      const crossing = pos.y - p.radius < CONFIG.failY && this.time - p.born > 0.6;
      if (!crossing) p.over = 0;
      else if (settled) p.over += DT;
      if (crossing && settled) danger = true;
      worst = Math.max(worst, p.over);
    }
    this.setDanger(danger);
    if (worst >= CONFIG.failHoldTime) {
      this.gameOver();
      return;
    }

    // The next piece appears a moment after each shot. A release before it
    // appears fires it the instant it does.
    if (this.launcher === null && this.time - this.lastLaunch >= CONFIG.nextBlankTime) {
      this.spawnLauncher();
      if (this.pendingLaunch) {
        this.pendingLaunch = false;
        this.launch();
      }
    }
  }

  private setDanger(on: boolean) {
    this.view.setDanger(on ? 1 : 0);
    if (on === this.wasDanger) return;
    this.wasDanger = on;
    this.hud.setDanger(on);
    this.sfx.setDanger(on);
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

  private launchSpeed(power: number) {
    return this.mode === 'slide'
      ? CONFIG.slideSpeed
      : CONFIG.slideSpeed * (CONFIG.slingMin + (CONFIG.slingMax - CONFIG.slingMin) * power);
  }

  private launch() {
    const l = this.launcher;
    if (!l || this.over) return;
    const power = this.aim?.power ?? this.lastPower;
    const speed = this.launchSpeed(power);
    this.view.removePiece(l.view);
    this.addPiece(l.tier, l.x, CONFIG.launchY, 0, speed);
    this.launcher = null;
    this.lastLaunch = this.time;
    this.launchedCount++;
    this.hud.setNext(null);
    this.sfx.launch(this.mode === 'slide' ? 0.7 : power);
  }

  private addPiece(tierId: number, x: number, y: number, vx: number, vy: number): Piece {
    const r = pieceRadius(tierId);
    x = this.clampX(x, r);
    y = Math.min(Math.max(y, r), L - r);
    const b = this.world.addPiece(x, y, r, tier(tierId).mass);
    this.world.setVel(b, vx, vy);
    const view = this.view.createPiece(tierId);
    this.view.placePiece(view, x, y);
    const p: Piece = { id: ++this.ids, tier: tierId, b, view, radius: r, born: this.time, still: 0, over: 0, dead: false };
    this.pieces.set(b.collider.handle, p);
    if (tierId > this.highestRun) this.highestRun = tierId;
    return p;
  }

  /** Removes a piece from physics; its view is removed too unless handed to an effect. */
  private destroy(p: Piece, keepView = false) {
    p.dead = true;
    this.pieces.delete(p.b.collider.handle);
    this.world.remove(p.b);
    if (!keepView) this.view.removePiece(p.view);
  }

  private tryMerge(ha: number, hb: number): boolean {
    const a = this.pieces.get(ha);
    const b = this.pieces.get(hb);
    if (!a || !b || a.dead || b.dead || a.tier !== b.tier) return false;

    const pa = this.world.pos(a.b);
    const pb = this.world.pos(b.b);
    const va = this.world.vel(a.b);
    const vb = this.world.vel(b.b);
    const mx = (pa.x + pb.x) / 2;
    const my = (pa.y + pb.y) / 2;
    this.destroy(a, true);
    this.destroy(b, true);

    const combo = this.combo.hit(this.time);
    const res = mergeResult(a.tier, combo);
    this.addScore(res.points);
    const label = `+${res.points.toLocaleString('en-US')}`;

    if (res.newTier === null) {
      this.view.converge(a.view, b.view, mx, my, () => {
        const sp = this.view.toScreen(mx, my, 0.1);
        this.hud.floatText(sp.x, sp.y, label, true);
        this.hud.showToast('Wonder Complete!', 'The skyline salutes you.', MAX_TIER);
        this.hud.flash();
        this.hud.bumpScore();
        this.view.ring(mx, my, 0.4, '#ffffff');
        this.view.fx.merge(mx, my, 4, '#ffe27a', 3);
        this.view.fx.impact(mx, my, 0.3, '#ffe27a', 3);
        this.view.shake(10);
        this.slowmo = 0.3;
        this.sfx.wonder();
      });
      return true;
    }

    const nt = res.newTier;
    const t = tier(nt);
    const n = this.addPiece(nt, mx, my, (va.x + vb.x) / 2, (va.y + vb.y) / 2);
    n.view.build = 0;
    const power = Math.min(3, nt / 6 + (combo - 1) * 0.3);
    // The twins slam together first; the payoff lands on impact.
    this.view.converge(a.view, b.view, mx, my, () => {
      const at = n.dead ? { x: mx, y: my } : this.world.pos(n.b);
      const sp = this.view.toScreen(at.x, at.y, 0.1);
      this.view.ring(at.x, at.y, n.radius * 1.1, '#ffffff');
      this.view.fx.merge(at.x, at.y, t.era, t.color, power);
      this.view.fx.impact(at.x, at.y, n.radius, t.color, power);
      this.view.shake(1.5 + Math.min(6, nt * 0.35) + (combo - 1));
      this.hitstop = 0.05 + Math.min(0.05, nt * 0.004);
      if (nt >= 13) {
        this.slowmo = 0.15;
        this.hud.flash();
      }
      this.hud.floatText(sp.x, sp.y, label, nt >= 10 || combo >= 3);
      this.hud.showCombo(combo);
      this.hud.bumpScore();
      this.sfx.merge(t.pitch, combo);
    });

    // Radial shove so merges cause little chain reactions.
    for (const o of this.pieces.values()) {
      if (o === n) continue;
      const op = this.world.pos(o.b);
      const dx = op.x - mx;
      const dy = op.y - my;
      const d = Math.hypot(dx, dy);
      const reach = n.radius + o.radius + 0.06;
      if (d > 1e-4 && d < reach) {
        const k = (CONFIG.mergeImpulse * (1 - d / reach) * Math.min(1, t.mass / tier(o.tier).mass)) / d;
        this.world.kick(o.b, dx * k, dy * k);
      }
    }

    if (nt > this.highestEver) {
      this.highestEver = nt;
      store.set('bm.highest', nt);
      if (nt > 5) {
        this.hud.showNewBuilding(nt);
        this.sfx.fanfare();
      }
    }
    this.refreshHud();
    return true;
  }

  /** Non-merging contact: dust puff and a material "thunk" scaled by impact speed. */
  private impact(ha: number, hb: number) {
    const a = this.pieces.get(ha);
    const b = this.pieces.get(hb);
    const p = a ?? b;
    if (!p) return;
    const v = this.world.vel(p.b);
    let speed = Math.hypot(v.x, v.y);
    if (a && b) {
      const vb = this.world.vel(b.b);
      speed = Math.hypot(v.x - vb.x, v.y - vb.y);
    }
    if (speed < 0.5) return;
    if (a && b) {
      const heavy = a.tier >= b.tier ? a : b;
      this.sfx.impact(tier(heavy.tier).era, speed);
      if (this.time - this.lastDust > 0.08) {
        this.lastDust = this.time;
        const pa = this.world.pos(a.b);
        const pb = this.world.pos(b.b);
        const w = a.radius / (a.radius + b.radius);
        this.view.fx.dust(pa.x + (pb.x - pa.x) * w, pa.y + (pb.y - pa.y) * w, 0.04 + Math.min(0.06, speed * 0.01));
      }
    } else {
      this.sfx.rail(speed);
    }
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
    // The scene reacts to progress: the day moves on, the background building
    // grows, and the camera eases back when tall towers stand on the table.
    this.view.setTimeOfDay(Lighting.forTier(this.highestRun));
    this.view.setSiteFloors(2 + Math.floor(this.highestRun / 2));
    const top = this.highestOnTable();
    this.view.setTallest(top ? modelSize(top).height : 0);
  }

  private gameOver() {
    this.over = true;
    this.aim = null;
    this.pendingLaunch = false;
    this.setDanger(false);
    this.view.setAim(0, 0, null);
    this.view.shake(6);
    this.sfx.gameOver();
    this.sfx.slide(0);
    this.hud.showGameOver(this.score, this.best, this.highestRun, () => {
      this.sfx.tap();
      this.reset();
    });
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
    let fastest = 0;
    for (const p of this.pieces.values()) {
      const pos = this.world.pos(p.b);
      this.view.placePiece(p.view, pos.x, pos.y); // buildings always face the player
      this.view.animatePiece(p.view, dt);
      const v = this.world.vel(p.b);
      fastest = Math.max(fastest, Math.hypot(v.x, v.y));
    }
    this.sfx.slide(this.paused || this.over ? 0 : fastest);
    const l = this.launcher;
    if (l) {
      const wobble = this.aim ? Math.sin(this.time * 18) * 0.06 : 0;
      this.view.placePiece(l.view, l.x, CONFIG.launchY, wobble);
      this.view.animatePiece(l.view, dt);
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
      end = Math.min(end, CONFIG.launchY + this.launchSpeed(this.aim.power) / CONFIG.linearDamping);
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
      this.sfx.unlock();
      if (this.over || this.aim) return;
      c.setPointerCapture(e.pointerId);
      this.aim = { pointerId: e.pointerId, startY: e.clientY, power: 0, ticks: 0 };
      this.updateAim(e);
    });
    c.addEventListener('pointermove', (e) => {
      if (this.aim?.pointerId === e.pointerId) this.updateAim(e);
    });
    const end = (e: PointerEvent, cancel: boolean) => {
      if (this.aim?.pointerId !== e.pointerId) return;
      this.updateAim(e);
      this.lastPower = this.aim.power;
      if (cancel || this.over) {
        this.aim = null;
        return;
      }
      if (this.launcher) this.launch();
      else this.pendingLaunch = true;
      this.aim = null;
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
    if (this.mode === 'sling') {
      const ticks = Math.floor(this.aim.power * 8);
      if (ticks > this.aim.ticks) this.sfx.tick(this.aim.power);
      this.aim.ticks = ticks;
    }
  }

  // ------------------------------------------------------------ test hooks

  /** Used by automated browser tests: aim at table x and launch. */
  debugShoot(x: number, power = 0.8) {
    if (this.over) return false;
    this.aimX = x;
    this.lastPower = power;
    if (this.launcher) {
      this.launcher.x = this.clampX(x, this.launcher.view.radius);
      this.launch();
    } else this.pendingLaunch = true;
    return true;
  }

  /** Test hook: drop a piece of a given tier at a table position. */
  debugPlace(tierId: number, x: number, y: number) {
    this.addPiece(tierId, x, y, 0, 0);
    this.refreshHud();
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
