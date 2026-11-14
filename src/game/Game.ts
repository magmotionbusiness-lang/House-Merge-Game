import { Sfx } from '../audio/sfx';
import { CONFIG, type AimMode } from '../core/config';
import { Rng } from '../core/rng';
import { Combo, mergeResult } from '../core/scoring';
import { nextSpawn } from '../core/spawn';
import { MAX_TIER, tier } from '../core/tiers';
import { TableWorld, predictShot, type Body, type ShotPath } from '../physics/world';
import { SceneView, pieceRadius, type PieceView } from '../render/scene';
import { modelSize } from '../models';
import { Hud } from '../ui/hud';
import { store } from './storage';
import { endlessContract, isComplete, makeContract, recordBuild, type Contract } from '../core/contracts';
import { levelCoins, starsFor, type LevelDef } from '../core/levels';
import type { TimeOfDay } from '../render/lighting';
import { onSettings, progress, settings } from './settings';
import { booster, boosterPrice, type BoosterId } from '../core/boosters';
import { heatFor, heatProgress } from '../core/heat';
import { heatGlow, isThemeId, nextTheme, setTheme, THEME_MAX_TIME, THEME_MIN_TIME, THEME_ORDER, themeForDistrict, THEMES, tierName, type ThemeId } from '../core/themes';
import { prepareBackdrop, showBackdrop } from '../render/backdrops';
import { haptics } from '../native/haptics';
import { modelTemplate, wireframe } from '../models';

export type PlayMode =
  | { kind: 'endless' }
  | { kind: 'level'; level: LevelDef; time: TimeOfDay }
  | { kind: 'daily'; day: string; seed: number };

export interface EndResult {
  win: boolean;
  reason: string;
  mode: PlayMode;
  score: number;
  best: number;
  highest: number;
  stars: number;
  coins: number; // earned this round
  built: number[]; // tiers built this round (for the Daily share grid)
  bestBefore: number; // record when the run began (for "so close" messages)
}

/** A saved Endless run, so leaving the app never loses a board (Continue on the title). */
export interface RunSave {
  v: 1;
  score: number;
  highestRun: number;
  pieces: [tier: number, x: number, y: number][];
  launcher: number | null;
  next: number;
  after: number;
  contracts: { tier: number; count: number; done: number; reward: number }[];
  streak: number;
  rng: number;
  bestAtStart: number;
  built: number[];
  uses: Partial<Record<BoosterId, number>>;
  launched: number;
  theme?: ThemeId;
  themeTime?: number;
}

const RUN_KEY = 'bm.run';

export function savedRun(): RunSave | null {
  try {
    const r = JSON.parse(store.str(RUN_KEY, 'null')) as RunSave | null;
    return r && r.v === 1 && r.pieces ? r : null;
  } catch {
    return null;
  }
}

export interface GameEvents {
  /** A new map theme arrived mid-run (not on quiet restores). */
  onTheme?(id: ThemeId): void;
  onEnd(r: EndResult): void;
  onMerge?(tier: number, combo: number): void;
  onTension?(k: number): void;
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
  /** Time it was created by a merge (for chain reactions), or -1. */
  mergedAt: number;
  /** Bounced off a rail since launch (for bank shots). */
  railHit: boolean;
  /** Launched by the player (rather than built or pre-placed). */
  shot: boolean;
  /** Built for a contract: it's about to be lifted off the board, so it no longer merges. */
  delivering: boolean;
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
  /** The piece after NEXT: three pieces are always visible, like Block Blast's tray. */
  afterTier = 1;
  /** The last piece the player shot: the next one loads once it has landed. */
  private lastShot: Piece | null = null;
  // Streak: consecutive shots that each caused at least one merge multiply the score.
  streak = 0;
  /** Heat level (0-5): the run gets flashier as the score climbs. */
  heat = 0;
  private mergesSinceShot = 0;
  private bestBeaten = false;
  private runsPlayed = store.num('bm.runs', 0);
  private aim: Aim | null = null;
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
  /** The record when this run began: the HUD counts down to it. */
  private bestAtStart = 0;
  private coinsEarned = 0;
  private winAt = -1; // time the level-complete celebration ends
  private obstacles: Body[] = [];
  private builtThisRun = new Set<number>();
  /** Booster being aimed (waiting for a tap on a building), and the piece held by the crane. */
  private targeting: BoosterId | null = null;
  /** Crane Lift drag state: the lifted building, the finger moving it, and where it would land. */
  private carry: { piece: Piece; pointer: number | null; ox: number; oy: number; x: number; y: number; ok: boolean; moved: boolean } | null = null;
  private boosterUses: Partial<Record<BoosterId, number>> = {};
  private outOfShotsAt = -1;
  // Map themes: how long the run has been in this one (seconds of play) and next theme's warm-up queue.
  private themeId: ThemeId = 'site';
  private themeTime = 0;
  private themePrep: (() => void)[] = [];
  // Rewarded-ad state for this round: one continue, one free booster, coins doubled so far.
  private endReason = '';
  private endWin = false;
  private revived = false;
  private freeBooster: BoosterId | null = null;
  private adBoosterUsed = false;
  private coinsDoubled = 0;
  /** Level-clear celebration in progress (shout, bonus fireworks, finale). */
  private celebration: { t: number; phase: 'shout' | 'bonus' | 'finale'; left: number; next: number; fired: number; inFlight: number; endAt: number } | null = null;

