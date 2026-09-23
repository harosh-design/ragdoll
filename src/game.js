import * as pl from 'planck'
import {
  PHYS_SCALE, TIME_STEP, TIME_STEP_GOAL, FRAME_RATE, ITERATIONS,
  SPAWN, FLOOR_Y, NET_X, GRAVITY_Y,
} from './original.js'
import { createWorld, createCourt, Ball, attachContactRules, BODY_HAZARD } from './world.js'
import { Player } from './player.js'

const m = (px) => px / PHYS_SCALE

/** The original runs one Step per stage frame at 30 fps. */
export const FRAME_DT = 1 / FRAME_RATE
const FRAME_MS = FRAME_DT * 1000

/** game ctor: 200 ms before the same player can register a new touch. */
const CONTACT_DEBOUNCE_MS = 200
/** game ctor: 2 s of goal replay, then the next round. */
const GOAL_DELAY_MS = 2000
/** game ctor: Timer(1000, 6) — six seconds to get the serve away. */
const SERVE_CLOCK_MS = 6000
/** game::update decides the point on which side of 10.6 m the ball landed. */
const COURT_CENTER_M = 10.6

/** The friction value that identifies each player's parts, as in game::update. */
const FRICTION_OF = { 0.5: 1, 0.51: 2 }

const TARGET_RADIUS = 12
const DISK_SPEED = m(9)
const DISK_LIFETIME_MS = 60000

/**
 * The rally rules from the original's `game` class, kept apart from anything
 * that touches the DOM so the simulation can be run and measured on its own.
 */
export class Game {
  constructor(options = {}) {
    this.gravityY = options.gravityY ?? GRAVITY_Y
    this.baseTimeStep = options.timeStep ?? TIME_STEP
    this.ballTouchImpulse = options.ballTouchImpulse ?? 1
    this.diskSize = options.diskSize ?? 15
    this.hazardsEnabled = options.hazards !== false

    this.world = createWorld(this.gravityY)
    this.court = createCourt(this.world)
    this.ball = new Ball(this.world)
    this.player1 = new Player(this.world, this.court.groundBody, SPAWN.p1.x, SPAWN.p1.y, 1)
    this.player2 = new Player(this.world, this.court.groundBody, SPAWN.p2.x, SPAWN.p2.y, 2)

    this.score = { p1: 0, p2: 0 }
    /** The original's win1: true when player 1 took the last point, so serves. */
    this.win1 = true
    this.onBallDown = false
    this.bContact1 = false
    this.bContact2 = false
    this.contactTimer1 = 0
    this.contactTimer2 = 0
    this.goalTimer = 0
    this.serveClock = SERVE_CLOCK_MS
    this.disableUpdate = false
    this.timeStep = this.baseTimeStep
    this.targets = []
    this.disks = []
    /** Bodies cannot be created while the world is stepping, so spawns queue up. */
    this.pendingDisks = []

    attachContactRules(this.world, this.ball, (event) => {
      if (event === 'ground') this.onBallDown = true
    })

    if (this.hazardsEnabled) this.createTargets()

    this.player1.takeBall(this.ball.body)
    this.ball.ballOfPlayer = 1
  }

  /** One stage frame: step, then input, then the rules, then the ball clamps. */
  frame(applyInput) {
    this.world.step(this.timeStep, ITERATIONS, ITERATIONS)
    while (this.pendingDisks.length) this.spawnDisk(this.pendingDisks.shift())
    if (!this.disableUpdate) applyInput?.(this)
    this.updateRules(FRAME_MS)
    this.updateDisks(FRAME_MS)
    this.ball.update()
  }

  /** Which player, if either, the ball is resting against this frame. */
  ballTouchedPlayer() {
    for (let edge = this.ball.body.getContactList(); edge; edge = edge.next) {
      const contact = edge.contact
      if (!contact.isTouching()) continue
      const id = FRICTION_OF[contact.getFixtureA().getFriction()]
        ?? FRICTION_OF[contact.getFixtureB().getFriction()]
      if (id) return id
    }
    return 0
  }

  scorePoint(winner) {
    if (winner === 1) { this.score.p1 += 1; this.win1 = true } else { this.score.p2 += 1; this.win1 = false }
    this.player1.contact = 0
    this.player2.contact = 0
    this.disableUpdate = true
    this.timeStep = TIME_STEP_GOAL
    this.goalTimer = GOAL_DELAY_MS
  }

  newRound() {
    this.player1.standPlayer(SPAWN.p1.x, SPAWN.p1.y)
    this.player2.standPlayer(SPAWN.p2.x, SPAWN.p2.y)
    this.player1.contact = 0
    this.player2.contact = 0
    const edge = this.ball.body.getJointList()
    if (edge) this.world.destroyJoint(edge.joint)
    this.ball.body.setLinearVelocity(pl.Vec2(0, 0))
    this.ball.body.setAngularVelocity(0)
    if (this.win1) {
      this.player1.takeBall(this.ball.body)
      this.ball.ballOfPlayer = 1
    } else {
      this.player2.takeBall(this.ball.body)
      this.ball.ballOfPlayer = 2
    }
    this.serveClock = SERVE_CLOCK_MS
    this.disableUpdate = false
    this.timeStep = this.baseTimeStep
    this.onBallDown = false
  }

