import test from 'node:test'
import assert from 'node:assert/strict'
import { drawSkinMesh } from '../src/skin-mesh.js'

const source = [[20, 30], [70, 230], [100, 420], [110, 500]]
const radii = [50, 40, 30, 35]
const texture = { surface: {}, origin: [0, 0] }

function capture(target, widths = [1, 1, 1, 1], unit = 1) {
  const matrices = []
  const finite = (...numbers) => numbers.forEach(n => assert.ok(Number.isFinite(n), 'no invalid canvas coordinates'))
  const ctx = {
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {}, drawImage() {},
    moveTo: finite, lineTo: finite,
    transform(...matrix) { finite(...matrix); matrices.push(matrix) },
  }
  drawSkinMesh(ctx, texture, source, target.map(([x, y]) => ({ x, y })), radii, widths, unit)
  assert.ok(matrices.length > 20, 'the whole limb was rendered')
  return matrices
}

test('the undeformed pose preserves every painted texture coordinate', () => {
  for (const matrix of capture(source)) {
    [1, 0, 0, 1, 0, 0].forEach((n, i) => assert.ok(Math.abs(matrix[i] - n) < 1e-8))
  }
})

test('folded and momentarily coincident joints produce valid canvas transforms', () => {
  capture([[0, 0], [200, 0], [120, 100], [80, 180]])
  capture([[0, 0], [200, 0], [0, 0], [0, 80]])
  capture([[0, 0], [0, 0], [0, 100], [0, 100]])
})

test('changing the player scale scales both the texture and its joint positions', () => {
  const pose = [[20, 10], [70, 160], [-20, 270], [-30, 320]]
  const first = capture(pose, [0.8, 0.8, 0.8, 0.8])
  const second = capture(pose.map(p => p.map(n => n * 1.5)), [0.8, 0.8, 0.8, 0.8], 1.5)
  first.forEach((matrix, i) => matrix.forEach((n, j) => assert.ok(Math.abs(second[i][j] - n * 1.5) < 1e-8)))
})