  constructor(
    private view: SceneView,
    readonly hud: Hud,
    private canvas: HTMLCanvasElement,
    private events: GameEvents,
  ) {
    this.bindInput();
    this.hud.onGlow = (c) => {
      if (!settings.calm) this.view.edgePulse(this.themePulse(c), 2);
    };
    onSettings((st) => {
      this.mode = st.aim;
      this.sfx.setVolume(st.sfxVolume);
    });
    this.hud.setCoins(progress.coins());
    this.reset();
  }

  /** Starts a round in endless or level mode. */
  start(mode: PlayMode) {
    if (mode.kind === 'endless') this.clearSavedRun();
    this.playMode = mode;
    this.reset();
    this.running = true;
    this.paused = false;
    if (mode.kind === 'level' && mode.level.hint) this.hud.showHint(mode.level.hint);
  }

  /** Saves the current Endless run (after every shot and when the app is hidden). */
  saveRun() {
    if (this.playMode.kind !== 'endless' || !this.running || this.over) return;
    const save: RunSave = {
      v: 1,
      score: this.score,
      highestRun: this.highestRun,
      pieces: [...this.pieces.values()].map((p) => [p.tier, +p.x.toFixed(4), +p.y.toFixed(4)]),
      launcher: this.launcher?.tier ?? null,
      next: this.nextTier,
      after: this.afterTier,
      contracts: this.contracts.map((c) => ({ tier: c.tier, count: c.count, done: c.done, reward: c.reward })),
      streak: this.streak,
      rng: this.rng.state,
      bestAtStart: this.bestAtStart,
      built: [...this.builtThisRun],
      uses: this.boosterUses,
      launched: this.launchedCount,
      theme: this.themeId,
      themeTime: Math.round(this.themeTime),
    };
    store.set(RUN_KEY, JSON.stringify(save));
  }

  clearSavedRun() {
    store.set(RUN_KEY, 'null');
  }

  /** Continues a saved Endless run exactly where it was left. */
  resumeRun(r: RunSave) {
    this.start({ kind: 'endless' });
    for (const p of [...this.pieces.values()]) this.destroy(p);
    for (const [t, x, y] of r.pieces) this.addPiece(t, x, y, 0, 0);
    if (this.launcher) this.view.removePiece(this.launcher.view);
    this.launcher = null;
    this.nextTier = r.launcher ?? r.next;
    this.afterTier = r.launcher === null ? r.after : r.next;
    this.spawnLauncher();
    this.afterTier = r.after;
    this.showQueue();
    this.contracts = r.contracts.map((c) => {
      const k = makeContract(c.tier, c.count, c.reward);
      k.done = c.done;
      return k;
    });
    this.hud.setContracts(this.contracts);
    this.score = r.score;
    this.highestRun = Math.max(this.highestRun, r.highestRun);
    this.streak = r.streak;
    this.hud.setStreak(this.streak);
    this.rng.state = r.rng;
    this.bestAtStart = r.bestAtStart;
    this.builtThisRun = new Set(r.built);
    this.boosterUses = r.uses ?? {};
    this.refreshPrices();
    this.launchedCount = r.launched;
    if (isThemeId(r.theme)) this.switchTheme(r.theme, true);
    this.themeTime = r.themeTime ?? 0;
    this.heatUp(heatFor(this.score), true);
    this.hud.setHeat(this.heat, heatProgress(this.score));
    this.refreshHud();
  }

  /** Back to the title: the table empties and input stops. */
  stop() {
    // Leaving a Daily Blueprint mid-run keeps the score so far (one attempt per day).
    if (this.playMode.kind === 'daily' && this.running && !this.over) this.recordDaily();
    this.saveRun();
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
    this.switchTheme(this.startTheme(), true);
    this.themeTime = 0;
    this.themePrep = [];
    this.revived = false;
    this.freeBooster = null;
    this.adBoosterUsed = false;
    this.coinsDoubled = 0;
    this.celebration = null;
    this.hud.clearCelebration();
    // The Daily Blueprint deals the same sequence to everyone that day.
    this.rng = new Rng(this.playMode.kind === 'daily' ? this.playMode.seed : Date.now());
    this.builtThisRun = new Set();
    this.combo.reset();
    this.score = 0;
    this.highestRun = 0;
    this.over = false;
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
    this.nextTier = this.draw(null);
    this.afterTier = this.draw(this.nextTier);
    this.streak = 0;
    this.mergesSinceShot = 0;
    this.bestBeaten = false;
    this.bestAtStart = this.best;
    this.heat = 0;
    this.view.setHeat(0);
    this.hud.setHeat(0, 0);
    this.view.setFever(false);
    this.lastShot = null;
    this.hud.setStreak(0);
    this.spawnLauncher();
    this.lastLaunch = this.time - 10;
    this.setDanger(false);
    this.refreshHud();
  }

