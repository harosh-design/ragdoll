import test from 'node:test'
import assert from 'node:assert/strict'
import * as pl from 'planck'
import { Game, SERVE_CLOCK_MS, FRAME_DT } from '../src/game.js'
import { FLOOR_Y } from '../src/original.js'

const SERVE_FRAMES = Math.ceil(SERVE_CLOCK_MS / 1000 / FRAME_DT) + 1
const run = (game, frames) => { for (let i = 0; i < frames; i++) game.frame() }
const px = (metres) => metres * 30

/** The lowest point of any part of a doll, in stage pixels. */
function soles(player) {
  let y = -Infinity
  for (const body of Object.values(player.parts)) {
    for (let f = body.getFixtureList(); f; f = f.getNext()) y = Math.max(y, f.getAABB(0).upperBound.y)
  }
  return px(y)
}

test('an unserved ball gives the point away when the serve clock runs out', () => {
  const game = new Game({ hazards: false })
  run(game, SERVE_FRAMES)
  assert.deepEqual(game.score, { p1: 0, p2: 1 })
  assert.deepEqual(game.lastPoint, { winner: 2, reason: 'serve' })
})

test('a ball landing on one half scores for the other player', () => {
  const game = new Game({ hazards: false })
  game.world.destroyJoint(game.ball.body.getJointList().joint)
  game.ball.ballOfPlayer = 0
  // Between the net and player 2, clear of both dolls.
  game.ball.body.setTransform(pl.Vec2(400 / 30, 100 / 30), 0)
  run(game, 90)
  assert.deepEqual(game.score, { p1: 1, p2: 0 })
  assert.deepEqual(game.lastPoint, { winner: 1, reason: 'ground' })
})

test('the match ends at pointsToWin and stays over', () => {
  const game = new Game({ hazards: false, pointsToWin: 2 })
  // Nobody serves, so the serve alternates: P2 scores, then P1, then P2.
  for (let frames = 0; !game.winner && frames < 5000; frames++) game.frame()
  assert.equal(game.winner, 2)
  assert.deepEqual(game.score, { p1: 1, p2: 2 })
  run(game, SERVE_FRAMES * 2)
  assert.equal(game.winner, 2)
  assert.deepEqual(game.score, { p1: 1, p2: 2 })
  assert.equal(game.ball.body.getJointList(), null, 'no new serve is set up')
})

test('an endless match never declares a winner', () => {
  const game = new Game({ hazards: false })
  run(game, SERVE_FRAMES * 5)
  assert.equal(game.winner, 0)
  assert.ok(game.score.p1 + game.score.p2 >= 3)
})

test('a bigger doll stands taller on the sand, with the original mass and jump', () => {
  const measure = (playerScale) => {
    const game = new Game({ hazards: false, playerScale })
    game.settle(60)
    const p = game.player2
    const standing = px(p.Head.getWorldCenter().y)
    const mass = Object.values(p.parts).reduce((sum, body) => sum + body.getMass(), 0)
    const sole = soles(p)
    game.frame((g) => g.player2.jump())
    let top = Infinity
    for (let i = 0; i < 45; i++) {
      game.frame()
      top = Math.min(top, px(p.Head.getWorldCenter().y))
    }
    return { standing, mass, sole, rise: standing - top }
  }
  const original = measure(1)
  const bigger = measure(1.2)
  assert.ok(Math.abs(bigger.sole - FLOOR_Y) < 2, `soles on the sand, not at ${bigger.sole}`)
  assert.ok(original.standing - bigger.standing > 12, 'the head stands higher')
  assert.ok(Math.abs(bigger.mass - original.mass) < 1e-9, 'every part keeps its mass')
  assert.ok(bigger.rise > original.rise * 0.8, `still jumps: ${bigger.rise} vs ${original.rise} px`)
})


test('settling moves the dolls without running the serve clock', () => {
  const game = new Game({ hazards: false })
  const hand = game.player1.FingerLeft.getPosition().clone()
  game.settle(30)
  assert.notDeepEqual(game.player1.FingerLeft.getPosition(), hand)
  assert.equal(game.serveClock, SERVE_CLOCK_MS)
  assert.equal(game.ball.ballOfPlayer, 1)
})
