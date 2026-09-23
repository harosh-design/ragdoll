import { PHYS_SCALE, FLOOR_Y, NET_X, COURT, BALL } from './original.js'
import { Game, FRAME_DT } from './game.js'
import { initControls, applyControls } from './controls.js'
import { render } from './renderer.js'
import { getSettings, initSettingsPanel, applyTuning } from './settings.js'

const m = (px) => px / PHYS_SCALE

const canvas = document.createElement('canvas')
canvas.tabIndex = 0
canvas.setAttribute('aria-label', 'Ragdoll Volleyball. Player 1: arrows and space. Player 2: WASD and R.')
const ctx = canvas.getContext('2d')
const app = document.querySelector('#app')
app.appendChild(canvas)

function resize() {
  const w = window.innerWidth
  const h = window.innerHeight
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(w * pixelRatio)
  canvas.height = Math.round(h * pixelRatio)
  return { width: w, height: h, pixelRatio }
}

let size = resize()
window.addEventListener('resize', () => { size = resize() })

const settings = getSettings()
applyTuning(settings)

const game = new Game({
  gravityY: settings.gravityY,
  timeStep: settings.timeStep,
  ballTouchImpulse: settings.ballTouchImpulse,
  diskSize: settings.diskSize,
})

initControls()
initSettingsPanel(() => {
  applyTuning(getSettings())
  game.ballTouchImpulse = getSettings().ballTouchImpulse
  game.diskSize = getSettings().diskSize
})

if (import.meta.env?.DEV) {
  // Handy while tuning against the original; stripped from production builds.
  window.__rv = game
}

const input = (g) => {
  applyControls(g.player1, g.ball)
  applyControls(g.player2, g.ball)
}

// --- interpolation so a 30 fps simulation still renders smoothly ---
const previous = new WeakMap()

function rememberTransforms() {
  for (let body = game.world.getBodyList(); body; body = body.getNext()) {
    const p = body.getPosition()
    previous.set(body, { x: p.x, y: p.y, a: body.getAngle() })
  }
}

/**
 * Box2D is y-down; the drawing code works in y-up metres with the net at the
 * origin, so mirror position and angle on the way out.
 */
function view(body, alpha) {
  const p = body.getPosition()
  const a = body.getAngle()
  const prev = previous.get(body) ?? { x: p.x, y: p.y, a }
  let da = a - prev.a
  while (da > Math.PI) da -= Math.PI * 2
  while (da < -Math.PI) da += Math.PI * 2
  const fixture = body.getFixtureList()
  const shape = fixture?.getShape()
  const shapes = []
  if (shape) {
    if (shape.getType() === 'circle') {
      shapes.push({ radius: shape.getRadius() })
    } else {
      let hx = 0
      let hy = 0
      for (const v of shape.m_vertices) { hx = Math.max(hx, Math.abs(v.x)); hy = Math.max(hy, Math.abs(v.y)) }
      shapes.push({ width: hx * 2, height: hy * 2 })
    }
  }
  return {
    position: [prev.x + (p.x - prev.x) * alpha - m(NET_X), -(prev.y + (p.y - prev.y) * alpha - m(FLOOR_Y))],
    angle: -(prev.a + da * alpha),
    shapes,
  }
}

function viewPlayer(player, alpha) {
  const parts = { id: player.id }
  for (const name of Object.keys(player.parts)) parts[name] = view(player.parts[name], alpha)
  return parts
}

let accumulator = 0
let lastTime = performance.now()

function gameLoop(now) {
  requestAnimationFrame(gameLoop)
  let frameTime = (now - lastTime) / 1000
  lastTime = now
  if (frameTime > 0.25) frameTime = 0.25
  accumulator += frameTime

  while (accumulator >= FRAME_DT) {
    rememberTransforms()
    game.frame(input)
    accumulator -= FRAME_DT
  }

  const alpha = Math.min(1, accumulator / FRAME_DT)
  render(ctx, size, {
    players: [viewPlayer(game.player1, alpha), viewPlayer(game.player2, alpha)],
    ball: view(game.ball.body, alpha),
    ballRadius: m(BALL.radius),
    targets: game.targets.map((t) => ({ ...view(t.body, alpha), side: t.side })),
    disks: game.disks.map((d) => ({ ...view(d.body, alpha), side: d.side })),
    netHeight: m(FLOOR_Y - (COURT.net.y - COURT.net.hy)),
    score: game.score,
  })
}

requestAnimationFrame(gameLoop)
