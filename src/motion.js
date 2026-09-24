// One wind field keeps the palms, hair and drifting leaves in the same weather.
export const reducedMotion = typeof window !== 'undefined'
  ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null

export function windAt(time, phase = 0) {
  return 0.6 + Math.sin(time * 0.73 + phase) * 0.28 + Math.sin(time * 1.71 + phase * 0.4) * 0.12
}

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value))

// Cosmetic springs follow velocity changes, without applying forces to Box2D.
// Substeps, bounded impulses and reset detection handle low FPS and new rallies.
export function createSecondaryMotion() {
  return { chest: 0, chestV: 0, hair: 0, hairV: 0, previous: null }
}

export function updateSecondaryMotion(state, body, dt, time, phase = 0, reduced = false) {
  const current = { x: body.position[0], y: body.position[1], vx: body.velocity[0], vy: body.velocity[1] }
  const prev = state.previous
  state.previous = current
  if (reduced || !prev || dt <= 0 || dt > 0.12 || Math.hypot(current.x - prev.x, current.y - prev.y) > 2) {
    state.chest = state.chestV = state.hair = state.hairV = 0
    return state
  }
  const dvx = current.vx - prev.vx
  const dvy = current.vy - prev.vy
  // Project the acceleration onto the torso's local vertical axis.
  state.chestV += clamp((dvy * Math.cos(body.angle) - dvx * Math.sin(body.angle)) * 0.09, 0.7)
  state.hairV += clamp(dvx * 0.09 - dvy * 0.025, 1.2)
  const targetHair = windAt(time, phase) * 0.19 - clamp(current.vx * 0.025, 0.3)
  const steps = Math.ceil(dt / (1 / 120))
  const step = dt / steps
  for (let i = 0; i < steps; i++) {
    state.chestV += (-150 * state.chest - 11 * state.chestV) * step
    state.chest = clamp(state.chest + state.chestV * step, 0.055)
    state.hairV += (34 * (targetHair - state.hair) - 5.8 * state.hairV) * step
    state.hair = clamp(state.hair + state.hairV * step, 0.6)
  }
  return state
}
