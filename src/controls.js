import * as pl from 'planck'
import { MOVE } from './original.js'

/**
 * The original's `control` class. Player 1 (left) is on the arrow keys and
 * space, player 2 (right) is on WASD and R, and the key state is just a table of
 * key codes the way the original's key_stack is.
 */
const LEFT = 37
const UP = 38
const RIGHT = 39
const DOWN = 40
const SPACE = 32
const KEY_A = 65
const KEY_D = 68
const KEY_W = 87
const KEY_S = 83
const KEY_R = 82

const CODE_TO_KEY = {
  ArrowLeft: LEFT,
  ArrowUp: UP,
  ArrowRight: RIGHT,
  ArrowDown: DOWN,
  Space: SPACE,
  KeyA: KEY_A,
  KeyD: KEY_D,
  KeyW: KEY_W,
  KeyS: KEY_S,
  KeyR: KEY_R,
}

const PREVENT_DEFAULT = new Set(['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Space'])

const keyStack = {}
/** Off while a menu is up, so arrows and space reach its buttons instead. */
let active = true

export function initControls() {
  window.addEventListener('keydown', (e) => {
    const code = CODE_TO_KEY[e.code]
    if (code == null || !active) return
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault()
    keyStack[code] = true
  })
  window.addEventListener('keyup', (e) => {
    const code = CODE_TO_KEY[e.code]
    if (code == null) return
    keyStack[code] = false
  })
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keyStack)) keyStack[k] = false
  })
}

export function disableControls() {
  for (const k of Object.keys(keyStack)) keyStack[k] = false
}

export function setControlsActive(on) {
  active = on
  if (!on) disableControls()
}

/**
 * control::update — run once per frame per player. Movement and the downward
 * stamp repeat while held; the jump is consumed so it needs a fresh press.
 */
export function applyControls(player, ball) {
  const keys = player.id === 1
    ? { jump: UP, down: DOWN, left: LEFT, right: RIGHT, serve: SPACE }
    : { jump: KEY_W, down: KEY_S, left: KEY_A, right: KEY_D, serve: KEY_R }

  if (keyStack[keys.jump]) {
    player.jump()
    keyStack[keys.jump] = false
  }
  if (keyStack[keys.down]) player.turnDown()
  if (keyStack[keys.left]) player.turn(pl.Vec2(-MOVE.turnImpulse, 0))
  if (keyStack[keys.right]) player.turn(pl.Vec2(MOVE.turnImpulse, 0))
  if (keyStack[keys.serve]) player.pas(ball)
}