  /**
   * game::update — a touch pops the ball up, a fourth touch by the same player
   * gives the point away, and the floor ends the rally.
   */
  updateRules(dtMs) {
    this.contactTimer1 = Math.max(0, this.contactTimer1 - dtMs)
    this.contactTimer2 = Math.max(0, this.contactTimer2 - dtMs)
    if (this.contactTimer1 === 0) this.bContact1 = false
    if (this.contactTimer2 === 0) this.bContact2 = false

    if (this.disableUpdate) {
      this.goalTimer -= dtMs
      if (this.goalTimer <= 0) this.newRound()
      return
    }

    if (this.ball.ballOfPlayer === 0) {
      const id = this.ballTouchedPlayer()
      if (id === 1 && !this.bContact1) {
        this.player1.contact += 1
        this.player2.contact = 0
        this.popBall()
        this.bContact1 = true
        this.contactTimer1 = CONTACT_DEBOUNCE_MS
      } else if (id === 2 && !this.bContact2) {
        this.player2.contact += 1
        this.player1.contact = 0
        this.popBall()
        this.bContact2 = true
        this.contactTimer2 = CONTACT_DEBOUNCE_MS
      }
    } else {
      this.player1.contact = 0
      this.player2.contact = 0
      this.serveClock -= dtMs
      if (this.serveClock <= 0) {
        const edge = this.ball.body.getJointList()
        if (edge) this.world.destroyJoint(edge.joint)
        const server = this.ball.ballOfPlayer
        this.ball.ballOfPlayer = 0
        this.scorePoint(server === 1 ? 2 : 1)
        return
      }
    }

    if (this.player1.contact > 3) { this.scorePoint(2); return }
    if (this.player2.contact > 3) { this.scorePoint(1); return }

    if (this.onBallDown) {
      this.onBallDown = false
      if (!this.ball.body.getJointList()) {
        this.scorePoint(this.ball.body.getWorldCenter().x < COURT_CENTER_M ? 2 : 1)
      }
    }
  }

  /** The upward nudge every fresh player touch gives the ball. */
  popBall() {
    if (this.ball.body.getJointList()) return
    this.ball.body.applyLinearImpulse(
      pl.Vec2(0, -this.ballTouchImpulse),
      this.ball.body.getWorldCenter(),
      true
    )
  }

  // --- hazards kept from this project; not part of the original game ---
  createTargets() {
    for (const [side, x] of [['p1', 120], ['p2', 520]]) {
      const body = this.world.createBody({ position: pl.Vec2(m(x), m(FLOOR_Y - 75)) })
      body.createFixture({ shape: pl.Circle(m(TARGET_RADIUS)), isSensor: true, density: 0 })
      body.setUserData({ bodyType: 0, target: true, side })
      this.targets.push({ body, side })
    }
    this.world.on('begin-contact', (contact) => {
      const a = contact.getFixtureA().getBody()
      const b = contact.getFixtureB().getBody()
      if (a !== this.ball.body && b !== this.ball.body) return
      const data = (a === this.ball.body ? b : a).getUserData()
      if (data?.target) this.pendingDisks.push(data.side)
    })
  }

  spawnDisk(side) {
    const body = this.world.createBody({
      type: 'kinematic',
      position: pl.Vec2(m(side === 'p1' ? 160 : 480), m(FLOOR_Y - 130)),
      linearVelocity: pl.Vec2(side === 'p1' ? -DISK_SPEED : DISK_SPEED, 0),
      angularVelocity: 3,
    })
    body.createFixture({ shape: pl.Circle(m(this.diskSize)), density: 1, friction: 0.3, restitution: 1 })
    body.setUserData({ bodyType: BODY_HAZARD, disk: true, side })
    this.disks.push({ body, side, age: 0 })
  }

  updateDisks(dtMs) {
    for (let i = this.disks.length - 1; i >= 0; i--) {
      const disk = this.disks[i]
      disk.age += dtMs
      if (disk.age >= DISK_LIFETIME_MS) {
        this.world.destroyBody(disk.body)
        this.disks.splice(i, 1)
        continue
      }
      const x = disk.body.getPosition().x * PHYS_SCALE
      if (disk.side === 'p1') {
        if (x <= 30) disk.body.setLinearVelocity(pl.Vec2(DISK_SPEED, 0))
        else if (x >= NET_X - 30) disk.body.setLinearVelocity(pl.Vec2(-DISK_SPEED, 0))
      } else {
        if (x >= 610) disk.body.setLinearVelocity(pl.Vec2(-DISK_SPEED, 0))
        else if (x <= NET_X + 30) disk.body.setLinearVelocity(pl.Vec2(DISK_SPEED, 0))
      }
    }
  }
}
