import RAPIER from '@dimforge/rapier2d-compat';
import { CONFIG } from '../core/config';

let ready: Promise<void> | null = null;
export function initPhysics(): Promise<void> {
  ready ??= RAPIER.init();
  return ready;
}

export interface Body {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
}

/**
 * 2D table-plane physics. Game code works in table-widths; this class scales to
 * physics units internally. Table: x in [-W/2, W/2], y from 0 (player end) to L (back rail).
 */
export class TableWorld {
  readonly world: RAPIER.World;
  private queue = new RAPIER.EventQueue(true);
  private readonly S = CONFIG.physicsScale;

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: 0 });
    this.world.timestep = 1 / 60;
    this.buildRails();
  }

  private buildRails() {
    const S = this.S;
    const W = CONFIG.tableWidth;
    const L = CONFIG.tableLength;
    const t = 0.5; // half-thickness of invisible rail colliders
    const rail = (x: number, y: number, hx: number, hy: number) => {
      const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x * S, y * S));
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx * S, hy * S)
          .setRestitution(CONFIG.railRestitution)
          .setFriction(0.1),
        b,
      );
    };
    rail(-W / 2 - t, L / 2, t, L / 2 + 2 * t); // left
    rail(W / 2 + t, L / 2, t, L / 2 + 2 * t); // right
    rail(0, L + t, W / 2 + 2 * t, t); // back
    rail(0, -t, W / 2 + 2 * t, t); // front (behind the launcher)
  }

  addPiece(x: number, y: number, radius: number, mass: number): Body {
    const S = this.S;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x * S, y * S)
        .setLinearDamping(CONFIG.linearDamping)
        .setAngularDamping(CONFIG.angularDamping)
        .setCcdEnabled(true),
    );
    const r = radius * S;
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(r)
        .setDensity(mass / (Math.PI * r * r))
        .setRestitution(CONFIG.pieceRestitution)
        .setFriction(CONFIG.pieceFriction)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    return { body, collider };
  }

  /** A fixed obstacle (scaffold bumper) centred at x, y with half-extents hw, hh, in table units. */
  addObstacle(x: number, y: number, hw: number, hh: number) {
    const S = this.S;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x * S, y * S));
    const collider = this.world.createCollider(
      // Scaffolds absorb hits (no bounce), so a blocked shot stops in front of them
      // instead of rebounding over the site boundary.
      RAPIER.ColliderDesc.cuboid(hw * S, hh * S)
        .setRestitution(0)
        .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Min)
        .setFriction(0.4),
      body,
    );
    return { body, collider };
  }

  remove(b: Body) {
    this.world.removeRigidBody(b.body);
  }

  pos(b: Body) {
    const p = b.body.translation();
    return { x: p.x / this.S, y: p.y / this.S };
  }
  vel(b: Body) {
    const v = b.body.linvel();
    return { x: v.x / this.S, y: v.y / this.S };
  }
  angle(b: Body) {
    return b.body.rotation();
  }
  setVel(b: Body, vx: number, vy: number) {
    b.body.setLinvel({ x: vx * this.S, y: vy * this.S }, true);
  }
  /** Moves a body instantly (Crane Lift) and stops it. */
  teleport(b: Body, x: number, y: number) {
    b.body.setTranslation({ x: x * this.S, y: y * this.S }, true);
    b.body.setLinvel({ x: 0, y: 0 }, true);
  }

  /** Adds a velocity change (widths/s) regardless of mass. */
  kick(b: Body, dvx: number, dvy: number) {
    const v = b.body.linvel();
    b.body.setLinvel({ x: v.x + dvx * this.S, y: v.y + dvy * this.S }, true);
  }

  /** Steps one fixed tick; returns collider-handle pairs that started touching. */
  step(): Array<[number, number]> {
    this.world.step(this.queue);
    const started: Array<[number, number]> = [];
    this.queue.drainCollisionEvents((a, b, s) => {
      if (s) started.push([a, b]);
    });
    return started;
  }

  /** Pairs of colliders currently in contact (to catch merges between pieces already touching). */
  touching(handle: number, cb: (other: number) => void) {
    const c = this.world.getCollider(handle);
    if (!c) return;
    this.world.contactPairsWith(c, (o) => {
      this.world.contactPair(c, o, (m) => {
        if (m.numContacts() > 0) cb(o.handle);
      });
    });
  }
}

export interface ShotPath {
  /** Centre of the shot along its path (table units). */
  points: { x: number; y: number }[];
  /** Where it ends: touching a building, stopped, or at rest. */
  end: { x: number; y: number };
  /** Index into `balls` of the building it touches first, or -1. */
  hit: number;
  /** Stopped dead by a scaffold (hit it head-on, or no room to slip past). */
  blocked: boolean;
  /** Where it glanced off a scaffold corner or a rail. */
  bounces: { x: number; y: number }[];
}

