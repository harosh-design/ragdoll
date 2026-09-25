import { PHYS_SCALE, FLOOR_Y, COURT, BALL } from './original.js'
import { Game, FRAME_DT, SERVE_CLOCK_MS } from './game.js'
import { initControls, applyControls, setControlsActive } from './controls.js'
import { render } from './renderer.js'
import { getSettings, initSettingsPanel, applyTuning } from './settings.js'
import { createSecondaryMotion, updateSecondaryMotion, reducedMotion } from './motion.js'
import { initMenus, COUNTDOWN_STEPS, COUNTDOWN_STEP_S } from './ui.js'
import { createFixedStepClock } from './fixed-step.js'
import { createPresentation } from './presentation.js'

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

function createGame(pointsToWin = 0, mode = 'humans', characters) {
  const settings = getSettings()
  const created = new Game({
    gravityY: settings.gravityY,
    timeStep: settings.timeStep,
    playerScale: settings.playerScale,
    ballTouchImpulse: settings.ballTouchImpulse,
    servePower: settings.servePower,
    arena: settings.arena,
    pointsToWin,
    mode,
    characters,
  })
  created.settle(SETTLE_FRAMES)
  return created
}

let game = createGame()
const clock = createFixedStepClock(FRAME_DT)
let presentation = createPresentation()
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
  const settings = getSettings()
  applyTuning(settings)
  game.ballTouchImpulse = settings.ballTouchImpulse
  game.servePower = settings.servePower
  game.arena = settings.arena
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
  game = createGame(pointsToWin, menus.mode, menus.characters)
  canvas.setAttribute('aria-label', game.mode === 'bot'
    ? 'Ragdoll Volleyball. You: arrows and space. Right player: computer bot.'
    : 'Ragdoll Volleyball. Player 1: arrows and space. Player 2: WASD and R.')
  clock.reset()
  presentation = createPresentation()
  secondaryMotion = [createSecondaryMotion(), createSecondaryMotion()]
}

function countDown() {
  clock.reset()
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

function viewPlayer(player, alpha, dt, time) {
  const selection = phase === 'title' ? menus.characters : game.characters
  const parts = { id: player.id, scale: player.scale, characterId: selection[player.id - 1] }
  for (const name of Object.keys(player.parts)) parts[name] = presentation.view(player.parts[name], alpha)
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
    clock.advance(frameTime, () => {
      presentation.capture(game.world)
      const round = game.roundIndex
      game.frame(input)
      if (game.roundIndex !== round) presentation.capture(game.world)
    })
  }

  // The banner follows the replay, so it outlasts a pause but not a restart.
  if (phase === 'countdown' || phase === 'playing') menus.showPoint(game.disableUpdate ? game.lastPoint : null)
  if (phase === 'playing' && game.winner) setPhase('over')

  const held = game.ball.ballOfPlayer
  const alpha = clock.alpha
  render(ctx, size, {
    players: [viewPlayer(game.player1, alpha, frameTime, now / 1000), viewPlayer(game.player2, alpha, frameTime, now / 1000)],
    arena: game.arena,
    touches: !game.disableUpdate && !held ? [game.player1.contact, game.player2.contact] : [0, 0],
    impaled: [game.spike.caught(game.player1).length > 0, game.spike.caught(game.player2).length > 0],
    hazardCooldown: game.hazards?.cooldown ?? 0,
    time: reducedMotion?.matches ? 0 : now / 1000,
    ball: presentation.view(game.ball.body, alpha),
    ballRadius: m(BALL.radius),
    targets: game.targets.map((t) => ({ ...presentation.view(t.body, alpha), side: t.side })),
    disks: game.disks.map((d) => ({ ...presentation.view(d.body, alpha), side: d.side })),
    netHeight: m(FLOOR_Y - (COURT.net.y - COURT.net.hy)),
    score: game.score,
    hud: phase !== 'title',
    pointsToWin: game.pointsToWin,
    mode: game.mode,
    serve: phase !== 'title' && held ? { player: held, left: game.serveClock / SERVE_CLOCK_MS } : null,
  })
}

requestAnimationFrame(gameLoop)
