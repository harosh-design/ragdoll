import { PHYS_SCALE, FLOOR_Y, NET_X, COURT, BALL } from './original.js'
import { Game, FRAME_DT, SERVE_CLOCK_MS } from './game.js'
import { initControls, applyControls, setControlsActive } from './controls.js'
import { render } from './renderer.js'
import { getSettings, initSettingsPanel, applyTuning } from './settings.js'
import { createSecondaryMotion, updateSecondaryMotion, reducedMotion } from './motion.js'
import { initMenus, COUNTDOWN_STEPS, COUNTDOWN_STEP_S } from './ui.js'

const m = (px) => px / PHYS_SCALE

/** About a second of hanging, so a new match never shows the spawn T-pose. */
const SETTLE_FRAMES = 30

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

applyTuning(getSettings())

function createGame(pointsToWin = 0, mode = 'humans') {
  const settings = getSettings()
  const created = new Game({
    gravityY: settings.gravityY,
    timeStep: settings.timeStep,
    playerScale: settings.playerScale,
    ballTouchImpulse: settings.ballTouchImpulse,
    diskSize: settings.diskSize,
    pointsToWin,
    mode,
  })
  created.settle(SETTLE_FRAMES)
  return created
}

let game = createGame()
let accumulator = 0
let secondaryMotion = [createSecondaryMotion(), createSecondaryMotion()]

/**
 * title -> countdown -> playing <-> paused, and playing -> over once someone
 * reaches the match target. Only 'playing' and 'over' step the world; the
 * countdown also runs again on resume, so nobody comes back to a ball already
 * falling on them.
 */
let phase = 'title'
let countdownLeft = 0

initControls()
const settingsPanel = initSettingsPanel(() => {
  applyTuning(getSettings())
  game.ballTouchImpulse = getSettings().ballTouchImpulse
  game.diskSize = getSettings().diskSize
}, () => startMatch())

const menus = initMenus({
  settings: settingsPanel,
  onPlay: () => startMatch(),
  onPause: () => pause(),
  onResume: () => resume(),
  onRestart: () => startMatch(),
  onMainMenu: () => showTitle(),
})

if (import.meta.env?.DEV) {
  // Handy while tuning against the original; stripped from production builds.
  Object.defineProperty(window, '__rv', { get: () => game, configurable: true })
}

function setPhase(next) {
  phase = next
  setControlsActive(next === 'countdown' || next === 'playing')
  menus.setPhase(next, game)
}

function newGame(pointsToWin) {
  game = createGame(pointsToWin, menus.mode)
  canvas.setAttribute('aria-label', game.mode === 'bot'
    ? 'Ragdoll Volleyball. You: arrows and space. Right player: computer bot.'
    : 'Ragdoll Volleyball. Player 1: arrows and space. Player 2: WASD and R.')
  accumulator = 0
  secondaryMotion = [createSecondaryMotion(), createSecondaryMotion()]
}

function countDown() {
  countdownLeft = COUNTDOWN_STEPS * COUNTDOWN_STEP_S
  setPhase('countdown')
}

function startMatch() {
  newGame(menus.pointsToWin)
  countDown()
}

function pause() {
  if (phase === 'countdown' || phase === 'playing') setPhase('paused')
}

function resume() {
  if (phase === 'paused') countDown()
}

function showTitle() {
  newGame()
  setPhase('title')
}

// Leaving the window mid-rally should not cost anyone the point.
window.addEventListener('blur', pause)
document.addEventListener('visibilitychange', () => { if (document.hidden) pause() })

setPhase('title')

const input = (g) => {
  applyControls(g.player1, g.ball)
  if (g.mode === 'humans') applyControls(g.player2, g.ball)
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
    velocity: [body.getLinearVelocity().x, -body.getLinearVelocity().y],
    shapes,
  }
}

function viewPlayer(player, alpha, dt, time) {
  const parts = { id: player.id, scale: player.scale }
  for (const name of Object.keys(player.parts)) parts[name] = view(player.parts[name], alpha)
  parts.motion = updateSecondaryMotion(secondaryMotion[player.id - 1], parts.Tors, dt, time, player.id, reducedMotion?.matches)
  return parts
}

let lastTime = performance.now()

function gameLoop(now) {
  requestAnimationFrame(gameLoop)
  let frameTime = (now - lastTime) / 1000
  lastTime = now
  if (frameTime > 0.25) frameTime = 0.25

  if (phase === 'countdown') {
    countdownLeft -= frameTime
    if (countdownLeft > 0) menus.count(Math.ceil(countdownLeft / COUNTDOWN_STEP_S), game.ball.ballOfPlayer)
    else setPhase('playing')
  }

  // After the winning point the world keeps drifting in its goal slow motion
  // behind the result.
  if (phase === 'playing' || phase === 'over') {
    accumulator += frameTime
    while (accumulator >= FRAME_DT) {
      rememberTransforms()
      game.frame(input)
      accumulator -= FRAME_DT
    }
  }

  // The banner follows the replay, so it outlasts a pause but not a restart.
  if (phase === 'countdown' || phase === 'playing') menus.showPoint(game.disableUpdate ? game.lastPoint : null)
  if (phase === 'playing' && game.winner) setPhase('over')

  const held = game.ball.ballOfPlayer
  const alpha = Math.min(1, accumulator / FRAME_DT)
  render(ctx, size, {
    players: [viewPlayer(game.player1, alpha, frameTime, now / 1000), viewPlayer(game.player2, alpha, frameTime, now / 1000)],
    time: reducedMotion?.matches ? 0 : now / 1000,
    ball: view(game.ball.body, alpha),
    ballRadius: m(BALL.radius),
    targets: game.targets.map((t) => ({ ...view(t.body, alpha), side: t.side })),
    disks: game.disks.map((d) => ({ ...view(d.body, alpha), side: d.side })),
    netHeight: m(FLOOR_Y - (COURT.net.y - COURT.net.hy)),
    score: game.score,
    hud: phase !== 'title',
    pointsToWin: game.pointsToWin,
    mode: game.mode,
    serve: phase !== 'title' && held ? { player: held, left: game.serveClock / SERVE_CLOCK_MS } : null,
  })
}

requestAnimationFrame(gameLoop)
