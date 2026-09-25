import test from 'node:test'
import assert from 'node:assert/strict'
import * as pl from 'planck'
import { Game, FRAME_DT } from '../src/game.js'
import { createFixedStepClock } from '../src/fixed-step.js'
import { createPresentation } from '../src/presentation.js'
import { normalizeSettings, ORIGINAL_DEFAULTS } from '../src/settings-model.js'

test('contacts use tagged player bodies even when fixture friction changes', () => {
  const game = new Game({ hazards: false })
  const ballFixture = game.ball.body.getFixtureList()
  const playerFixture = game.player2.Head.getFixtureList()
  const wallFixture = game.court.leftWall.getFixtureList()
  playerFixture.setFriction(0.9)
  wallFixture.setFriction(0.5)
  const contact = (other) => ({
    contact: {
      isTouching: () => true,
      getFixtureA: () => ballFixture,
      getFixtureB: () => other,
    },
    next: null,
  })
  game.ball.body.getContactList = () => contact(playerFixture)
  assert.equal(game.ballTouchedPlayer(), 2)
  game.ball.body.getContactList = () => contact(wallFixture)
  assert.equal(game.ballTouchedPlayer(), 0)
})

test('fixed clock caps catch-up work and preserves a fractional frame', () => {
  const clock = createFixedStepClock(FRAME_DT)
  let ticks = 0
  assert.equal(clock.advance(FRAME_DT * 2.5, () => ticks++), 2)
  assert.equal(ticks, 2)
  assert.ok(Math.abs(clock.alpha - 0.5) < 1e-8)
  assert.equal(clock.advance(10, () => ticks++), 5)
  assert.equal(ticks, 7)
  assert.ok(clock.alpha >= 0 && clock.alpha < 1)
  clock.reset()
  assert.equal(clock.alpha, 0)
})

test('presentation caches body geometry and can reset after a round teleport', () => {
  const world = new pl.World({ gravity: pl.Vec2(0, 0) })
  const body = world.createBody({ position: pl.Vec2(2, 3) })
  body.createFixture(pl.Circle(0.5))
  const presentation = createPresentation()
  presentation.capture(world)
  body.setTransform(pl.Vec2(4, 3), 0)
  const old = presentation.view(body, 0)
  const middle = presentation.view(body, 0.5)
  const current = presentation.view(body, 1)
  assert.ok(Math.abs(middle.position[0] - (old.position[0] + current.position[0]) / 2) < 1e-9)
  assert.equal(old.shapes, current.shapes)
  presentation.capture(world)
  assert.deepEqual(presentation.view(body, 0).position, current.position)
})

test('settings schema accepts valid tuning and rejects corrupt stored values', () => {
  const settings = normalizeSettings({
    gravityY: 12,
    ballMaxVX: Infinity,
    playerScale: -3,
    arena: 'beach',
    unknown: 42,
  })
  assert.equal(settings.gravityY, 12)
  assert.equal(settings.arena, 'beach')
  assert.equal(settings.ballMaxVX, ORIGINAL_DEFAULTS.ballMaxVX)
  assert.equal(settings.playerScale, ORIGINAL_DEFAULTS.playerScale)
  assert.equal('unknown' in settings, false)
  assert.deepEqual(normalizeSettings([]), ORIGINAL_DEFAULTS)
})
