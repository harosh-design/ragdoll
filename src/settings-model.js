import { MOVE, BALL, GRAVITY_Y, TIME_STEP } from './original.js'

/** One schema drives the settings UI and validates saved/imported values. */
export const NUMERIC_SETTINGS = [
  ['gravityY', 'Гравитация (перезапуск)', 2, 25, 0.5],
  ['timeStep', 'Шаг физики (перезапуск)', 0.01, 0.06, 0.001],
  ['playerScale', 'Размер игроков (перезапуск)', 0.8, 1.5, 0.05],
  ['turnImpulse', 'Импульс движения', 0, 12, 0.5],
  ['jumpImpulse', 'Импульс прыжка', 0, 12, 0.5],
  ['jumpBodyImpulse', 'Импульс прыжка (корпус)', 0, 30, 0.5],
  ['downImpulse', 'Импульс вниз', 0, 6, 0.25],
  ['ballMaxVX', 'Предел скорости мяча по X', 5, 40, 1],
  ['ballMaxVY', 'Предел скорости мяча по Y', 5, 40, 1],
  ['ballTouchImpulse', 'Подброс мяча при касании', 0, 4, 0.1],
  ['servePower', 'Сила подачи (×)', 0.25, 2.5, 0.05],
]

export const ORIGINAL_DEFAULTS = Object.freeze({
  gravityY: GRAVITY_Y,
  timeStep: TIME_STEP,
  playerScale: 1.15,
  turnImpulse: MOVE.turnImpulse,
  jumpImpulse: MOVE.jumpImpulse,
  jumpBodyImpulse: MOVE.jumpBodyImpulse,
  downImpulse: MOVE.downImpulse,
  ballMaxVX: BALL.maxVX,
  ballMaxVY: BALL.maxVY,
  ballTouchImpulse: 1,
  servePower: 1,
  arena: 'side',
})

export function normalizeSettings(value) {
  const result = { ...ORIGINAL_DEFAULTS }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result
  for (const [key, , min, max] of NUMERIC_SETTINGS) {
    const candidate = value[key]
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= min && candidate <= max) {
      result[key] = candidate
    }
  }
  if (value.arena === 'side' || value.arena === 'beach') result.arena = value.arena
  return result
}
