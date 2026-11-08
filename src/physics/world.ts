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
