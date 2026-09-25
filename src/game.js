import * as pl from 'planck'
import {
  TIME_STEP, TIME_STEP_GOAL, FRAME_RATE, ITERATIONS,
  SPAWN, GRAVITY_Y,
} from './original.js'
import { createWorld, createCourt, Ball, BODY_PLAYER, attachContactRules } from './world.js'
import { Player } from './player.js'
import { Hazards } from './hazards.js'
import { Spike } from './spike.js'
import { Bot } from './bot.js'
import { normalizeCharacters } from './roster.js'

/** The original runs one Step per stage frame at 30 fps. */
export const FRAME_DT = 1 / FRAME_RATE
const FRAME_MS = FRAME_DT * 1000

/** game ctor: 200 ms before the same player can register a new touch. */
const CONTACT_DEBOUNCE_MS = 200
/** game ctor: 2 s of goal replay, then the next round. */
const GOAL_DELAY_MS = 2000
/** game ctor: Timer(1000, 6) — six seconds to get the serve away. */
export const SERVE_CLOCK_MS = 6000
/** game::update decides the point on which side of 10.6 m the ball landed. */
const COURT_CENTER_M = 10.6

/**
 * The rally rules from the original's `game` class, kept apart from anything
 * that touches the DOM so the simulation can be run and measured on its own.
 */
export class Game {
  constructor(options = {}) {
    this.gravityY = options.gravityY ?? GRAVITY_Y
    this.baseTimeStep = options.timeStep ?? TIME_STEP
    this.ballTouchImpulse = options.ballTouchImpulse ?? 1
    this.servePower = options.servePower ?? 1
    this.arena = options.arena === 'beach' ? 'beach' : 'side'
    this.hazardsEnabled = options.hazards !== false
    /** First to this many points takes the match; 0 plays on forever, like the original. */
    this.pointsToWin = options.pointsToWin ?? 0
    /** Doll size against the original's 1; see Player. */
    this.playerScale = options.playerScale ?? 1
    this.mode = options.mode === 'bot' ? 'bot' : 'humans'
    this.bot = this.mode === 'bot' ? new Bot(2) : null
    this.characters = normalizeCharacters(options.characters)

    this.world = createWorld(this.gravityY)
    this.court = createCourt(this.world)
    this.ball = new Ball(this.world)
    this.player1 = new Player(this.world, this.court.groundBody, SPAWN.p1.x, SPAWN.p1.y, 1, this.playerScale)
    this.player2 = new Player(this.world, this.court.groundBody, SPAWN.p2.x, SPAWN.p2.y, 2, this.playerScale)

    this.player1.servePower = this.servePower
    this.player2.servePower = this.servePower
    this.spike = new Spike(this.world, this.court.net, [this.player1, this.player2])

    this.score = { p1: 0, p2: 0 }
    /** Who won the last point and why: 'ground', 'touches' or 'serve'. */
    this.lastPoint = null
    /** 1 or 2 once the match is won; the world then keeps running in slow motion. */
    this.winner = 0
    /** Changes when bodies are teleported for the next serve. */
    this.roundIndex = 0
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

    attachContactRules(this.world, this.ball, (event) => {
      if (event === 'ground') this.onBallDown = true
    })

    this.hazards = this.hazardsEnabled
      ? new Hazards(this.world, this.ball, [this.player1, this.player2], () => !this.disableUpdate)
      : null
    this.targets = this.hazards?.buttons ?? []
    this.disks = this.hazards?.executers ?? []

    this.player1.takeBall(this.ball.body)
    this.ball.ballOfPlayer = 1
  }

  /**
   * Step the world alone, so the dolls fall out of their spawn T-pose before
   * anyone sees them. The rules and the serve clock do not run.
   */
  settle(frames) {
    for (let i = 0; i < frames; i++) this.world.step(this.timeStep, ITERATIONS, ITERATIONS)
  }

  /** One stage frame: step, then input, then the rules, then the ball clamps. */
  frame(applyInput) {
    this.spike.beforeStep(this.timeStep)
    this.world.step(this.timeStep, ITERATIONS, ITERATIONS)
    this.spike.update()
    this.player1.servePower = this.servePower
    this.player2.servePower = this.servePower
    this.player1.updateServeContact(FRAME_MS)
    this.player2.updateServeContact(FRAME_MS)
    if (!this.disableUpdate) {
      applyInput?.(this)
      this.bot?.update(this)
    }
    this.updateRules(FRAME_MS)
    this.hazards?.update(FRAME_MS)
    this.ball.update()
  }

  /** Which player, if either, the ball is resting against this frame. */
  ballTouchedPlayer() {
    for (let edge = this.ball.body.getContactList(); edge; edge = edge.next) {
      const contact = edge.contact
      if (!contact.isTouching()) continue
      for (const fixture of [contact.getFixtureA(), contact.getFixtureB()]) {
        const data = fixture.getBody().getUserData()
        if (data?.bodyType === BODY_PLAYER && (data.player?.id === 1 || data.player?.id === 2)) {
          return data.player.id
        }
      }
    }
    return 0
  }

  scorePoint(winner, reason) {
    if (winner === 1) { this.score.p1 += 1; this.win1 = true } else { this.score.p2 += 1; this.win1 = false }
    this.lastPoint = { winner, reason }
    this.player1.contact = 0
    this.player2.contact = 0
    this.player1.serveContactMs = this.player2.serveContactMs = 0
    this.disableUpdate = true
    this.timeStep = TIME_STEP_GOAL
    this.goalTimer = GOAL_DELAY_MS
  }

  /** 1 or 2 once someone has reached pointsToWin, otherwise 0. */
  matchWinner() {
    if (!this.pointsToWin) return 0
    if (this.score.p1 >= this.pointsToWin) return 1
    if (this.score.p2 >= this.pointsToWin) return 2
    return 0
  }

  newRound() {
    this.roundIndex += 1
    this.spike.clear()
    this.bContact1 = this.bContact2 = false
    this.contactTimer1 = this.contactTimer2 = 0
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
      if (this.winner) return
      this.goalTimer -= dtMs
      if (this.goalTimer <= 0) {
        // The replay of a match-winning point runs out into the result instead of a new serve.
        this.winner = this.matchWinner()
        if (!this.winner) this.newRound()
      }
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
        this.scorePoint(server === 1 ? 2 : 1, 'serve')
        return
      }
    }

    if (this.player1.contact > 3) { this.scorePoint(2, 'touches'); return }
    if (this.player2.contact > 3) { this.scorePoint(1, 'touches'); return }

    if (this.onBallDown) {
      this.onBallDown = false
      if (!this.ball.body.getJointList()) {
        this.scorePoint(this.ball.body.getWorldCenter().x < COURT_CENTER_M ? 2 : 1, 'ground')
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

}
