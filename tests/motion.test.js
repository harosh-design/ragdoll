import test from 'node:test'
import assert from 'node:assert/strict'
import { createSecondaryMotion, updateSecondaryMotion } from '../src/motion.js'

const body = (vy = 0, y = 0) => ({ position: [0, y], velocity: [0, vy], angle: 0 })

test('takeoff and landing produce opposite reactions that settle at rest', () => {
  const state = createSecondaryMotion()
  updateSecondaryMotion(state, body(), 1 / 60, 0)
  updateSecondaryMotion(state, body(8), 1 / 60, 1 / 60)
  assert.ok(state.chest > 0, 'the chest lags behind upward takeoff')
  for (let i = 0; i < 120; i++) updateSecondaryMotion(state, body(8), 1 / 60, i / 60)
  updateSecondaryMotion(state, body(-8), 1 / 60, 2)
  assert.ok(state.chest < 0, 'downward acceleration reverses the response')
  for (let i = 0; i < 240; i++) updateSecondaryMotion(state, body(), 1 / 60, 2 + i / 60)
  assert.ok(Math.abs(state.chest) < 0.0001)
  assert.ok(Math.abs(state.chestV) < 0.0001)
})

test('secondary motion stays bounded during repeated impacts', () => {
  const state = createSecondaryMotion()
  for (let i = 0; i < 10000; i++) {
    updateSecondaryMotion(state, body(i % 2 ? 100 : -100), 1 / 30, i / 30)
    assert.ok(Number.isFinite(state.chest) && Number.isFinite(state.hair))
    assert.ok(Math.abs(state.chest) <= 0.055)
    assert.ok(Math.abs(state.hair) <= 0.6)
  }
})

test('reduced motion, tab suspension and rally resets clear the springs', () => {
  for (const reason of ['reduced', 'suspended', 'teleport']) {
    const state = createSecondaryMotion()
    updateSecondaryMotion(state, body(), 1 / 60, 0)
    updateSecondaryMotion(state, body(8), 1 / 60, 1 / 60)
    updateSecondaryMotion(state, body(0, reason === 'teleport' ? 10 : 0),
      reason === 'suspended' ? 0.25 : 1 / 60, 1, 0, reason === 'reduced')
    assert.equal(state.chest, 0)
    assert.equal(state.hair, 0)
  }
})

test('response is consistent at 30, 60 and 120 render frames per second', () => {
  const samples = [30, 60, 120].map((fps) => {
    const state = createSecondaryMotion()
    updateSecondaryMotion(state, body(), 1 / fps, 0)
    for (let frame = 1; frame <= fps / 5; frame++) {
      updateSecondaryMotion(state, body(8), 1 / fps, frame / fps)
    }
    return state.chest
  })
  assert.ok(Math.max(...samples) - Math.min(...samples) < 0.002)
})