/**
 * Predicts a shot with the real physics: a throwaway world with the same rails
 * and scaffolds, the buildings on the table held still, and the shot launched
 * exactly as the game launches it. It plays the shot out until it stops (max 5 s) and
 * reports the path, the first building it touches, and any glancing bounces or
 * a head-on stop against a scaffold. Cheap enough to run whenever the aim moves.
 */
export function predictShot(
  x: number,
  y: number,
  radius: number,
  mass: number,
  vy: number,
  balls: [x: number, y: number, r: number][],
  obstacles: [x: number, y: number, w: number, h: number][],
): ShotPath {
  const S = CONFIG.physicsScale;
  const W = CONFIG.tableWidth;
  const L = CONFIG.tableLength;
  const world = new RAPIER.World({ x: 0, y: 0 });
  world.timestep = 1 / 60;
  const queue = new RAPIER.EventQueue(true);
  const solid = new Set<number>();
  const fixed = (cx: number, cy: number, desc: RAPIER.ColliderDesc) => {
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx * S, cy * S));
    return world.createCollider(desc, b).handle;
  };
  const t = 0.5;
  for (const [cx, cy, hx, hy] of [
    [-W / 2 - t, L / 2, t, L / 2 + 2 * t],
    [W / 2 + t, L / 2, t, L / 2 + 2 * t],
    [0, L + t, W / 2 + 2 * t, t],
    [0, -t, W / 2 + 2 * t, t],
  ])
    solid.add(fixed(cx, cy, RAPIER.ColliderDesc.cuboid(hx * S, hy * S).setRestitution(CONFIG.railRestitution).setFriction(0.1)));
  const obstacleHandles = new Set<number>();
  for (const [ox, oy, w, h] of obstacles) {
    const hnd = fixed(ox, oy, RAPIER.ColliderDesc.cuboid((w / 2) * S, (h / 2) * S).setRestitution(0).setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Min).setFriction(0.4));
    solid.add(hnd);
    obstacleHandles.add(hnd);
  }
  const ballOf = new Map<number, number>();
  balls.forEach(([bx, by, br], i) => ballOf.set(fixed(bx, by, RAPIER.ColliderDesc.ball(br * S).setRestitution(CONFIG.pieceRestitution)), i));
  const r = radius * S;
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(x * S, y * S).setLinearDamping(CONFIG.linearDamping).setAngularDamping(CONFIG.angularDamping).setCcdEnabled(true),
  );
  const shot = world.createCollider(
    RAPIER.ColliderDesc.ball(r).setDensity(mass / (Math.PI * r * r)).setRestitution(CONFIG.pieceRestitution).setFriction(CONFIG.pieceFriction).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body,
  );
  body.setLinvel({ x: 0, y: vy * S }, true);

  const res: ShotPath = { points: [{ x, y }], end: { x, y }, hit: -1, blocked: false, bounces: [] };
  let lastObstacle = -1;
  let speedBefore = vy;
  for (let i = 0; i < 300; i++) {
    const v0 = body.linvel();
    speedBefore = Math.hypot(v0.x, v0.y) / S;
    world.step(queue);
    const p = body.translation();
    const pos = { x: p.x / S, y: p.y / S };
    let hitBall = -1;
    let hitSolid = -1;
    queue.drainCollisionEvents((a, b, started) => {
      if (!started) return;
      const other = a === shot.handle ? b : b === shot.handle ? a : -1;
      if (other < 0) return;
      if (ballOf.has(other)) hitBall = ballOf.get(other)!;
      else if (solid.has(other)) hitSolid = other;
    });
    if (hitBall >= 0) {
      res.hit = hitBall;
      res.points.push(pos);
      res.end = pos;
      break;
    }
    const v = body.linvel();
    const speed = Math.hypot(v.x, v.y) / S;
    if (hitSolid >= 0) {
      // A scaffold that eats most of the speed is a stop, otherwise a glancing bounce.
      if (obstacleHandles.has(hitSolid) && speed < speedBefore * 0.35) {
        res.blocked = true;
        lastObstacle = i;
      } else res.bounces.push(pos);
    }
    if (i % 2 === 0) res.points.push(pos);
    res.end = pos;
    if (speed < 0.03 || (lastObstacle >= 0 && i - lastObstacle > 8)) break;
  }
  res.points.push(res.end);
  queue.free();
  world.free();
  return res;
}
