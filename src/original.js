// Physics constants of the original Flash game "Ragdoll Volleyball" (Sedoiga, 2009).
//
// Every number here was read out of the game's own ActionScript 3 bytecode, not
// guessed from watching it: the distributed SWF wraps the game in a MochiCrypt
// preloader (RC4 over the first 128 KiB, key = the payload's last 16 bytes, then
// zlib), and the payload underneath is a Box2DFlash 2.0 game. The class names in
// comments below are the original ones, so a value can always be traced back.
//
// Units follow the original: lengths are stage pixels, and the physics world
// divides them by PHYS_SCALE. Box2D is y-down, so +y is toward the floor and a
// negative y impulse pushes a body up the screen.

/** world.m_physScale — pixels per physics metre. */
export const PHYS_SCALE = 30

/** world ctor — b2World(aabb, gravity, doSleep) with gravity (0, 10), y-down. */
export const GRAVITY_Y = 10

/** world.m_iterations — passed to b2World.Step as the solver iteration count. */
export const ITERATIONS = 10

/**
 * game ctor sets m_timeStep = 0.035714 (1/28) for play; world ctor's 1/25 only
 * ever applies to the menu. One Step per rendered frame at the SWF's 30 fps,
 * which is why the original runs slightly "fast" for its own clock.
 */
export const TIME_STEP = 0.035714
export const FRAME_RATE = 30

/** game::viewGoal / on_Goal slow the world right down while a goal is shown. */
export const TIME_STEP_GOAL = 0.005

/** ground ctor — static geometry, in stage pixels (centre + half extents). */
export const COURT = {
  ground: { x: 320, y: 405, hx: 600, hy: 50, bodyType: 15 },
  ceiling: { x: 320, y: -900, hx: 600, hy: 50, bodyType: 0 },
  leftWall: { x: -265, y: -230, hx: 50, hy: 650, bodyType: 2 },
  rightWall: { x: 890, y: -230, hx: 50, hy: 650, bodyType: 2 },
  // The centre post: 2 px wide, 150 px tall, friction 2.5 — the "spear" players
  // get stuck on. Its top is the net height.
  net: { x: 320, y: 281, hx: 1, hy: 75, friction: 2.5, bodyType: 2 },
}

/** Derived from COURT: the surfaces play actually happens against. */
export const FLOOR_Y = COURT.ground.y - COURT.ground.hy      // 355
export const NET_TOP_Y = COURT.net.y - COURT.net.hy          // 206
export const NET_X = COURT.net.x                             // 320
export const LEFT_WALL_X = COURT.leftWall.x + COURT.leftWall.hx    // -215
export const RIGHT_WALL_X = COURT.rightWall.x - COURT.rightWall.hx // 840

/** world::CreateLevel — spawn points, in stage pixels. */
export const SPAWN = {
  p1: { x: 100, y: 256 },
  p2: { x: 500, y: 256 },
  ball: { x: 200, y: 20 },
}

/** ball ctor. Radius is in pixels; mass and inertia are set explicitly. */
export const BALL = {
  radius: 15,
  density: 0.1,
  friction: 0.05,
  restitution: 1,
  mass: 0.1,
  inertia: 0.01,
  bullet: true,
  bodyType: 3,
  /** ball::update clamps every frame, in metres per second. */
  maxVX: 15,
  maxVY: 20,
}

/**
 * MyContactListener::Result — the ball keeps its full bounce off players and the
 * floor, but loses horizontal speed against the walls and the net (bodytype 2).
 */
export const BALL_WALL_VX_FACTOR = 0.6
/** ...and much more against a hazard (bodytype 7). */
export const BALL_HAZARD_VX_FACTOR = 0.4

/**
 * player ctor — the body parts, in stage pixels relative to the spawn point.
 * `hx`/`hy` are half extents of a box; `r` is a circle radius. Friction is 0.5
 * for player 1 and 0.51 for player 2 (the original's way of keeping the two
 * dolls from behaving identically). Every part has angularDamping 0.
 */
export const PARTS = [
  { name: 'HandLeft', dx: -41, dy: 18, hx: 12, hy: 4, density: 1, restitution: 1 },
  { name: 'HandRight', dx: 41, dy: 18, hx: 12, hy: 4, density: 1, restitution: 1 },
  { name: 'ArmLeft', dx: -22, dy: 18, hx: 12, hy: 4, density: 1, restitution: 1 },
  { name: 'ArmRight', dx: 22, dy: 18, hx: 12, hy: 4, density: 1, restitution: 1 },
  { name: 'Tors', dx: 0, dy: 32, hx: 10, hy: 17, density: 0.1, restitution: 1 },
  { name: 'Head', dx: 0, dy: 2, r: 10, density: 1, restitution: 1.2 },
  { name: 'FingerLeft', dx: -54, dy: 18, hx: 4, hy: 4, density: 1, restitution: 1 },
  { name: 'FingerRight', dx: 54, dy: 18, hx: 4, hy: 4, density: 1, restitution: 1 },
  { name: 'FootLeft', dx: -7, dy: 90, hx: 5, hy: 11, density: 1, restitution: 1 },
  { name: 'FootRight', dx: 7, dy: 90, hx: 5, hy: 11, density: 1, restitution: 1 },
  { name: 'LegLeft', dx: -7, dy: 69, hx: 5, hy: 13, density: 1, restitution: 1 },
  { name: 'LegRight', dx: 7, dy: 69, hx: 5, hy: 13, density: 1, restitution: 1 },
  { name: 'Ass', dx: 0, dy: 50, hx: 10, hy: 6, density: 1, restitution: 1 },
]

