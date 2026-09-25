import test from 'node:test'
import assert from 'node:assert/strict'
import * as pl from 'planck'
import { Game } from '../src/game.js'
import { BALL, PARTS, SERVE } from '../src/original.js'
import { EXECUTER, PRIZE_BUTTON } from '../src/hazards.js'

function fireAtButton(game, side) {
  const joint = game.ball.body.getJointList()
  if (joint) game.world.destroyJoint(joint.joint)
  game.ball.ballOfPlayer = 0
  const p = game.targets.find(t => t.side === side).body.getPosition()
  game.ball.body.setPosition(pl.Vec2(p.x + (side === 1 ? 0.8 : -0.8), p.y))
  game.ball.body.setLinearVelocity(pl.Vec2(side === 1 ? -10 : 10, 0))
  for (let i = 0; i < 4; i++) game.frame()
}

test('physical wall buttons immediately release a ball-sized executer at the correct player', () => {
  for (const side of [1, 2]) {
    const game = new Game()
    fireAtButton(game, side)
    assert.equal(game.disks.length, 1)
    const ex = game.disks[0]
    assert.equal(ex.side, side)
    assert.equal(ex.target.id, side)
    assert.equal(ex.body.getType(), 'dynamic')
    assert.equal(ex.body.getMass(), 400)
    assert.equal(ex.body.getFixtureList().getShape().getRadius(), BALL.radius / 30)
    assert.equal(ex.body.getUserData().bodyType, 777)
    assert.equal(game.targets[0].body.getFixtureList().isSensor(), false)
    assert.ok(Math.abs(ex.body.getLinearVelocity().length() - EXECUTER.speed) < 1e-9)
    const p = ex.body.getPosition(), v = ex.body.getLinearVelocity()
    assert.ok(v.x * (ex.target.Tors.getPosition().x - p.x) + v.y * (ex.target.Head.getPosition().y - p.y) > 0)
  }
})

test('button cooldown prevents duplicates, expires after two seconds and executers live 25 seconds', () => {
  const game = new Game()
  fireAtButton(game, 1)
  fireAtButton(game, 2)
  assert.equal(game.disks.length, 1)
  game.hazards.update(PRIZE_BUTTON.cooldownMs)
  fireAtButton(game, 2)
  assert.equal(game.disks.length, 2)
  assert.equal(game.disks[1].side, 2)
  game.hazards.update(EXECUTER.lifeMs)
  assert.equal(game.disks.length, 0)
})

test('changing serve power scales both hand and ball impulses, mirrored for either server', () => {
  for (const side of [1, 2]) for (const power of [0.25, 1, 2.5]) {
    const game = new Game({ hazards: false, servePower: power })
    game.win1 = side === 1
    game.newRound()
    const player = side === 1 ? game.player1 : game.player2
    const before = player.serveHand.getLinearVelocity().clone()
    player.pas(game.ball)
    const v = game.ball.body.getLinearVelocity()
    assert.ok(Math.abs(v.x - (side === 1 ? 1 : -1) * SERVE.ballImpulse.x * power / BALL.mass) < 1e-9)
    assert.ok(Math.abs(v.y - SERVE.ballImpulse.y * power / BALL.mass) < 1e-9)
    assert.ok(Math.abs(player.serveHand.getLinearVelocity().y - before.y - SERVE.fingerImpulse.y * power / player.serveHand.getMass()) < 1e-9)
    assert.equal(game.ball.ballOfPlayer, 0)
  }
})

test('forearm length and joint chain are shortened 15%, with unchanged upper arms and mass', () => {
  const g = new Game({ hazards: false })
  const p = g.player2
  const width = b => { const xs = b.getFixtureList().getShape().m_vertices.map(v => v.x); return Math.max(...xs) - Math.min(...xs) }
  assert.ok(Math.abs(width(p.HandRight) / width(p.ArmRight) - 0.85) < 1e-9)
  assert.ok(Math.abs(p.HandRight.getMass() - p.ArmRight.getMass()) < 1e-9)
  const finger = PARTS.find(p => p.name === 'FingerRight')
  assert.equal(p.FingerRight.getPosition().x, (500 + 31 + (finger.dx - 31) * 0.85) / 30)
  for (let edge = p.HandRight.getJointList(); edge; edge = edge.next) {
    assert.ok(pl.Vec2.distance(edge.joint.getAnchorA(), edge.joint.getAnchorB()) < 1e-8)
  }
})

test('serve contact delay advances only with simulation and cannot leak into a new round', () => {
  const game = new Game({ hazards: false })
  game.player1.pas(game.ball)
  assert.equal(game.player1.contact, 2)
  game.player1.updateServeContact(25)
  assert.equal(game.player1.contact, 2)
  game.player1.updateServeContact(25)
  assert.equal(game.player1.contact, 3)
  game.newRound()
  game.player1.updateServeContact(100)
  assert.equal(game.player1.contact, 0)
})
