import * as pl from 'planck'
import {
  PHYS_SCALE, PARTS, PART_FRICTION, JOINTS, RAIL, MOVE, SERVE,
} from './original.js'

/** Stage pixels -> physics metres, the way the original divides by m_physScale. */
const m = (px) => px / PHYS_SCALE
const rad = (deg) => (deg * Math.PI) / 180

/**
 * A player, built exactly like the original's `player` class: thirteen parts,
 * twelve limited revolute joints, and the two prismatic rails that hold the doll
 * up by its head. See original.js for where each number comes from.
 */
export class Player {
  /**
   * @param {pl.World} world
   * @param {pl.Body} groundBody - stands in for Box2D's GetGroundBody()
   * @param {number} x - spawn x in stage pixels
   * @param {number} y - spawn y in stage pixels
   * @param {1|2} id
   */
  constructor(world, groundBody, x, y, id) {
    this.world = world
    this.id = id
    this.parts = {}
    /** Mirrors the original's `contact` field: 0 free, 2 just served, 3 touched. */
    this.contact = 0
    this.ballJoint = null
    this.touchTimer = null

    const friction = PART_FRICTION[id]

    for (const part of PARTS) {
      const body = world.createBody({
        type: 'dynamic',
        position: pl.Vec2(m(x + part.dx), m(y + part.dy)),
        angularDamping: 0,
      })
      const shape = part.r != null ? pl.Circle(m(part.r)) : pl.Box(m(part.hx), m(part.hy))
      body.createFixture({
        shape,
        density: part.density,
        friction,
        restitution: part.restitution,
      })
      body.setUserData({ bodyType: 1, player: this, part: part.name })
      this.parts[part.name] = body
      this[part.name] = body
    }

    for (const j of JOINTS) {
      world.createJoint(
        pl.RevoluteJoint(
          { enableLimit: true, lowerAngle: rad(j.lower), upperAngle: rad(j.upper) },
          this.parts[j.a],
          this.parts[j.b],
          pl.Vec2(m(x + j.dx), m(y + j.dy))
        )
      )
    }

    const rail = id === 1 ? RAIL.p1 : RAIL.p2
    this.PrismBody = world.createBody({
      type: 'dynamic',
      position: pl.Vec2(m(rail.x), m(RAIL.y)),
      angularDamping: 0,
      fixedRotation: true,
    })
    this.PrismBody.createFixture({
      shape: pl.Box(m(RAIL.shape.hx), m(RAIL.shape.hy)),
      density: RAIL.shape.density,
      friction: RAIL.shape.friction,
      restitution: RAIL.shape.restitution,
      isSensor: RAIL.shape.isSensor,
    })
    this.PrismBody.setUserData({ bodyType: 0, rail: true })

    // Horizontal rail: bounds the player to their own half of the court.
    world.createJoint(
      pl.PrismaticJoint(
        {
          enableLimit: true,
          lowerTranslation: rail.lowerTranslation,
          upperTranslation: rail.upperTranslation,
          enableMotor: false,
          maxMotorForce: 0,
          motorSpeed: 0,
        },
        groundBody,
        this.PrismBody,
        this.PrismBody.getWorldCenter(),
        pl.Vec2(1, 0)
      )
    )

    // Vertical rail: locks the head's rotation and stops it sagging below the
    // standing line, which is what keeps the doll on its feet.
    world.createJoint(
      pl.PrismaticJoint(
        {
          enableLimit: true,
          lowerTranslation: RAIL.vertical.lowerTranslation,
          upperTranslation: RAIL.vertical.upperTranslation,
          enableMotor: false,
          maxMotorForce: 0,
          motorSpeed: 0,
        },
        this.PrismBody,
        this.Head,
        this.Head.getWorldCenter(),
        pl.Vec2(0, -1)
      )
    )
  }

  /** player::jump — one kick straight up plus a shove along the head/torso line. */
  jump() {
    if (!(this.Ass.getWorldCenter().y > m(MOVE.jumpGroundY))) return
    const head = this.Head.getWorldCenter()
    const dir = pl.Vec2(head.x - this.Tors.getWorldCenter().x, head.y - this.Tors.getWorldCenter().y)
    dir.normalize()
    dir.mul(MOVE.jumpBodyImpulse)
    this.Ass.setLinearVelocity(pl.Vec2(0, 0))
    this.Head.setLinearVelocity(pl.Vec2(0, 0))
    this.Head.applyLinearImpulse(pl.Vec2(0, -MOVE.jumpImpulse), this.Head.getWorldCenter(), true)
    this.Head.applyLinearImpulse(dir, this.FingerLeft.getWorldCenter(), true)
    this.Head.applyLinearImpulse(dir, this.FingerRight.getWorldCenter(), true)
    this.Ass.applyLinearImpulse(pl.Vec2(0, -MOVE.jumpImpulse), this.Head.getWorldCenter(), true)
  }

  /**
   * player::turn — sideways movement. On the ground it drives the hips; once the
   * head is high enough it drives the head instead, which is what gives the
   * original its floaty mid-air steering.
   */
  turn(impulse) {
    this.Ass.setLinearVelocity(pl.Vec2(0, 0))
    if (this.Head.getWorldCenter().y * PHYS_SCALE > MOVE.turnHeadSwitchY) {
      this.Ass.applyLinearImpulse(impulse, this.Ass.getWorldCenter(), true)
    } else {
      this.Head.applyLinearImpulse(impulse, this.Head.getWorldCenter(), true)
    }
  }