export const PART_FRICTION = { 1: 0.5, 2: 0.51 }

/** All joints are revolute with limits enabled. Angles in degrees, anchors in px. */
export const JOINTS = [
  { a: 'Tors', b: 'Head', dx: 0, dy: 10, lower: -30, upper: 30 },
  { a: 'Ass', b: 'Tors', dx: 0, dy: 45, lower: -30, upper: 30 },
  { a: 'ArmRight', b: 'Tors', dx: 12, dy: 18, lower: -100, upper: 85 },
  { a: 'ArmLeft', b: 'Tors', dx: -12, dy: 18, lower: -85, upper: 100 },
  { a: 'ArmRight', b: 'HandRight', dx: 31, dy: 18, lower: -10, upper: 100 },
  { a: 'ArmLeft', b: 'HandLeft', dx: -31, dy: 18, lower: -100, upper: 10 },
  { a: 'FingerRight', b: 'HandRight', dx: 53, dy: 18, lower: -10, upper: 40 },
  { a: 'FingerLeft', b: 'HandLeft', dx: -53, dy: 18, lower: -40, upper: 10 },
  { a: 'LegLeft', b: 'Ass', dx: -6, dy: 56, lower: -30, upper: 3 },
  { a: 'LegRight', b: 'Ass', dx: 6, dy: 56, lower: -3, upper: 30 },
  { a: 'LegRight', b: 'FootRight', dx: 6, dy: 80, lower: -10, upper: 25 },
  { a: 'LegLeft', b: 'FootLeft', dx: -6, dy: 80, lower: -25, upper: 10 },
]

/**
 * The part of the original almost nobody guesses: the doll does not balance, it
 * hangs. A 2x2 px sensor body (PrismBody) rides a horizontal prismatic joint on
 * the static ground body, and the Head rides a vertical prismatic joint on that.
 *
 * Because a prismatic joint also locks relative rotation, the head can never
 * rotate and never sags below its standing line — the rest of the doll dangles
 * from the neck. The horizontal limits are what keep each player on their own
 * half. Both motors are off: all movement comes from the impulses below.
 */
export const RAIL = {
  shape: { hx: 1, hy: 1, density: 1, friction: 0.1, restitution: 1, isSensor: true },
  y: -645,
  p1: { x: 100, lowerTranslation: -13, upperTranslation: 5.8 },
  p2: { x: 500, lowerTranslation: -4.4, upperTranslation: 14 },
  /** PrismBody -> Head, axis (0, -1), identical for both players. */
  vertical: { lowerTranslation: 0.2, upperTranslation: 55 },
}

/** player::jump, ::turn, ::turnUp, ::turnDown, ::turnHands and ::pas. */
export const MOVE = {
  /** turn(): sideways impulse, applied every frame the key is held. */
  turnImpulse: 4,
  /** turn(): above this head height (px) the impulse goes to the head, not the hips. */
  turnHeadSwitchY: 200,
  /** jump(): only allowed while the hips are below this (px). */
  jumpGroundY: 296,
  /** jump(): straight-up kick given to both head and hips. */
  jumpImpulse: 4,
  /** jump(): impulse along head-minus-torso, applied at each finger. */
  jumpBodyImpulse: 13,
  /** turnDown(): pushed into each foot every frame. */
  downImpulse: 1,
  /** turnUp(): only below this head height (px), used by the AI. */
  upImpulse: 1.5,
  upHeadY: 255,
  /** turnHands(): reach toward a target, used by the AI. */
  handsImpulse: 4.5,
}

/** player::pas — the serve. Mirrored for player 2. */
export const SERVE = {
  /** Only serves while the ball is still on the server's own half (metres). */
  courtCenterM: 10.7,
  fingerImpulse: { x: 1, y: -1.5 },
  ballImpulse: { x: 0.7, y: -0.5 },
  /** player::takeBall — the revolute joint that holds the ball to the fingers. */
  holdLimitDeg: 40,
  /** Timer(50, 1) before the doll counts as having touched the ball again. */
  touchDelayMs: 50,
}

/**
 * Bounding boxes of the original's own body-part artwork (`mc_Head`, `mc_LegL`,
 * …), in stage pixels, read from the inner SWF's shape and sprite tags.
 *
 * These matter because the collision boxes in `PARTS` are deliberately simplified
 * and are noticeably smaller than what the game draws on top of them — the thigh
 * collider is 26 px tall where its sprite is 35, and the shin collider is 22
 * where its sprite is 34. Drawing limbs at collider size is what makes a ragdoll
 * look long-armed and short-legged, so the artwork here follows these instead.
 */
export const ART = {
  head: { w: 21.1, h: 21.6 },
  tors: { w: 23.4, h: 42.3 },
  ass: { w: 26.5, h: 17.5 },
  arm: { w: 27.9, h: 9.9 },
  hand: { w: 24.3, h: 8.1 },
  fingers: { w: 16.4, h: 14.4 },
  leg: { w: 13, h: 35 },
  foot: { w: 8.9, h: 33.7 },
  ball: { w: 31.4, h: 28.8 },
}