  private spawnTable() {
    return this.playMode.kind === 'level' && this.playMode.level.spawn ? this.playMode.level.spawn : undefined;
  }

  get isPaused() {
    return this.paused;
  }

  /** Rounds finished on this device (the ad rules keep the first ones ad-free). */
  get roundsFinished() {
    return this.runsPlayed;
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
    // Build the next theme's models a few per frame ahead of the switch (never a hitch).
    for (let i = 0; i < 2 && this.themePrep.length; i++) this.themePrep.shift()!();
    this.syncViews(dt, this.acc / DT);
    this.view.update(dt);
    this.view.render();
    this.sfx.update();
  }

  // ------------------------------------------------------------ simulation

  private fixedStep() {
    this.time += DT;
    this.combo.update(this.time);
    if (this.running && !this.over && this.playMode.kind !== 'level') this.tickTheme();
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
    // Tension rises smoothly as the pile approaches the line (checked a few times a second).
    if (Math.round(this.time * 60) % 10 === 0) {
      this.tensionK = this.pressure();
      this.events.onTension?.(this.running && !this.over ? this.tensionK : 0);
    }
    if (worst >= CONFIG.failHoldTime && this.winAt < 0) {
      this.endRound(false, 'The pile crossed the site boundary');
      return;
    }

    // Level won: the celebration plays (shout, bonus fireworks, finale), then the results.
    if (this.celebration) {
      this.tickCelebration(DT);
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

    // The next piece loads once the last shot has landed (slowed down or hit
    // something), at least 0.45 s and at most 1 s after the shot. This stops
    // machine-gunning the pile while keeping the rhythm brisk.
    if (this.launcher === null && this.shotsLeft !== 0 && this.reloadReady()) {
      this.resolveShot();
      this.spawnLauncher();
    }
  }

  private reloadReady() {
    const since = this.time - this.lastLaunch;
    if (since < CONFIG.reloadMin) return false;
    if (since >= CONFIG.reloadMax) return true;
    const s = this.lastShot;
    return !s || s.dead || s.speed < CONFIG.reloadSpeed;
  }

  /** A shot has played out: it extends the streak if it caused a merge, otherwise breaks it. */
  private resolveShot() {
    if (this.launchedCount === 0 || !this.lastShot) return;
    if (this.mergesSinceShot > 0) {
      this.streak++;
      if (this.streak >= 2) this.sfx.streak(this.streak);
    } else if (this.streak > 0) {
      if (this.streak >= 2) this.hud.streakLost(this.streak);
      this.streak = 0;
    }
    this.mergesSinceShot = 0;
    this.lastShot = null;
    this.hud.setStreak(this.streak);
    // Fever: a hot streak sets the board's stroke ablaze until it breaks.
    this.view.setFever(this.streak >= 4 && !settings.calm);
    // A hot streak is peak hype: the moment to roll into a new map.
    if (this.streak >= 4) this.bigMoment();
    this.saveRun();
  }

  /** Score multiplier from the shot streak: x1, x1.25, x1.5 ... up to x3.5. */
  private streakMult() {
    return 1 + Math.min(this.streak, 10) * 0.25;
  }

  /**
   * Draws the next piece. Only helpful "recipes" exist: in Endless, new
   * players and crowded boards get a better chance of a piece that matches
   * one near the front. Spawns are never rigged to cause a loss.
   */
  private draw(prev: number | null): number {
    const table = this.spawnTable();
    if (this.playMode.kind === 'endless' && this.pieces.size) {
      let chance = 0.1;
      if (this.runsPlayed < 3) chance += 0.25;
      if (this.pressure() > 0.5) chance += 0.2;
      if (this.rng.next() < chance) {
        const cap = Math.min(5, Math.max(1, this.highestOnTable()) + 2);
        let best: Piece | null = null;
        for (const p of this.pieces.values()) if (p.tier <= cap && (!best || p.y < best.y)) best = p;
        if (best) return best.tier;
      }
    }
    return nextSpawn(this.rng, prev, this.highestOnTable(), table);
  }

  /** 0 when the pile is far from the boundary, 1 when it touches it. */
  private pressure() {
    let k = 0;
    for (const p of this.pieces.values()) {
      if (this.time - p.born < 0.6) continue;
      const gap = p.y - p.radius - CONFIG.failY;
      k = Math.max(k, Math.min(1, Math.max(0, 1 - gap / 0.35)));
    }
    return k;
  }

  private tensionK = 0;

  private setDanger(on: boolean) {
    this.view.setDanger(Math.max(on ? 1 : 0, this.tensionK * 0.55));
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
    this.nextTier = this.afterTier;
    this.afterTier = this.draw(this.nextTier);
    this.showQueue();
    this.sfx.reload();
  }

  /** NEXT and the piece after it (the last shots of a level show fewer). */
  private showQueue() {
    const left = this.shotsLeft;
    this.hud.setNext(left === 1 ? null : this.nextTier, left !== null && left <= 2 ? null : this.afterTier);
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
    const shot = this.addPiece(l.tier, l.x, CONFIG.launchY, 0, speed);
    shot.shot = true;
    this.lastShot = shot;
    this.launcher = null;
    this.lastLaunch = this.time;
    this.launchedCount++;
    this.sfx.launch(this.mode === 'slide' ? 0.7 : power);
    haptics.light();
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
      mergedAt: -1,
      railHit: false,
      shot: false,
      delivering: false,
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
    if (!a || !b || a.dead || b.dead || a.tier !== b.tier || a.delivering || b.delivering) return false;

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
    this.mergesSinceShot++;
    // Skill moments the player can take credit for.
    const chain = (a.mergedAt >= 0 && this.time - a.mergedAt < 0.8) || (b.mergedAt >= 0 && this.time - b.mergedAt < 0.8);
    const bank = (a.shot && a.railHit) || (b.shot && b.railHit);
    const res = mergeResult(a.tier, combo);
    const points = Math.round(res.points * this.streakMult() * (chain ? 1.5 : 1) * (bank ? 1.25 : 1));
    this.addScore(points);
    const label = `+${points.toLocaleString('en-US')}`;

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
    n.mergedAt = this.time;
    const power = Math.min(4.5, nt / 6 + (combo - 1) * 0.3 + this.heat * 0.35);
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
      this.sfx.merge(nt, combo, this.heat);
      haptics.merge(nt, combo);
      // Escalating payoff: camera punch-in on every merge, praise words and a
      // colour burst as the chain grows.
      if (!settings.calm) this.view.punch(0.9 + Math.min(2, (combo - 1) * 0.45) + Math.min(1, nt * 0.06) + this.heat * 0.15);
      // Higher heat: every merge throws an extra ring of coloured sparks.
      if (this.heat >= 2)
        for (let i = 0; i < 6 + this.heat * 4; i++) {
          const a = (i / (6 + this.heat * 4)) * Math.PI * 2;
          const sp = 0.5 + Math.random() * 0.4;
          this.view.fx.spark(at.x, at.y, 0.04, this.view.heatColor(), 0.6, Math.cos(a) * sp, Math.sin(a) * sp, 0.3 + Math.random() * 0.4);
        }
      if (chain) this.hud.praise(combo, t.color, 'Chain reaction!');
      else if (bank) this.hud.praise(combo, t.color, 'Bank shot!');
      else if (combo >= 2) this.hud.praise(combo, t.color);
      if (chain || bank) this.sfx.praise(Math.max(0, combo - 2));
      // Clearing the site (one building left) is the big jackpot, like a full board clear.
      if (this.playMode.kind !== 'level' && this.launchedCount > 6 && this.pieces.size <= 1) this.cleanSite(at.x, at.y);
      if (combo >= 3) {
        this.bigMoment();
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

    this.contractBuilt(nt, n);
    // After a long stay in one theme, any merge carries the run into the next one.
    if (this.themeTime >= THEME_MAX_TIME) this.bigMoment();

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
  // ------------------------------------------------------------ map themes

  /**
   * A flash colour for the board edges that belongs to the current map: one of
   * the theme's glow colours (`hint` is ignored so tier colours never clash with the scene).
   */
  private themePulse(_hint?: string) {
    const pal = THEMES[this.themeId].glow[Math.max(2, this.heat - 1)];
    return pal[Math.floor(Math.random() * pal.length)];
  }

  /** The theme a round opens in: the site for Endless, the district's theme for levels, the day's for the Daily. */
  private startTheme(): ThemeId {
    const m = this.playMode;
    if (m.kind === 'level') return themeForDistrict(Number(m.level.id.split('-')[0]) || 1);
    if (m.kind === 'daily') return THEME_ORDER[m.seed % THEME_ORDER.length];
    return 'site';
  }

  private tickTheme() {
    const before = this.themeTime;
    this.themeTime += DT;
    // Half a minute before a switch can happen, start preparing the next theme in the background.
    if (before < THEME_MIN_TIME - 30 && this.themeTime >= THEME_MIN_TIME - 30) {
      const next = nextTheme(this.themeId);
      this.themePrep.push(() => prepareBackdrop(next));
      for (let t = 1; t <= MAX_TIER; t++)
        this.themePrep.push(() => {
          modelTemplate(t, next);
          wireframe(t, next);
        });
    }
  }

  /**
   * A flashy moment: a shot that merges 3+ buildings, a streak of 4+, a board
   * clear or a Heat level-up. After 45 seconds in a theme the next one carries
   * the run into a new map while the screen is already lit up, so the change
   * stacks on the hype instead of interrupting a quiet moment.
   */
  private bigMoment(delay = 700) {
    if (this.playMode.kind === 'level' || !this.running || this.over) return;
    if (this.themeTime >= THEME_MIN_TIME) window.setTimeout(() => !this.over && this.running && this.themeTime >= THEME_MIN_TIME && this.switchTheme(nextTheme(this.themeId)), delay);
  }

  /** Moves the run to a theme. Quiet: instantly (round start, resume). Otherwise with the full celebration. */
  private switchTheme(id: ThemeId, quiet = false) {
    const changed = id !== this.themeId;
    this.themeId = id;
    this.themeTime = 0;
    setTheme(id);
    this.sfx.theme = id;
    const t = THEMES[id];
    this.view.applyTheme(t);
    showBackdrop(id, quiet);
    this.hud.retheme();
    const views = [...this.pieces.values()].map((p) => p.view);
    if (this.launcher) views.push(this.launcher.view);
    this.view.restyle(views, t.accent, quiet);
    if (quiet || !changed) return;
    this.hud.themeArrival(t, settings.calm);
    if (!settings.calm) {
      this.view.edgePulse(t.accent, 5);
      this.hud.flash();
      this.view.shake(0.012);
    }
    this.sfx.themeChange();
    haptics.success();
    this.events.onTheme?.(id);
    this.saveRun();
  }

  // ------------------------------------------------------------ level-clear celebration

  /**
   * Every contract is done: Candy Crush's "Sugar Crush!" moment. The screen
   * dims and the theme's shout lands, every leftover shot becomes a firework
   * that blows up a building for bonus points and coins, then the builder
   * jumps up cheering in a shower of confetti, and the results follow.
   */
  private startCelebration() {
    if (this.celebration || this.over || this.playMode.kind !== 'level') return;
    this.cancelBooster();
    this.aim = null;
    if (this.launcher) {
      const l = this.launcher;
      this.view.fx.dust(l.x, CONFIG.launchY, l.view.radius * 1.4, '#ffffff', 4);
      this.view.removePiece(l.view);
      this.launcher = null;
    }
    const t = THEMES[this.themeId];
    const left = Math.min(15, Math.max(0, this.shotsLeft ?? 0));
    this.celebration = { t: 0, phase: 'shout', left, next: 1.35, fired: 0, inFlight: 0, endAt: 0 };
    this.hud.celebrate(t.shout, t.accent);
    this.view.edgePulse(t.accent, 6);
    if (!settings.calm) this.view.shake(0.012);
    this.sfx.shout();
    this.events.onMerge?.(12, 5);
  }

  private tickCelebration(dt: number) {
    const c = this.celebration!;
    c.t += dt;
    const t = THEMES[this.themeId];
    if (c.phase === 'shout' && c.t >= c.next) {
      c.phase = c.left > 0 ? 'bonus' : 'finale';
      c.next = c.t;
      if (c.phase === 'finale') this.finale();
    }
    if (c.phase === 'bonus') {
      if (c.left > 0 && c.t >= c.next) {
        c.left--;
        c.fired++;
        c.inFlight++;
        c.next = c.t + Math.max(0.14, 0.34 - c.fired * 0.025);
        if (this.shotsLeft !== null) {
          this.shotsLeft = Math.max(0, this.shotsLeft - 1);
          this.hud.setShots(this.shotsLeft);
        }
        const k = c.fired;
        const pool = [...this.pieces.values()].filter((p) => !p.delivering && !p.dead);
        const target = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        const to = target ? { x: target.x, y: target.y } : { x: (Math.random() - 0.5) * 0.7, y: CONFIG.failY + 0.3 + Math.random() * (L - CONFIG.failY - 0.5) };
        const from = { x: (Math.random() - 0.5) * 0.5, y: CONFIG.launchY };
        const colors = t.glow[4];
        this.sfx.rocket(k - 1);
        this.view.rocket(from, to, colors[k % colors.length], () => {
          c.inFlight--;
          const points = 100 + 25 * k;
          this.addScore(points);
          const sp = this.view.toScreen(to.x, to.y, 0.15);
          this.hud.floatText(sp.x, sp.y, `+${points}`, true, 3);
          this.coinsEarned += 5;
          this.hud.setCoins(progress.addCoins(5));
          this.hud.celebrateBonus(k, k * 5);
          if (target && !target.dead) {
            this.view.fx.merge(target.x, target.y, tier(target.tier).era, tier(target.tier).color, 0.8);
            this.destroy(target);
          }
        });
      }
      if (c.left === 0 && c.inFlight === 0 && c.t >= c.next + 0.4) {
        c.phase = 'finale';
        this.finale();
      }
    }
    if (c.phase === 'finale' && c.endAt > 0 && c.t >= c.endAt) {
      this.celebration = null;
      this.endRound(true, 'All contracts complete');
    }
  }

  private finale() {
    const c = this.celebration!;
    const t = THEMES[this.themeId];
    const words = ['Wonderful!', 'Brilliant!', 'Fantastic!', 'Superb!', 'Amazing!'];
    this.hud.celebrateFinale(words[Math.floor(Math.random() * words.length)], t.accent, t.confetti);
    this.view.edgePulse(t.accent, 6);
    this.sfx.levelComplete();
    haptics.success();
    window.setTimeout(() => this.sfx.fanfare(), 350);
    c.endAt = c.t + 2.4;
  }

  private contractBuilt(tierId: number, piece?: Piece) {
    progress.addBuilt(tierId);
    this.builtThisRun.add(tierId);
    // A building that fills a contract is delivered: lifted off the board,
    // freeing its space (the merge game's version of clearing a line).
    const counts = this.contracts.some((c) => c.tier === tierId && !isComplete(c));
    if (counts && piece) this.deliver(piece);
    const done = recordBuild(this.contracts, tierId);
    this.hud.setContracts(this.contracts);
    for (const c of done) {
      // Every finished contract adds its building to the player's skyline.
      progress.addToSkyline(c.tier);
      this.coinsEarned += c.reward;
      this.hud.setCoins(progress.addCoins(c.reward));
      this.hud.contractDone(c.id, c.reward);
      this.sfx.contract();
      if (this.playMode.kind !== 'level') {
        window.setTimeout(() => {
          if (this.playMode.kind === 'level' || !this.contracts.includes(c)) return;
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
    if (this.playMode.kind === 'level' && this.winAt < 0 && this.contracts.every(isComplete)) {
      this.winAt = Infinity; // won: nothing can fail while the last merge plays out
      window.setTimeout(() => this.startCelebration(), 700);
    }
  }

  /**
   * Contract delivery: once its build-in has played, the crane lifts the
   * building off the board and flies it away. Its space frees up, the board
   * edges pulse and a "Delivered!" banner pays out.
   */
  private deliver(p: Piece) {
    p.delivering = true;
    const name = tierName(p.tier);
    window.setTimeout(() => {
      if (p.dead || this.over) return;
      const at = { x: p.x, y: p.y };
      this.destroy(p, true);
      this.view.deliver(p.view);
      this.view.edgePulse(this.themePulse());
      this.hud.praise(4, tier(p.tier).color, 'Delivered!');
      const sub = document.querySelector('.praise-combo');
      if (sub) sub.textContent = name.toUpperCase();
      this.sfx.deliver();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        this.view.fx.spark(at.x, at.y, 0.05, this.view.heatColor().set('#fff3b0'), 0.7, Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.4);
      }
      this.refreshHud();
    }, 750);
  }

  /** Clean Site: the table is (almost) empty after a merge. A big bonus and celebration. */
  private cleanSite(x: number, y: number) {
    const bonus = 500 * Math.max(1, this.highestRun);
    this.addScore(bonus);
    this.hud.praise(5, '#ffd84d', 'Clean site!');
    this.bigMoment();
    this.view.edgePulse(this.themePulse(), 5);
    this.hud.floatText(this.view.toScreen(x, y, 0.2).x, this.view.toScreen(x, y, 0.2).y - 40, `+${bonus.toLocaleString('en-US')}`, true, 6);
    for (let i = 0; i < 3; i++) this.view.fx.merge(x + (i - 1) * 0.25, y, 3, '#ffd84d', 3);
    if (!settings.calm) this.hud.flash();
    this.sfx.wonder();
    this.events.onMerge?.(12, 5);
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
      p.railHit = true;
      this.sfx.rail(speed);
    }
  }

  private addScore(p: number) {
    const before = this.score;
    this.score += p;
    this.hud.scoreGain(p);
    // Beating your record mid-run is its own celebration (once per run).
    if (!this.bestBeaten && this.best > 0 && before <= this.best && this.score > this.best && this.playMode.kind === 'endless') {
      this.bestBeaten = true;
      window.setTimeout(() => {
        this.hud.praise(6, '#ffd84d', 'New best!');
        this.hud.glow('#ffd84d');
        this.sfx.fanfare();
      }, 450);
    }
    if (this.score > this.best) {
      this.best = this.score;
      store.set('bm.best', this.best);
    }
    const h = heatFor(this.score);
    if (h > this.heat) this.heatUp(h);
    this.hud.setHeat(this.heat, heatProgress(this.score));
    this.refreshHud();
  }

  /** A new heat level: banner, fanfare and a burst, and the board gets flashier for the rest of the run. */
  private heatUp(level: number, quiet = false) {
    this.heat = level;
    this.view.setHeat(level);
    if (quiet) return;
    window.setTimeout(() => {
      if (this.over) return;
      this.hud.heatUp(level, heatGlow(level));
      this.sfx.heatUp(level);
      this.events.onMerge?.(12, 5);
      for (let i = 0; i < 2 + level; i++) this.view.fx.merge((Math.random() - 0.5) * 0.7, CONFIG.failY + 0.4 + Math.random() * 1, 3, heatGlow(level), 2 + level * 0.4);
      if (!settings.calm) this.view.punch(2 + level * 0.4);
      // Let the Heat banner land first, then roll into the next map.
      this.bigMoment(1600);
    }, 700);
  }

  private refreshHud() {
    this.hud.setScore(this.score, this.best, this.bestAtStart);
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
    this.endReason = reason;
    this.endWin = win;
    if (this.playMode.kind === 'endless') this.clearSavedRun();
    this.cancelBooster();
    this.aim = null;
    this.setDanger(false);
    this.view.setAim(0, 0, null);
    this.sfx.slide(0);
    let stars = 0;
    if (this.playMode.kind === 'daily') this.recordDaily();
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
      haptics.fail();
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
      built: [...this.builtThisRun].sort((a, b) => a - b),
      bestBefore: this.bestAtStart,
    });
    this.events.onTension?.(0);
    window.setTimeout(() => this.hud.clearCelebration(), 400);
    this.runsPlayed++;
    store.set('bm.runs', this.runsPlayed);
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
      // Comet trail behind fast shots once the run heats up (fiery during a streak).
      if (p.shot && p.speed > 1.5 && dt > 0 && (this.heat >= 1 || this.streak >= 2))
        this.view.trail(x, y, this.streak >= 4 ? '#ff9a4d' : heatGlow(Math.max(1, this.heat)));
      fastest = Math.max(fastest, p.speed);
    }
    this.sfx.slide(this.paused || this.over ? 0 : fastest);
    const l = this.launcher;
    if (l) {
      const wobble = this.aim ? Math.sin(this.time * 18) * 0.06 : 0;
      this.view.placePiece(l.view, l.x, CONFIG.launchY, wobble);
      this.view.animatePiece(l.view, dt);
      this.previewShot(l);
    } else {
      this.view.setAimPath(null, 0);
      this.view.setPreview([], 0, '#ffffff');
    }
  }

  private aimKey = '';
  private aimAge = 0;
  private aimResult: { path: ShotPath; pieces: Piece[] } | null = null;

  /**
   * Predicts what the shot will do with the real physics (see predictShot):
   * the exact path including glancing bounces off scaffolds and rails, whether a
   * scaffold stops it dead, and the first building it touches. If that is the
   * same tier, the merge and any chain that follows light up (the new building
   * touching another of its own tier). Re-run only when the aim, the power or
   * the table changes.
   */
  private previewShot(l: Launcher) {
    const none = () => {
      this.view.setAimPath(null, 0);
      this.view.setPreview([], 0, '#ffffff');
    };
    if (this.over || this.paused || this.targeting || this.celebration) return none();
    if (this.mode === 'sling' && !this.aim) return none();
    const r = l.view.radius;
    const power = this.aim?.power ?? this.lastPower;
    const speed = this.launchSpeed(power);
    const pieces = [...this.pieces.values()].filter((p) => !p.dead);
    let stamp = 0;
    for (const p of pieces) stamp += Math.round(p.x * 500) * 7 + Math.round(p.y * 500) * 13 + p.tier;
    const key = `${l.x.toFixed(3)}|${speed.toFixed(2)}|${l.tier}|${pieces.length}|${stamp}`;
    this.aimAge++;
    if (key !== this.aimKey || !this.aimResult || this.aimAge > 20) {
      this.aimKey = key;
      this.aimAge = 0;
      const obstacles = this.playMode.kind === 'level' ? (this.playMode.level.obstacles ?? []) : [];
      const path = predictShot(l.x, CONFIG.launchY, r, tier(l.tier).mass, speed, pieces.map((p) => [p.x, p.y, p.radius]), obstacles);
      this.aimResult = { path, pieces };
    }
    const { path, pieces: list } = this.aimResult;
    this.view.setAimPath(path, r);
    const first = path.hit >= 0 ? list[path.hit] : null;
    if (!first || first.dead || first.tier !== l.tier || first.delivering || l.tier >= MAX_TIER) {
      this.view.setPreview([], 0, '#ffffff');
      return;
    }
    // Follow the chain: the new building appears between the pair and merges with a touching twin.
    const chain: Piece[] = [first];
    let t = l.tier + 1;
    let at = { x: (first.x + path.end.x) / 2, y: (first.y + path.end.y) / 2 };
    while (t < MAX_TIER && chain.length < 5) {
      const rt = pieceRadius(t);
      let next: Piece | null = null;
      let bestD = Infinity;
      for (const p of this.pieces.values()) {
        if (p.tier !== t || p.delivering || chain.includes(p)) continue;
        const d = Math.hypot(p.x - at.x, p.y - at.y) - rt - p.radius;
        // The new building's exact spot isn't known, so later links get more leeway.
        if (d < (chain.length === 1 ? 0.03 : 0.07) && d < bestD) {
          bestD = d;
          next = p;
        }
      }
      if (!next) break;
      chain.push(next);
      at = { x: (at.x + next.x) / 2, y: (at.y + next.y) / 2 };
      t++;
    }
    const made = l.tier + chain.length; // the final building the chain makes
    const contract = this.contracts.some((c) => !isComplete(c) && c.tier > l.tier && c.tier <= made);
    const level = chain.length >= 3 || contract ? 3 : chain.length;
    this.view.setPreview(chain.map((p) => p.view), level, tier(Math.min(MAX_TIER, made)).color);
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
      if (this.over || this.aim || !this.running || this.paused || this.celebration) return;
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
      // Without a loaded piece the release does nothing: no queued spam shots.
      if (this.launcher) this.launch();
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
    if (progress.coins() < this.price(id) && this.freeBooster !== id) return 'coins';
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
      this.showQueue();
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
    const p = (id: BoosterId) => (this.freeBooster === id ? 0 : this.price(id));
    this.hud.setBoosterPrices({ wreck: p('wreck'), swap: p('swap'), upgrade: p('upgrade'), crane: p('crane') });
  }

  // ------------------------------------------------------------ rewarded ads

  /** The Daily keeps the best of its attempts (an ad can grant a second one). */
  private recordDaily() {
    if (this.playMode.kind !== 'daily') return;
    const prev = progress.daily(this.playMode.day);
    if (prev && prev.score > this.score) return;
    progress.setDaily(this.playMode.day, { score: this.score, highest: this.highestRun, built: [...this.builtThisRun] });
  }

  /** A failed round can be continued once with a rewarded ad. */
  canRevive() {
    return this.over && !this.endWin && !this.revived;
  }

  /**
   * Continue after failing: the 3 buildings closest to the site boundary are
   * cleared away (or, out of shots, 3 more shots are added) and the round goes on.
   */
  revive() {
    if (!this.canRevive()) return false;
    this.revived = true;
    this.over = false;
    this.running = true;
    this.paused = false;
    if (this.endReason === 'Out of shots') {
      this.shotsLeft = 3;
      this.outOfShotsAt = -1;
      this.hud.setShots(this.shotsLeft);
    } else {
      const near = [...this.pieces.values()].sort((a, b) => a.y - a.radius - (b.y - b.radius)).slice(0, 3);
      for (const p of near) {
        this.view.fx.dust(p.x, p.y, p.radius * 1.6, '#ffffff', 5);
        this.view.fx.merge(p.x, p.y, tier(p.tier).era, tier(p.tier).color, 1.5);
        this.destroy(p);
      }
    }
    for (const p of this.pieces.values()) p.over = 0;
    this.setDanger(false);
    if (!this.launcher) this.spawnLauncher();
    this.lastLaunch = this.time;
    this.view.edgePulse(this.themePulse(), 4);
    this.hud.praise(4, THEMES[this.themeId].accent, 'Second chance!');
    this.sfx.deliver();
    if (this.playMode.kind === 'daily') this.recordDaily();
    this.saveRun();
    this.refreshHud();
    return true;
  }

  /** Doubles the coins earned this round (rewarded ad on the results card). Returns the coins added. */
  doubleCoins() {
    const extra = this.coinsEarned - this.coinsDoubled;
    if (extra <= 0) return 0;
    this.coinsDoubled = this.coinsEarned;
    this.hud.setCoins(progress.addCoins(extra));
    return extra;
  }

  /** One booster per round can be had for a rewarded ad instead of coins. */
  canAdBooster() {
    return !this.adBoosterUsed && this.running && !this.over;
  }

  grantFreeBooster(id: BoosterId) {
    if (!this.canAdBooster()) return 'blocked';
    this.adBoosterUsed = true;
    this.freeBooster = id;
    this.refreshPrices();
    return this.useBooster(id);
  }

  /** Charges the current price and raises the next one. */
  private pay(id: BoosterId) {
    if (this.freeBooster === id) {
      // Paid for with a rewarded ad: no coins, and the price doesn't climb.
      this.freeBooster = null;
      this.refreshPrices();
      this.sfx.contract();
      return;
    }
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
      this.contractBuilt(t0 + 1, n);
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
    }
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
