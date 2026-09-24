import * as pl from 'planck'
import { BALL, COURT, FLOOR_Y, LEFT_WALL_X, RIGHT_WALL_X, NET_X, PHYS_SCALE, MOVE, SPAWN, FRAME_RATE } from './original.js'

const m = (px) => px / PHYS_SCALE
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const NET = m(NET_X)
const FRAME_DT = 1 / FRAME_RATE

/** Predict a descending interception, including the net and side-wall bounces. */
export function predictInterception(game, strikeY, side = 2) {
  const p = game.ball.body.getPosition()
  const v = game.ball.body.getLinearVelocity()
  let x = p.x, y = p.y, vx = v.x, vy = v.y
  const radius = m(BALL.radius)
  const left = m(LEFT_WALL_X) + radius
  const right = m(RIGHT_WALL_X) - radius
  const netTop = m(COURT.net.y - COURT.net.hy) - radius
  const dt = 1 / 60
  for (let t = 0; t < 2.5; t += dt) {
    const oldX = x
    vy = clamp(vy + game.gravityY * dt, -BALL.maxVY, BALL.maxVY)
    x += vx * dt
    y += vy * dt
    if (x < left || x > right) {
      x = clamp(x, left, right)
      vx *= -0.6
    }
    if (y > netTop && Math.abs(x - NET) < radius + m(COURT.net.hx)) {
      x = NET + Math.sign(oldX - NET || 1) * (radius + m(COURT.net.hx))
      vx *= -0.6
    }
    const ownHalf = side === 2 ? x > NET : x < NET
    if (ownHalf && y >= strikeY && vy > 0) return { x, y, time: t + dt }
    if (y > m(FLOOR_Y) - radius) break
  }
  return null
}

/** A controller only: no teleporting, direct ball impulses or physics bonuses. */
export class Bot {
  constructor(id = 2) {
    this.id = id
    this.reaction = 0
    this.jumpCooldown = 0
    this.targetX = null
    this.lastServeClock = 0
    this.serveElapsed = 0
  }

  update(game) {
    if (game.disableUpdate || game.winner) return
    const player = this.id === 1 ? game.player1 : game.player2
    const head = player.Head.getPosition()
    const velocity = player.Head.getLinearVelocity()
    const spawn = SPAWN[`p${this.id}`]
    const standingY = player.at(spawn.x, spawn.y, 0, 2).y - 0.2
    const towardNet = this.id === 2 ? -1 : 1
    const lo = this.id === 2 ? NET + 1.9 : m(LEFT_WALL_X) + 1.4
    const hi = this.id === 2 ? m(RIGHT_WALL_X) - 1.4 : NET - 1.9
    this.jumpCooldown = Math.max(0, this.jumpCooldown - FRAME_DT)

    if (game.ball.ballOfPlayer) {
      // Every new serve resets the reaction state, including consecutive points.
      if (game.serveClock > this.lastServeClock) {
        this.reaction = 0
        this.jumpCooldown = 0
        this.targetX = head.x
        this.serveElapsed = 0
      }
      this.lastServeClock = game.serveClock
      if (game.ball.ballOfPlayer !== this.id) return
      const elapsed = this.serveElapsed += FRAME_DT
      if (elapsed >= 0.45 && elapsed < 0.8 && !this.jumpCooldown) {
        player.jump()
        this.jumpCooldown = 0.8
      }
      if (elapsed >= 0.72) player.pas(game.ball)
      return
    }
    this.lastServeClock = 0

    // A small reaction delay and an imperfect forecast leave room to beat it.
    this.reaction -= FRAME_DT
    if (this.reaction <= 0) {
      this.reaction = 0.13
      const hit = predictInterception(game, standingY - 1.35, this.id)
      // Stand just behind the ball so contact sends it back toward the net.
      this.targetX = hit ? clamp(hit.x - towardNet * 0.65 * player.scale, lo, hi) : m(spawn.x)
    }
    const dx = this.targetX - head.x
    const desiredVX = clamp(dx * 4, -7, 7)
    const error = desiredVX - velocity.x
    if (Math.abs(dx) > 0.12 || Math.abs(velocity.x) > 0.7) {
      if (Math.abs(error) > 0.6) player.turn(pl.Vec2(clamp(error * 0.45, -1, 1) * MOVE.turnImpulse, 0))
    }

    const ball = game.ball.body.getPosition()
    const ballV = game.ball.body.getLinearVelocity()
    const ownHalf = this.id === 2 ? ball.x > NET : ball.x < NET
    const soonX = ball.x + ballV.x * 0.16
    const soonY = ball.y + ballV.y * 0.16 + game.gravityY * 0.0128
    if (ownHalf && !this.jumpCooldown && Math.abs(soonX - head.x) < 1.6
      && soonY > standingY - 2.5 && soonY < standingY + 0.5) {
      player.jump()
      this.jumpCooldown = 0.7
    }
  }
}