  /** player::turnComp — the AI's softer variant of turn(). */
  turnComp(impulse) {
    this.Ass.setLinearVelocity(pl.Vec2(0, 0))
    this.Head.setLinearVelocity(pl.Vec2(0, 0))
    if (this.Head.getWorldCenter().y * PHYS_SCALE > MOVE.turnHeadSwitchY) {
      const half = pl.Vec2(impulse.x * 0.5, impulse.y * 0.5)
      this.Head.applyLinearImpulse(half, this.Head.getWorldCenter(), true)
      this.Ass.applyLinearImpulse(half, this.Ass.getWorldCenter(), true)
    } else {
      this.Ass.applyLinearImpulse(impulse, this.Ass.getWorldCenter(), true)
    }
  }

  /** player::turnUp */
  turnUp() {
    if (this.Head.getWorldCenter().y * PHYS_SCALE > MOVE.upHeadY) {
      this.Head.applyLinearImpulse(pl.Vec2(0, -MOVE.upImpulse), this.Head.getWorldCenter(), true)
    }
  }

  /** player::turnDown — stamps both feet downward. */
  turnDown() {
    this.FootLeft.applyLinearImpulse(pl.Vec2(0, MOVE.downImpulse), this.FootLeft.getWorldCenter(), true)
    this.FootRight.applyLinearImpulse(pl.Vec2(0, MOVE.downImpulse), this.FootRight.getWorldCenter(), true)
  }

  /** player::turnHands — lean toward a target body (used by the AI). */
  turnHands(target) {
    const head = this.Head.getWorldCenter()
    const dir = pl.Vec2(target.getWorldCenter().x - head.x, target.getWorldCenter().y - head.y)
    dir.normalize()
    dir.mul(MOVE.handsImpulse)
    this.Head.applyLinearImpulse(dir, head, true)
    this.Head.applyLinearImpulse(dir, head, true)
  }

  /** player::setLinVelZero */
  setLinVelZero() {
    for (const name of Object.keys(this.parts)) this.parts[name].setLinearVelocity(pl.Vec2(0, 0))
    this.PrismBody.setLinearVelocity(pl.Vec2(0, 0))
  }

  /** player::standPlayer — snap back to the upright pose at (x, y) in pixels. */
  standPlayer(x, y) {
    this.setLinVelZero()
    const put = (name, dx, dy) => {
      this.parts[name].setTransform(pl.Vec2(m(x + dx), m(y + dy)), 0)
      this.parts[name].setAngularVelocity(0)
    }
    put('Head', 0, 2)
    put('Tors', 0, 28)
    put('ArmRight', 22, 18)
    put('ArmLeft', -22, 18)
    put('HandRight', 41, 18)
    put('HandLeft', -41, 18)
    put('FingerRight', 54, 18)
    put('FingerLeft', -54, 18)
    put('Ass', 0, 47)
    put('LegLeft', -7, 69)
    put('LegRight', 7, 69)
    put('FootLeft', -7, 90)
    // The original places the right foot at -7 as well; kept so the doll settles
    // out of the same overlap it does there.
    put('FootRight', -7, 90)
    this.setLinVelZero()
  }

  /** The hand the ball is served from: right for player 1, left for player 2. */
  get serveHand() {
    return this.id === 1 ? this.FingerRight : this.FingerLeft
  }

  /** player::takeBall — pin the ball to the serving hand with a revolute joint. */
  takeBall(ballBody) {
    if (ballBody.getJointList() != null) return
    const hand = this.serveHand
    ballBody.setTransform(hand.getWorldCenter(), 0)
    ballBody.setLinearVelocity(pl.Vec2(0, 0))
    ballBody.setAngularVelocity(0)
    this.ballJoint = this.world.createJoint(
      pl.RevoluteJoint(
        { lowerAngle: rad(-SERVE.holdLimitDeg), upperAngle: rad(SERVE.holdLimitDeg) },
        hand,
        ballBody,
        ballBody.getWorldCenter()
      )
    )
  }

  /**
   * player::pas — the serve. Releasing the ball is mostly a flick of the hand:
   * the ball itself only gets a small impulse, the arm does the rest.
   */
  pas(ball) {
    const jointEdge = ball.body.getJointList()
    if (jointEdge == null || jointEdge.joint == null) return
    const onOwnHalf = this.id === 1
      ? ball.body.getWorldCenter().x < SERVE.courtCenterM
      : ball.body.getWorldCenter().x > SERVE.courtCenterM
    if (ball.ballOfPlayer !== this.id || !onOwnHalf) return

    const sign = this.id === 1 ? 1 : -1
    this.world.destroyJoint(jointEdge.joint)
    this.ballJoint = null
    const hand = this.serveHand
    hand.applyLinearImpulse(
      pl.Vec2(sign * SERVE.fingerImpulse.x, SERVE.fingerImpulse.y),
      hand.getWorldCenter(),
      true
    )
    ball.body.applyLinearImpulse(
      pl.Vec2(sign * SERVE.ballImpulse.x, SERVE.ballImpulse.y),
      ball.body.getWorldCenter(),
      true
    )
    ball.ballOfPlayer = 0
    this.contact = 2
    clearTimeout(this.touchTimer)
    this.touchTimer = setTimeout(() => {
      if (this.contact !== 0) this.contact = 3
    }, SERVE.touchDelayMs)
  }
}
