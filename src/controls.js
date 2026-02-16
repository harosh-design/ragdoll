// Player 1: WASD
const keysP1 = { left: false, right: false, jump: false }
// Player 2: Arrow keys
const keysP2 = { left: false, right: false, jump: false }

const stateP1 = { jumpConsumed: true, airJumpConsumed: true, wasInAir: false }
const stateP2 = { jumpConsumed: true, airJumpConsumed: true, wasInAir: false }

export function initControls() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyA') keysP1.left = true
    if (e.code === 'KeyD') keysP1.right = true
    if (e.code === 'KeyW') {
      e.preventDefault()
      keysP1.jump = true
      stateP1.jumpConsumed = false
    }
    if (e.code === 'ArrowLeft') keysP2.left = true
    if (e.code === 'ArrowRight') keysP2.right = true
    if (e.code === 'ArrowUp') {
      e.preventDefault()
      keysP2.jump = true
      stateP2.jumpConsumed = false
    }
  })
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA') keysP1.left = false
    if (e.code === 'KeyD') keysP1.right = false
    if (e.code === 'KeyW') keysP1.jump = false
    if (e.code === 'ArrowLeft') keysP2.left = false
    if (e.code === 'ArrowRight') keysP2.right = false
    if (e.code === 'ArrowUp') keysP2.jump = false
  })
}

/**
 * Apply control forces/impulses to ragdoll. Call before world.step each frame.
 * @param {{ pelvis: import('p2-es').Body, upperBody: import('p2-es').Body, head: import('p2-es').Body }} ragdoll
 * @param {{ moveForce: number, jumpImpulse: number }} settings
 * @param {{ isOnGround: boolean }} context
 * @param {'p1'|'p2'} keySet - 'p1' = WASD, 'p2' = Arrow keys
 */
export function applyControls(ragdoll, settings, context, keySet) {
  const keys = keySet === 'p2' ? keysP2 : keysP1
  const state = keySet === 'p2' ? stateP2 : stateP1
  const { pelvis, upperBody, head } = ragdoll
  const moveForce = settings.moveForce ?? (settings.movementSpeed != null ? settings.movementSpeed * 33 : 40)
  const jumpImpulse = settings.jumpImpulse
  const isOnGround = context?.isOnGround ?? true
  if (isOnGround && state.wasInAir) {
    state.jumpConsumed = false
    state.airJumpConsumed = false
  }
  state.wasInAir = !isOnGround

  if (keys.left) head.applyForce([-moveForce, 0])
  if (keys.right) head.applyForce([moveForce, 0])

  if (keys.jump) {
    if (isOnGround && !state.jumpConsumed) {
      pelvis.applyImpulse([0, jumpImpulse])
      upperBody.applyImpulse([0, jumpImpulse * 0.6])
      pelvis.angularVelocity *= 0.4
      upperBody.angularVelocity *= 0.4
      state.jumpConsumed = true
    } else if (!isOnGround && !state.airJumpConsumed) {
      const halfImpulse = jumpImpulse * 0.5
      pelvis.applyImpulse([0, halfImpulse])
      upperBody.applyImpulse([0, halfImpulse * 0.6])
      pelvis.angularVelocity *= 0.4
      upperBody.angularVelocity *= 0.4
      state.airJumpConsumed = true
    }
  }
}
