import * as pl from 'planck'
import { PHYS_SCALE, BALL } from './original.js'

const m = px => px / PHYS_SCALE

// Verified against prizeButton / executer in the original SWF. See
// docs/hazards-source.md for bytecode evidence and intentional differences.
export const PRIZE_BUTTON = { leftX: -211, rightX: 837, y: -245, hx: 3, hy: 35, cooldownMs: 2000 }
export const EXECUTER = { mass: 400, inertia: 0.1, friction: 0.3, restitution: 1, speed: 1.3, lifeMs: 25000 }
export const BODY_BUTTON = 7
export const BODY_EXECUTER = 777

export class Hazards {
  constructor(world, ball, players, isPlaying) {
    this.world = world
    this.players = players
    this.buttons = []
    this.executers = []
    this.pending = null
    this.cooldown = 0
    for (const [index, x] of [PRIZE_BUTTON.leftX, PRIZE_BUTTON.rightX].entries()) {
      const side = index + 1
      const body = world.createBody({ position: pl.Vec2(m(x), m(PRIZE_BUTTON.y)) })
      body.createFixture({ shape: pl.Box(m(PRIZE_BUTTON.hx), m(PRIZE_BUTTON.hy)), friction: 0.4 })
      body.setUserData({ bodyType: BODY_BUTTON, button: true, side })
      this.buttons.push({ body, side })
    }
    world.on('post-solve', contact => {
      const a = contact.getFixtureA().getBody(), b = contact.getFixtureB().getBody()
      if (a !== ball.body && b !== ball.body) return
      const data = (a === ball.body ? b : a).getUserData()
      if (data?.button && !this.cooldown && !this.pending && !ball.ballOfPlayer && isPlaying()) {
        this.pending = data.side
      }
    })
  }

  spawn(side) {
    const body = this.world.createBody({
      type: 'dynamic', position: pl.Vec2(side === 1 ? 3.5 : 17.5, -4),
      angularDamping: 0, linearDamping: 0,
    })
    body.createFixture({ shape: pl.Circle(m(BALL.radius)), density: 1,
      friction: EXECUTER.friction, restitution: EXECUTER.restitution })
    body.setMassData({ mass: EXECUTER.mass, center: pl.Vec2(), I: EXECUTER.inertia })
    body.setUserData({ bodyType: BODY_EXECUTER, side })
    const executer = { body, side, age: 0, target: this.players[side - 1] }
    this.executers.push(executer)
    return executer
  }

  update(dtMs) {
    this.cooldown = Math.max(0, this.cooldown - dtMs)
    for (let i = this.executers.length - 1; i >= 0; i--) {
      const ex = this.executers[i]
      ex.age += dtMs
      if (ex.age >= EXECUTER.lifeMs) {
        this.world.destroyBody(ex.body)
        this.executers.splice(i, 1)
      }
    }
    if (this.pending !== null) {
      this.spawn(this.pending)
      this.pending = null
      this.cooldown = PRIZE_BUTTON.cooldownMs
    }
    // Original level 1: velocity assignment after Step, no made-up patrol or bursts.
    for (const { body, target } of this.executers) {
      const p = body.getWorldCenter()
      const dir = pl.Vec2(target.Tors.getWorldCenter().x - p.x, target.Head.getWorldCenter().y - p.y)
      dir.normalize()
      dir.mul(EXECUTER.speed)
      body.setLinearVelocity(dir)
    }
  }
}
