import test from 'node:test'
import assert from 'node:assert/strict'
import * as pl from 'planck'
import { Game, FRAME_DT, SERVE_CLOCK_MS } from '../src/game.js'
import { NET_X, PHYS_SCALE } from '../src/original.js'

const run = (game, frames) => { for (let i = 0; i < frames; i++) game.frame() }
const create = (options = {}) => {
  const game = new Game({ mode: 'bot', hazards: false, playerScale: 1.15, ...options })
  game.settle(30)
  return game
}

test('human mode leaves both players controlled only by input', () => {
  const game = create({ mode: 'humans' })
  assert.equal(game.bot, null)
  game.win1 = false
  game.newRound()
  run(game, 45)
  assert.equal(game.ball.ballOfPlayer, 2, 'P2 does not serve itself')
  game.frame((g) => g.player2.pas(g.ball))
  assert.equal(game.ball.ballOfPlayer, 0, 'P2 can still serve manually')
  assert.equal(new Game({ hazards: false }).mode, 'humans', 'existing callers keep two human players')
})

test('bot waits for the human serve and does not take it over', () => {
  const game = create()
  run(game, 90)
  assert.equal(game.ball.ballOfPlayer, 1)
  assert.deepEqual(game.score, { p1: 0, p2: 0 })
  assert.equal(game.player2.contact, 0)
})

test('bot jumps, serves before the deadline, and sends the serve across the net', () => {
  const game = create()
  game.win1 = false
  game.newRound()
  const startY = game.player2.Head.getPosition().y
  let servedAt = null, crossed = false, jumped = false
  for (let i = 0; i < 70 && !game.disableUpdate; i++) {
    game.frame()
    if (!game.ball.ballOfPlayer && servedAt === null) servedAt = i * FRAME_DT * 1000
    if (game.player2.Head.getPosition().y < startY - 1) jumped = true
    if (game.ball.body.getPosition().x < NET_X / PHYS_SCALE) crossed = true
  }
  assert.ok(servedAt > 300 && servedAt < SERVE_CLOCK_MS)
  assert.ok(jumped, 'serve uses a real jump')
  assert.ok(crossed, 'serve clears the net')
})

test('bot intercepts and returns an incoming ball using the ragdoll', () => {
  for (const playerScale of [1, 1.15, 1.5]) {
    const game = create({ playerScale })
    game.world.destroyJoint(game.ball.body.getJointList().joint)
    game.ball.ballOfPlayer = 0
    game.ball.body.setTransform(pl.Vec2(13, 2), 0)
    game.ball.body.setLinearVelocity(pl.Vec2(3, 1))
    let touched = false, returned = false
    for (let i = 0; i < 210 && !game.disableUpdate; i++) {
      game.frame()
      if (game.player2.contact > 0) touched = true
      if (touched && game.ball.body.getPosition().x < NET_X / PHYS_SCALE) returned = true
    }
    assert.ok(touched, `bot reaches the ball at scale ${playerScale}`)
    assert.ok(returned, `bot returns the ball at scale ${playerScale}`)
  }
})

test('point replay blocks bot input and the next round gets a fresh serve', () => {
  const game = create()
  game.scorePoint(2, 'ground')
  let calls = 0
  const update = game.bot.update.bind(game.bot)
  game.bot.update = (g) => { calls++; update(g) }
  run(game, 30)
  assert.equal(calls, 0, 'no bot actions during point replay')
  run(game, 35)
  assert.equal(game.ball.ballOfPlayer, 2, 'next serve remains held during preparation')
  run(game, 25)
  assert.equal(game.ball.ballOfPlayer, 0, 'next serve is released automatically')
  game.scorePoint(2, 'ground')
  run(game, 90)
  assert.equal(game.ball.ballOfPlayer, 0, 'consecutive bot points also get a new serve')
})
