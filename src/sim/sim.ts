/**
 * Headless simulation of a level, used by the balancing bot. It runs the
 * same physics world and the same rules as the game (spawns, merges, the
 * merge shove, contracts, shot limits, the site-boundary fail rule), with no
 * rendering, so thousands of rounds can be played in seconds.
 */
import { CONFIG } from '../core/config';
import { isComplete, makeContract, recordBuild, type Contract } from '../core/contracts';
import type { LevelDef } from '../core/levels';
import { Rng } from '../core/rng';
import { MAX_TIER, tier } from '../core/tiers';
import { nextSpawn } from '../core/spawn';
import { TableWorld, type Body } from '../physics/world';

const DT = 1 / 60;
const W = CONFIG.tableWidth;
const L = CONFIG.tableLength;

export const radiusOf = (t: number) => (tier(t).footprint * CONFIG.footprintScale) / 2;

interface SimPiece {
  tier: number;
  b: Body;
  r: number;
  x: number;
  y: number;
  speed: number;
  still: number;
  over: number;
  born: number;
  dead: boolean;
}

export interface SimResult {
  win: boolean;
  shots: number; // shots taken when the round ended
  overflow: boolean;
  highest: number;
  bestCombo: number;
}

export type Bot = (sim: Sim) => number; // returns the x to shoot at

export class Sim {
  world = new TableWorld();
  pieces = new Map<number, SimPiece>();
  rng: Rng;
  contracts: Contract[];
  launcher: number;
  next: number;
  time = 0;
  shots = 0;
  highest = 0;
  overflow = false;
  bestCombo = 0;
  /** Contract builds are lifted off the board (true in the game). */
  deliver = true;
  private lastMerge = -10;
  private combo = 0;

  constructor(
    public level: LevelDef,
    seed: number,
  ) {
    this.rng = new Rng(seed);
    for (const [x, y, w, h] of level.obstacles ?? []) this.world.addObstacle(x, y, w / 2, h / 2);
    for (const [t, x, y] of level.start ?? []) this.add(t, x, y, 0, 0);
    this.contracts = level.contracts.map((c) => makeContract(c.tier, c.count));
    this.launcher = nextSpawn(this.rng, null, this.highestOnTable(), level.spawn);
    this.next = nextSpawn(this.rng, this.launcher, this.highestOnTable(), level.spawn);
  }

  get list() {
    return [...this.pieces.values()];
  }

  highestOnTable() {
    let h = 0;
    for (const p of this.pieces.values()) h = Math.max(h, p.tier);
    return h;
  }

  private add(t: number, x: number, y: number, vx: number, vy: number) {
    const r = radiusOf(t);
    x = Math.min(Math.max(x, -W / 2 + r + 0.004), W / 2 - r - 0.004);
    y = Math.min(Math.max(y, r), L - r);
    const b = this.world.addPiece(x, y, r, tier(t).mass);
    this.world.setVel(b, vx, vy);
    const p: SimPiece = { tier: t, b, r, x, y, speed: Math.hypot(vx, vy), still: 0, over: 0, born: this.time, dead: false };
    this.pieces.set(b.collider.handle, p);
    this.highest = Math.max(this.highest, t);
    return p;
  }

  private destroy(p: SimPiece) {
    p.dead = true;
    this.pieces.delete(p.b.collider.handle);
    this.world.remove(p.b);
  }

  private merge(ha: number, hb: number) {
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
    this.combo = this.time - this.lastMerge <= 1.2 ? this.combo + 1 : 1;
    this.lastMerge = this.time;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    if (a.tier >= MAX_TIER) return;
    const nt = a.tier + 1;
    const n = this.add(nt, mx, my, (va.x + vb.x) / 2, (va.y + vb.y) / 2);
    for (const o of this.pieces.values()) {
      if (o === n) continue;
      const op = this.world.pos(o.b);
      const dx = op.x - mx;
      const dy = op.y - my;
      const d = Math.hypot(dx, dy);
      const reach = n.r + o.r + 0.06;
      if (d > 1e-4 && d < reach) {
        const k = (CONFIG.mergeImpulse * (1 - d / reach) * Math.min(1, tier(nt).mass / tier(o.tier).mass)) / d;
        this.world.kick(o.b, dx * k, dy * k);
      }
    }
    // Contract builds are delivered (lifted off the board), as in the game.
    if (this.deliver && this.contracts.some((c) => c.tier === nt && !isComplete(c))) this.destroy(n);
    recordBuild(this.contracts, nt);
  }

