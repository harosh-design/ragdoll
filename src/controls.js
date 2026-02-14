const keys = {
  left: false,
  right: false,
  jump: false,
}
let jumpConsumed = true
let airJumpConsumed = true
let wasInAir = false

export function initControls() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      e.preventDefault()
      keys.jump = true
      jumpConsumed = false
    }
  })
  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false
    if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.jump = false
  })
}

/**
 * Apply control forces/impulses to ragdoll. Call before world.step each frame.
 * A/D — усилие приложено к голове.
 * @param {{ pelvis: import('p2-es').Body, upperBody: import('p2-es').Body, head: import('p2-es').Body }} ragdoll
 * @param {{ moveForce: number, jumpImpulse: number }} settings
 * @param {{ isOnGround: boolean }} context
 */
export function applyControls(ragdoll, settings, context) {
  const { pelvis, upperBody, head } = ragdoll
  const moveForce = settings.moveForce
  const jumpImpulse = settings.jumpImpulse
  const isOnGround = context?.isOnGround ?? true
  if (isOnGround && wasInAir) {
    jumpConsumed = false
    airJumpConsumed = false
  }
  wasInAir = !isOnGround

  // A/D — точка приложения усилия на голове
  if (keys.left) head.applyForce([-moveForce, 0])
  if (keys.right) head.applyForce([moveForce, 0])

  if (keys.jump) {
    if (isOnGround && !jumpConsumed) {
      pelvis.applyImpulse([0, jumpImpulse])
      upperBody.applyImpulse([0, jumpImpulse * 0.6])
      pelvis.angularVelocity *= 0.4
      upperBody.angularVelocity *= 0.4
      jumpConsumed = true
    } else if (!isOnGround && !airJumpConsumed) {
      const halfImpulse = jumpImpulse * 0.5
      pelvis.applyImpulse([0, halfImpulse])
      upperBody.applyImpulse([0, halfImpulse * 0.6])
      pelvis.angularVelocity *= 0.4
      upperBody.angularVelocity *= 0.4
      airJumpConsumed = true
    }
  }
}
