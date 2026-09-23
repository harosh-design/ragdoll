import * as pl from 'planck'
import {
  PHYS_SCALE, GRAVITY_Y, COURT, BALL, SPAWN,
  BALL_WALL_VX_FACTOR, BALL_HAZARD_VX_FACTOR,
} from './original.js'

const m = (px) => px / PHYS_SCALE

/** Body type tags, kept as the original's `e_bodytype` so contact rules line up. */
export const BODY_PLAYER = 1
export const BODY_WALL = 2
export const BODY_BALL = 3
export const BODY_HAZARD = 7
export const BODY_GROUND = 15

export function createWorld(gravityY = GRAVITY_Y) {
  return new pl.World({ gravity: pl.Vec2(0, gravityY) })
}

/**
 * The static court from the original's `ground` class, plus a body standing in
 * for Box2D's built-in ground body that the horizontal rails anchor to.
 */
export function createCourt(world) {
  const groundBody = world.createBody()
  const make = (spec) => {
    const body = world.createBody({ position: pl.Vec2(m(spec.x), m(spec.y)) })
    body.createFixture({
      shape: pl.Box(m(spec.hx), m(spec.hy)),
      // The original leaves these defs at density 0, which is what makes the
      // court static in Box2D 2.0.
      density: 0,
      friction: spec.friction ?? 0.2,
      restitution: 0,
    })
    body.setUserData({ bodyType: spec.bodyType })
    return body
  }
  return {
    groundBody,
    leftWall: make(COURT.leftWall),
    rightWall: make(COURT.rightWall),
    ceiling: make(COURT.ceiling),
    ground: make(COURT.ground),
    net: make(COURT.net),
  }
}

/** The original's `ball` class: light, perfectly elastic and flagged as a bullet. */
export class Ball {
  constructor(world, x = SPAWN.ball.x, y = SPAWN.ball.y) {
    this.body = world.createBody({
      type: 'dynamic',
      position: pl.Vec2(m(x), m(y)),
      angularDamping: 0,
      linearDamping: 0,
      bullet: BALL.bullet,
    })
    this.body.createFixture({
      shape: pl.Circle(m(BALL.radius)),
      density: BALL.density,
      friction: BALL.friction,
      restitution: BALL.restitution,
    })
    this.body.setMassData({ mass: BALL.mass, center: pl.Vec2(0, 0), I: BALL.inertia })
    this.body.setUserData({ bodyType: BODY_BALL, ball: this })
    /** 0 while in flight, otherwise the id of the player holding it. */
    this.ballOfPlayer = 0
  }

  /** ball::update — hard speed caps, re-applied every frame. */
  update() {
    const v = this.body.getLinearVelocity()
    const x = Math.max(-BALL.maxVX, Math.min(BALL.maxVX, v.x))
    const y = Math.max(-BALL.maxVY, Math.min(BALL.maxVY, v.y))
    if (x !== v.x || y !== v.y) this.body.setLinearVelocity(pl.Vec2(x, y))
  }
}

/**
 * MyContactListener::Result. The ball keeps everything it has off players and the
 * floor; walls and the net eat horizontal speed, and the floor ends the rally.
 * @param {(side: 'ground'|'wall'|'hazard') => void} [onEvent]
 */
export function attachContactRules(world, ball, onEvent) {
  world.on('post-solve', (contact) => {
    const a = contact.getFixtureA().getBody()
    const b = contact.getFixtureB().getBody()
    const ballBody = ball.body
    if (a !== ballBody && b !== ballBody) return
    const other = a === ballBody ? b : a
    const type = other.getUserData()?.bodyType

    if (type === BODY_HAZARD) {
      const v = ballBody.getLinearVelocity()
      ballBody.setLinearVelocity(pl.Vec2(v.x * BALL_HAZARD_VX_FACTOR, v.y))
      onEvent?.('hazard')
    } else if (type === BODY_WALL) {
      const v = ballBody.getLinearVelocity()
      ballBody.setLinearVelocity(pl.Vec2(v.x * BALL_WALL_VX_FACTOR, v.y))
      onEvent?.('wall')
    } else if (type === BODY_GROUND) {
      onEvent?.('ground')
    }
  })
}