  private step() {
    this.time += DT;
    for (const [a, b] of this.world.step()) this.merge(a, b);
    let worst = 0;
    let allStill = true;
    for (const p of this.pieces.values()) {
      const pos = this.world.pos(p.b);
      const v = this.world.vel(p.b);
      p.x = pos.x;
      p.y = pos.y;
      p.speed = Math.hypot(v.x, v.y);
      p.still = p.speed < CONFIG.settleSpeed ? p.still + DT : 0;
      const settled = p.still >= CONFIG.settleTime;
      if (!settled) allStill = false;
      const crossing = p.y - p.r < CONFIG.failY && this.time - p.born > 0.6;
      if (!crossing) p.over = 0;
      else if (settled) p.over += DT;
      worst = Math.max(worst, p.over);
    }
    if (worst >= CONFIG.failHoldTime) this.overflow = true;
    return allStill;
  }

  get won() {
    return this.contracts.every(isComplete);
  }

  /** Shoots the launcher at x and simulates until the table settles. */
  shoot(x: number) {
    const r = radiusOf(this.launcher);
    this.add(this.launcher, x, CONFIG.launchY, 0, CONFIG.slideSpeed);
    this.shots++;
    this.launcher = this.next;
    this.next = nextSpawn(this.rng, this.launcher, this.highestOnTable(), this.level.spawn);
    void r;
    // Players fire again about a second later; the table usually settles by then.
    for (let i = 0; i < 150; i++) {
      const still = this.step();
      if (this.overflow || (i > 30 && still)) break;
    }
    // Pieces resting over the line keep counting down even between shots.
    if (!this.overflow && this.list.some((p) => p.over > 0)) for (let i = 0; i < 130 && !this.overflow; i++) this.step();
  }

  /** Plays until the contracts are done, the site overflows, or `maxShots` are used. */
  play(bot: Bot, maxShots: number): SimResult {
    while (!this.won && !this.overflow && this.shots < maxShots) this.shoot(bot(this));
    return { win: this.won && !this.overflow, shots: this.shots, overflow: this.overflow, highest: this.highest, bestCombo: this.bestCombo };
  }

  free() {
    this.world.world.free();
  }
}

/**
 * The balancing bot: aims at the best matching piece. For each candidate lane
 * it finds the first piece the shot would hit; a same-tier hit (a merge) scores
 * highest, then hits that build toward contract tiers, then deep, open lanes.
 */
export function greedyBot(rng: Rng): Bot {
  return (sim) => {
    const r = radiusOf(sim.launcher);
    const lanes = 17;
    const want = new Set(sim.contracts.filter((c) => !isComplete(c)).map((c) => c.tier));
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < lanes; i++) {
      const x = -W / 2 + r + 0.005 + ((W - 2 * r - 0.01) * i) / (lanes - 1);
      let hit: SimPiece | null = null;
      let hitY = L - r;
      for (const p of sim.pieces.values()) {
        const dx = Math.abs(p.x - x);
        const rr = r + p.r;
        if (dx < rr && p.y > CONFIG.launchY) {
          const y = p.y - Math.sqrt(rr * rr - dx * dx);
          if (y < hitY) {
            hitY = y;
            hit = p;
          }
        }
      }
      let blocked = false;
      for (const [ox, oy, w, h] of sim.level.obstacles ?? []) {
        if (Math.abs(ox - x) < w / 2 + r && oy > CONFIG.launchY) {
          const y = oy - h / 2 - r;
          if (y < hitY) {
            hitY = y;
            hit = null;
            blocked = true;
          }
        }
      }
      let score = hitY * 2;
      if (blocked) score -= 60;
      else if (hit) {
        if (hit.tier === sim.launcher) score += 100 + hit.tier * 4 + (want.has(hit.tier + 1) ? 30 : 0);
        else if (hit.tier < sim.launcher) score -= 10;
        else score -= (hit.tier - sim.launcher) * 2;
        // Centre hits on a match are more reliable than grazes.
        if (hit.tier === sim.launcher) score -= Math.abs(hit.x - x) * 40;
      } else if (!blocked) score += 6;
      score += rng.next() * 3;
      if (score > bestScore) {
        bestScore = score;
        best = x;
      }
    }
    return best;
  };
}
