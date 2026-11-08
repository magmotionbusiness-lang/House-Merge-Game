import { Sfx } from '../audio/sfx';
import { CONFIG, type AimMode } from '../core/config';
import { Rng } from '../core/rng';
import { Combo, mergeResult } from '../core/scoring';
import { nextSpawn } from '../core/spawn';
import { MAX_TIER, tier } from '../core/tiers';
import { TableWorld, type Body } from '../physics/world';
import { SceneView, pieceRadius, type PieceView } from '../render/scene';
import { modelSize } from '../models';
import { Hud } from '../ui/hud';
import { store } from './storage';
import { endlessContract, isComplete, makeContract, recordBuild, type Contract } from '../core/contracts';
import { levelCoins, starsFor, type LevelDef } from '../core/levels';
import type { TimeOfDay } from '../render/lighting';
import { onSettings, progress, settings } from './settings';
import { booster, boosterPrice, type BoosterId } from '../core/boosters';

export type PlayMode = { kind: 'endless' } | { kind: 'level'; level: LevelDef; time: TimeOfDay };

export interface EndResult {
  win: boolean;
  reason: string;
  mode: PlayMode;
  score: number;
  best: number;
  highest: number;
  stars: number;
  coins: number; // earned this round
}

export interface GameEvents {
  onEnd(r: EndResult): void;
  onMerge?(tier: number, combo: number): void;
}

