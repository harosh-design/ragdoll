import test from 'node:test'
import assert from 'node:assert/strict'
import * as pl from 'planck'
import { Game } from '../src/game.js'
import { createWorld, createCourt } from '../src/world.js'
import { Spike } from '../src/spike.js'

// Controlled physical experiments isolate penetration depth and cross-section
// from a doll's changing pose, mass and contact with its other limbs.
function experiment(halfHeight, depth) {
  const world = createWorld(), court = createCourt(world)
  const body = world.createDynamicBody(pl.Vec2(320 / 30, (206 - halfHeight) / 30))
  body.createFixture(pl.Box(10 / 30, halfHeight / 30), 1)
  body.setMassData({ mass: 2.75, center: pl.Vec2(), I: 1 })
  const player = { parts: { Tors: body } }
  body.setUserData({ player })
  const spike = new Spike(world, court.net, [player])
  spike.pierce(body)
  body.setPosition(pl.Vec2(320 / 30, (206 - halfHeight + depth) / 30))
  spike.update()
  let attempts = 0
  while (spike.pins.size && attempts < 150) {
    spike.jump(player, 4)
    attempts++
    for (let i = 0; i < 15 && spike.pins.size; i++) {
      spike.beforeStep(1 / 28)
      world.step(1 / 28, 10, 10)
      spike.update()
    }
  }
  assert.equal(spike.pins.size, 0, 'repeated jumps eventually free the body')
  return attempts
}

test('deeper penetration and larger body cross-sections require more jumps to escape', () => {
  const shallowHand = experiment(4, 2)
  const deepHand = experiment(4, 25)
  const shallowTorso = experiment(17, 2)
  const deepTorso = experiment(17, 25)
  assert.ok(deepHand > shallowHand)
  assert.ok(shallowTorso > shallowHand)
  assert.ok(deepTorso > deepHand)
  assert.ok(deepTorso > shallowTorso)
})

test('actual doll contacts pierce the tip, remain finite under input and reset safely', () => {
  const game = new Game({ hazards: false })
  game.settle(30)
  let caught = false, jumpWhileCaught = false
  for (let i = 0; i < 450; i++) {
    game.frame(g => {
      g.player1.turn(pl.Vec2(4, 0))
      if (i % 15 === 0) {
        jumpWhileCaught ||= g.spike.caught(g.player1).length > 0
        g.player1.jump()
      }
    })
    caught ||= game.spike.pins.size > 0
    for (const player of [game.player1, game.player2]) for (const body of Object.values(player.parts)) {
      assert.ok(Number.isFinite(body.getPosition().x) && Number.isFinite(body.getPosition().y))
    }
  }
  assert.ok(caught)
  assert.ok(jumpWhileCaught)
  game.newRound()
  assert.equal(game.spike.pins.size, 0)
  assert.equal(game.spike.pending.size, 0)
})

test('solid ball hits bounce off the spike without attaching to it', () => {
  const game = new Game({ hazards: false })
  game.world.destroyJoint(game.ball.body.getJointList().joint)
  game.ball.ballOfPlayer = 0
  game.ball.body.setPosition(pl.Vec2(320 / 30, 175 / 30))
  game.ball.body.setLinearVelocity(pl.Vec2(0, 5))
  let bounced = false
  for (let i = 0; i < 15; i++) {
    game.frame()
    bounced ||= game.ball.body.getLinearVelocity().y < 0
  }
  assert.ok(bounced)
  assert.equal(game.ball.body.getJointList(), null)
})
