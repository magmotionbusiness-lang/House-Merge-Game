/** Feel tuning. Units: table-widths (W = 1) and seconds. See DECISIONS.md for why. */
export const CONFIG = {
  tableWidth: 1,
  tableLength: 1.8,
  launchY: 0.2, // where the current piece waits (distance from the player end)
  failY: 0.4, // red site-boundary line
  footprintScale: 1.3, // brief footprints felt too small on a phone; scale them up
  heightScale: 0.75,

  physicsScale: 10, // physics units per table-width (Rapier prefers ~metre-sized bodies)
  linearDamping: 2.6,
  angularDamping: 6,
  pieceRestitution: 0.25,
  railRestitution: 0.65, // averaged with the piece -> ~0.45 off rails
  pieceFriction: 0.15,

  slideSpeed: 6.2, // fixed launch speed in "slide" mode (widths/s)
  slingMin: 0.45, // fraction of slideSpeed at zero pull
  slingMax: 1.3, // fraction of slideSpeed at full pull
  slingPullPx: 0.2, // full power at this fraction of screen height

  settleSpeed: 0.04, // widths/s
  settleTime: 0.25,
  unlockTimeout: 1.5,
  nextBlankTime: 0.3,
  failHoldTime: 2,

  mergeImpulse: 0.9,
};

export type AimMode = 'slide' | 'sling';