const DT = 1 / 60;
/** Upgrade Stamp: skip the twins converging and start at the blueprint wireframe. */
const BUILD_CONVERGE_SKIP = 0.08;
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
  // Cached physics state (read once per step), plus the previous step for smooth rendering.
  x: number;
  y: number;
  px: number;
  py: number;
  speed: number;
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
  launcher: Launcher | null = null;
  nextTier = 1;
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
  readonly sfx = new Sfx(settings.sfxVolume);
  private playMode: PlayMode = { kind: 'endless' };
  private running = false; // false behind the title and menus
  contracts: Contract[] = [];
  shotsLeft: number | null = null;
  private shotsUsed = 0;
  bestCombo = 0;
  private coinsEarned = 0;
  private winAt = -1; // time the level-complete celebration ends
  private obstacles: Body[] = [];
  /** Booster being aimed (waiting for a tap on a building), and the piece held by the crane. */
  private targeting: BoosterId | null = null;
  /** Crane Lift drag state: the lifted building, the finger moving it, and where it would land. */
  private carry: { piece: Piece; pointer: number | null; ox: number; oy: number; x: number; y: number; ok: boolean; moved: boolean } | null = null;
  private boosterUses: Partial<Record<BoosterId, number>> = {};
  private outOfShotsAt = -1;

  constructor(
    private view: SceneView,
    readonly hud: Hud,
    private canvas: HTMLCanvasElement,
    private events: GameEvents,
  ) {
    this.bindInput();
    onSettings((st) => {
      this.mode = st.aim;
      this.sfx.setVolume(st.sfxVolume);
    });
    this.hud.setCoins(progress.coins());
    this.reset();
  }

  /** Starts a round in endless or level mode. */
  start(mode: PlayMode) {
    this.playMode = mode;
    this.reset();
    this.running = true;
    this.paused = false;
    if (mode.kind === 'level' && mode.level.hint) this.hud.showHint(mode.level.hint);
  }

  /** Back to the title: the table empties and input stops. */
  stop() {
    this.running = false;
    this.playMode = { kind: 'endless' };
    this.reset();
  }

  get isRunning() {
    return this.running && !this.over;
  }

  get currentMode() {
    return this.playMode;
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
    this.hitstop = 0;
    this.shotsUsed = 0;
    this.bestCombo = 0;
    this.coinsEarned = 0;
    this.winAt = -1;
    this.outOfShotsAt = -1;
    this.cancelBooster();
    this.boosterUses = {};
    this.refreshPrices();
    const lvl = this.playMode.kind === 'level' ? this.playMode.level : null;
    this.shotsLeft = lvl ? lvl.shots : null;
    for (const o of this.obstacles) this.world.remove(o);
    this.obstacles = (lvl?.obstacles ?? []).map(([x, y, w, h]) => this.world.addObstacle(x, y, w / 2, h / 2));
    this.view.setObstacles(lvl?.obstacles ?? []);
    for (const [t, x, y] of lvl?.start ?? []) this.addPiece(t, x, y, 0, 0);
    if (lvl) this.contracts = lvl.contracts.map((c) => makeContract(c.tier, c.count, c.reward));
    else {
      this.contracts = [endlessContract(this.rng, 3)];
      this.contracts.push(endlessContract(this.rng, 4, [this.contracts[0].tier]));
    }
    this.hud.setContracts(this.contracts);
    this.hud.setShots(this.shotsLeft);
    this.nextTier = nextSpawn(this.rng, null, this.highestOnTable(), this.spawnTable());
    this.spawnLauncher();
    this.lastLaunch = this.time - 10;
    this.setDanger(false);
    this.refreshHud();
  }

  private spawnTable() {
    return this.playMode.kind === 'level' && this.playMode.level.spawn ? this.playMode.level.spawn : undefined;
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) this.sfx.slide(0);
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
    // At most 3 physics steps per frame, so a slow frame can't snowball.
    let steps = 0;
    while (this.acc >= DT && steps < 3) {
      this.fixedStep();
      this.acc -= DT;
      steps++;
    }
    if (steps === 3) this.acc = Math.min(this.acc, DT);
    this.syncViews(dt, this.acc / DT);
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
      const pos = this.world.pos(p.b);
      p.px = p.x;
      p.py = p.y;
      p.x = pos.x;
      p.y = pos.y;
      p.speed = Math.hypot(v.x, v.y);
      const speed = p.speed;
      p.still = speed < CONFIG.settleSpeed ? p.still + DT : 0;
      const settled = p.still >= CONFIG.settleTime;
      const crossing = pos.y - p.radius < CONFIG.failY && this.time - p.born > 0.6;
      if (!crossing) p.over = 0;
      else if (settled) p.over += DT;
      if (crossing && settled) danger = true;
      worst = Math.max(worst, p.over);
    }
    this.setDanger(danger);
    if (worst >= CONFIG.failHoldTime && this.winAt < 0) {
      this.endRound(false, 'The pile crossed the site boundary');
      return;
    }

    // Level won: let the celebration play, then show the results.
    if (this.winAt >= 0 && this.time >= this.winAt) {
      this.endRound(true, 'All contracts complete');
      return;
    }

    // Out of shots: once the table settles without finishing the contracts, the level is lost.
    if (this.shotsLeft === 0 && !this.launcher && this.winAt < 0) {
      const settled = [...this.pieces.values()].every((p) => p.still >= CONFIG.settleTime);
      if (settled && this.time - this.lastLaunch > 1) {
        if (this.outOfShotsAt < 0) this.outOfShotsAt = this.time;
        if (this.time - this.outOfShotsAt > 0.6) {
          this.endRound(false, 'Out of shots');
          return;
        }
      }
    }

    // The next piece appears a moment after each shot. A release before it
    // appears fires it the instant it does.
    if (this.launcher === null && this.shotsLeft !== 0 && this.time - this.lastLaunch >= CONFIG.nextBlankTime) {
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
    this.nextTier = nextSpawn(this.rng, t, this.highestOnTable(), this.spawnTable());
    // The last shot has no "next" piece.
    this.hud.setNext(this.shotsLeft === 1 ? null : this.nextTier);
  }

  private launchSpeed(power: number) {
    return this.mode === 'slide'
      ? CONFIG.slideSpeed
      : CONFIG.slideSpeed * (CONFIG.slingMin + (CONFIG.slingMax - CONFIG.slingMin) * power);
  }

  private launch() {
    const l = this.launcher;
    if (!l || this.over || !this.running || this.shotsLeft === 0) return;
    if (this.shotsLeft !== null) {
      this.shotsLeft--;
      this.hud.setShots(this.shotsLeft);
    }
    this.shotsUsed++;
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
    const p: Piece = {
      id: ++this.ids,
      tier: tierId,
      b,
      view,
      radius: r,
      born: this.time,
      still: 0,
      over: 0,
      dead: false,
      x,
      y,
      px: x,
      py: y,
      speed: Math.hypot(vx, vy),
    };
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
    this.bestCombo = Math.max(this.bestCombo, combo);
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
    // The twins slam together first (with a rising whoosh); the payoff lands on impact.
    this.sfx.mergeRise(combo);
    this.view.converge(a.view, b.view, mx, my, () => {
      const at = n.dead ? { x: mx, y: my } : this.world.pos(n.b);
      const sp = this.view.toScreen(at.x, at.y, 0.1);
      this.view.ring(at.x, at.y, n.radius * 1.1, '#ffffff');
      this.view.fx.merge(at.x, at.y, t.era, t.color, power);
      this.view.fx.impact(at.x, at.y, n.radius, t.color, power);
      if (!settings.calm) this.view.shake(1.5 + Math.min(6, nt * 0.35) + (combo - 1));
      this.hitstop = 0.05 + Math.min(0.05, nt * 0.004);
      if (nt >= 13) {
        this.slowmo = 0.15;
        if (!settings.calm) this.hud.flash();
      }
      this.hud.floatText(sp.x, sp.y, label, nt >= 10 || combo >= 3, combo);
      this.hud.bumpScore();
      this.sfx.merge(nt, combo);
      // Escalating payoff: camera punch-in on every merge, praise words and a
      // colour burst as the chain grows.
      if (!settings.calm) this.view.punch(0.9 + Math.min(2, (combo - 1) * 0.45) + Math.min(1, nt * 0.06));
      if (combo >= 2) this.hud.praise(combo, t.color);
      if (combo >= 3) {
        this.sfx.praise(combo - 3);
        this.view.fx.merge(at.x, at.y, 3, t.color, power + 1);
        if (!settings.calm) this.hud.glow(t.color);
      }
      this.events.onMerge?.(nt, combo);
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

    this.contractBuilt(nt);

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

  /** Credits a newly built tier to the contracts; pays coins and refills (endless) or wins (level). */
  private contractBuilt(tierId: number) {
    const done = recordBuild(this.contracts, tierId);
    this.hud.setContracts(this.contracts);
    for (const c of done) {
      this.coinsEarned += c.reward;
      this.hud.setCoins(progress.addCoins(c.reward));
      this.hud.contractDone(c.id, c.reward);
      this.sfx.contract();
      if (this.playMode.kind === 'endless') {
        window.setTimeout(() => {
          if (this.playMode.kind !== 'endless' || !this.contracts.includes(c)) return;
          const next = endlessContract(
            this.rng,
            Math.max(this.highestRun, 4),
            this.contracts.map((o) => o.tier),
          );
          this.contracts[this.contracts.indexOf(c)] = next;
          this.hud.setContracts(this.contracts);
        }, 1400);
      }
    }
    if (this.playMode.kind === 'level' && this.winAt < 0 && this.contracts.every(isComplete)) this.winAt = this.time + 1.4;
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
    // The scene reacts to progress: the day moves on, and the camera eases
    // back when tall towers stand on the table.
    // Always bright daylight: playtesters found the later dusk and night tints too dark.
    this.view.setTimeOfDay('noon');
    const top = this.highestOnTable();
    this.view.setTallest(top ? modelSize(top).height : 0);
  }

  private endRound(win: boolean, reason: string) {
    this.over = true;
    this.cancelBooster();
    this.aim = null;
    this.pendingLaunch = false;
    this.setDanger(false);
    this.view.setAim(0, 0, null);
    this.sfx.slide(0);
    let stars = 0;
    if (win && this.playMode.kind === 'level') {
      const lvl = this.playMode.level;
      stars = starsFor(lvl, this.shotsUsed, this.bestCombo);
      const bonus = levelCoins(lvl, stars, 0);
      this.coinsEarned += bonus;
      this.hud.setCoins(progress.addCoins(bonus));
      progress.setStars(lvl.id, stars);
      this.sfx.levelComplete();
    } else {
      if (!settings.calm) this.view.shake(6);
      this.sfx.gameOver();
    }
    this.events.onEnd({
      win,
      reason,
      mode: this.playMode,
      score: this.score,
      best: this.best,
      highest: this.highestRun,
      stars,
      coins: this.coinsEarned,
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

  /** `alpha` blends between the last two physics steps so motion stays smooth at any frame rate. */
  private syncViews(dt: number, alpha: number) {
    let fastest = 0;
    for (const p of this.pieces.values()) {
      const x = p.px + (p.x - p.px) * alpha;
      const y = p.py + (p.y - p.py) * alpha;
      this.view.placePiece(p.view, x, y); // buildings always face the player
      this.view.animatePiece(p.view, dt);
      fastest = Math.max(fastest, p.speed);
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
      const dx = Math.abs(p.x - l.x);
      const rr = r + p.radius;
      if (dx < rr && p.y > CONFIG.launchY) end = Math.min(end, p.y - Math.sqrt(rr * rr - dx * dx));
    }
    if (this.playMode.kind === 'level')
      for (const [ox, oy, w, h] of this.playMode.level.obstacles ?? [])
        if (Math.abs(ox - l.x) < w / 2 + r) end = Math.min(end, oy - h / 2 - r);
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
      if (this.over || this.aim || !this.running || this.paused) return;
      if (this.targeting) {
        this.pickTarget(e);
        return;
      }
      c.setPointerCapture(e.pointerId);
      this.aim = { pointerId: e.pointerId, startY: e.clientY, power: 0, ticks: 0 };
      this.updateAim(e);
    });
    c.addEventListener('pointermove', (e) => {
      if (this.aim?.pointerId === e.pointerId) this.updateAim(e);
      if (this.carry?.pointer === e.pointerId) this.updateCarry(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent, cancel: boolean) => {
      if (this.carry?.pointer === e.pointerId) {
        if (cancel) this.carry.pointer = null;
        else this.releaseCarry();
        return;
      }
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

  // ------------------------------------------------------------ boosters

  /** Starts a booster: Swap applies at once; the others wait for a tap on a building. */
  useBooster(id: BoosterId): 'ok' | 'coins' | 'blocked' {
    if (!this.running || this.over || this.paused) return 'blocked';
    const def = booster(id);
    if (progress.coins() < this.price(id)) return 'coins';
    if (this.targeting === id) {
      this.cancelBooster();
      return 'ok';
    }
    this.cancelBooster();
    if (id === 'swap') {
      if (!this.launcher || this.shotsLeft === 1) return 'blocked';
      this.pay('swap');
      const l = this.launcher;
      const cur = l.tier;
      // Always change something: when both pieces are the same, swap in a
      // different building instead (one that matches something on the table if possible).
      const newCur = this.nextTier !== cur ? this.nextTier : this.differentTier(cur);
      const newNext = cur !== newCur ? cur : this.differentTier(newCur);
      this.view.removePiece(l.view);
      l.tier = newCur;
      l.view = this.view.createPiece(l.tier);
      l.view.pop = 0;
      l.x = this.clampX(l.x, l.view.radius);
      this.nextTier = newNext;
      this.hud.setNext(this.nextTier);
      this.sfx.launch(0.3);
      return 'ok';
    }
    if (!this.pieces.size) return 'blocked';
    this.targeting = id;
    this.hud.setTargeting(def.prompt, () => this.cancelBooster());
    return 'ok';
  }

  cancelBooster() {
    this.targeting = null;
    if (this.carry) this.view.endCarry(this.carry.piece.view, false);
    this.carry = null;
    this.view.setDropMarker(null);
    this.hud.setTargeting(null);
  }

  /** A spawnable tier other than `not`, preferring ones that could merge with something on the table. */
  private differentTier(not: number) {
    const cap = Math.min(5, Math.max(1, this.highestOnTable()) + 2);
    const options: number[] = [];
    for (let t = 1; t <= Math.max(cap, 2); t++) if (t !== not) options.push(t);
    const onTable = new Set([...this.pieces.values()].map((p) => p.tier));
    const useful = options.filter((t) => onTable.has(t));
    const pool = useful.length ? useful : options;
    return pool[Math.floor(this.rng.next() * pool.length)];
  }

  /** Moves the lifted building toward the finger; the drop spot snaps to the nearest free place. */
  private updateCarry(cx: number, cy: number) {
    const c = this.carry;
    if (!c) return;
    const rect = this.canvas.getBoundingClientRect();
    // Hold the building a little above the finger so it isn't hidden under it.
    const at = this.view.toTable(cx - rect.left, cy - rect.top - 46);
    if (!at) return;
    if (Math.hypot(at.x - c.ox, at.y - c.oy) > 0.03) c.moved = true;
    const p = c.piece;
    const spot = this.freeSpot(at.x, at.y, p.radius, p);
    c.ok = spot !== null;
    c.x = spot ? spot.x : this.clampX(at.x, p.radius);
    c.y = spot ? spot.y : Math.min(Math.max(at.y, p.radius), L - p.radius);
    this.view.moveCarry(p.view, c.x, c.y);
    this.view.setDropMarker(c.x, c.y, p.radius, c.ok);
  }

  /** Finger lifted while carrying: drop if it moved to a free spot, otherwise keep holding. */
  private releaseCarry() {
    const c = this.carry;
    if (!c) return;
    c.pointer = null;
    if (!c.moved) {
      this.hud.setTargeting('Drag it to a new spot, then let go', () => this.cancelBooster());
      return;
    }
    if (!c.ok) {
      this.hud.setTargeting('No room there. Drag to an open spot', () => this.cancelBooster());
      return;
    }
    const p = c.piece;
    if (p.dead) return this.cancelBooster();
    const { x, y } = c;
    this.pay('crane');
    this.world.teleport(p.b, x, y);
    p.x = p.px = x;
    p.y = p.py = y;
    p.still = 0;
    this.view.endCarry(p.view, true);
    this.carry = null;
    this.cancelBooster();
    this.view.fx.dust(x, y, p.radius * 1.4, '#ffffff', 4);
    this.sfx.rail(3);
  }

  private price(id: BoosterId) {
    return boosterPrice(id, this.boosterUses[id] ?? 0);
  }

  private refreshPrices() {
    this.hud.setBoosterPrices({
      wreck: this.price('wreck'),
      swap: this.price('swap'),
      upgrade: this.price('upgrade'),
      crane: this.price('crane'),
    });
  }

  /** Charges the current price and raises the next one. */
  private pay(id: BoosterId) {
    this.hud.setCoins(progress.addCoins(-this.price(id)));
    this.boosterUses[id] = (this.boosterUses[id] ?? 0) + 1;
    this.refreshPrices();
    this.sfx.contract();
  }

  /**
   * Nearest spot to (x, y) where a piece of radius r fits without overlapping
   * other buildings or scaffolds, so the Crane never drops a building on top of
   * another (which made the physics fling pieces apart).
   */
  private freeSpot(x: number, y: number, r: number, ignore: Piece): { x: number; y: number } | null {
    const minY = CONFIG.failY + r + 0.06;
    const obstacles = this.playMode.kind === 'level' ? (this.playMode.level.obstacles ?? []) : [];
    const fits = (px: number, py: number) => {
      if (Math.abs(px) > W / 2 - r - 0.004 || py < minY || py > L - r) return false;
      for (const p of this.pieces.values()) if (p !== ignore && Math.hypot(p.x - px, p.y - py) < p.radius + r + 0.006) return false;
      for (const [ox, oy, w, h] of obstacles) {
        const dx = Math.max(Math.abs(px - ox) - w / 2, 0);
        const dy = Math.max(Math.abs(py - oy) - h / 2, 0);
        if (Math.hypot(dx, dy) < r + 0.004) return false;
      }
      return true;
    };
    x = this.clampX(x, r);
    y = Math.min(Math.max(y, minY), L - r);
    if (fits(x, y)) return { x, y };
    for (let d = 0.02; d < 0.9; d += 0.02)
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d;
        if (fits(px, py)) return { x: px, y: py };
      }
    return null;
  }

  private pickTarget(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const at = this.view.toTable(e.clientX - rect.left, e.clientY - rect.top);
    if (!at) return;
    const id = this.targeting!;
    // Crane: while a building is lifted, touching the table grabs it again and drags it.
    if (id === 'crane' && this.carry) {
      this.carry.pointer = e.pointerId;
      this.canvas.setPointerCapture(e.pointerId);
      this.updateCarry(e.clientX, e.clientY);
      return;
    }
    // Pick the building under the tap (closest centre within its footprint, with a little slack).
    let hit: Piece | null = null;
    let best = Infinity;
    for (const p of this.pieces.values()) {
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d < p.radius + 0.04 && d < best) {
        best = d;
        hit = p;
      }
    }
    if (!hit) return;
    if (id === 'wreck') {
      this.pay('wreck');
      this.cancelBooster();
      this.destroy(hit);
      this.view.fx.merge(hit.x, hit.y, 1, tier(hit.tier).color, 2);
      this.view.fx.dust(hit.x, hit.y, hit.radius * 2, '#e8d9c4', 6);
      if (!settings.calm) this.view.shake(6);
      this.sfx.rail(5);
      this.sfx.impact(1, 5);
      this.refreshHud();
    } else if (id === 'upgrade') {
      if (hit.tier >= MAX_TIER) return;
      this.pay('upgrade');
      this.cancelBooster();
      const { x, y, tier: t0 } = hit;
      this.destroy(hit);
      const n = this.addPiece(t0 + 1, x, y, 0, 0);
      n.view.build = BUILD_CONVERGE_SKIP;
      this.view.fx.impact(x, y, n.radius, tier(t0 + 1).color, 1.5);
      this.sfx.merge(t0 + 1, 1);
      this.contractBuilt(t0 + 1);
      this.refreshHud();
    } else if (id === 'crane') {
      // Lift it: it follows the finger, with a footprint marker showing where it will land.
      this.carry = { piece: hit, pointer: e.pointerId, ox: hit.x, oy: hit.y, x: hit.x, y: hit.y, ok: true, moved: false };
      this.canvas.setPointerCapture(e.pointerId);
      this.view.startCarry(hit.view, hit.x, hit.y);
      this.view.setDropMarker(hit.x, hit.y, hit.radius, true);
      this.hud.setTargeting('Drag it where you want, then let go', () => this.cancelBooster());
      this.sfx.tick(0.5);
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
