import * as p2 from 'p2-es'
import { createRagdoll, BODYPARTS, GROUND, OTHER } from './ragdoll.js'
import { render } from './renderer.js'
import { initControls, applyControls } from './controls.js'
import { getSettings, initSettingsPanel } from './settings.js'

import faceUrl from '../face.png'
import teloUrl from '../telo.jpg'
import tazUrl from '../taz.jpg'

const faceImage = new Image()
faceImage.src = faceUrl
const torsoImage = new Image()
torsoImage.src = teloUrl
const pelvisImage = new Image()
pelvisImage.src = tazUrl

const FIXED_DT = 1 / 60
const SCALE = 100
const PANEL_WIDTH = 220

export const WORLD_LEFT = -10
export const WORLD_RIGHT = 10
export const WORLD_BOTTOM = -4
export const WORLD_TOP = 14

const BALL_BOUNCE_IMPULSE_LOSS = 0.25
const pendingBallBounces = []
/** After ball hits ground, give to this player for next serve. */
let ballRespawnFor = null

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
const app = document.querySelector('#app')
app.appendChild(canvas)

function resize() {
  const w = Math.max(100, window.innerWidth - PANEL_WIDTH)
  const h = window.innerHeight
  canvas.width = w
  canvas.height = h
  return { width: w, height: h }
}

let size = resize()
window.addEventListener('resize', () => { size = resize() })

const settings = getSettings()
const world = new p2.World({ gravity: [0, -settings.gravityY] })
world.solver.iterations = 100
world.solver.tolerance = 0.002

const planeShape = new p2.Plane()
const plane = new p2.Body({
  type: p2.Body.STATIC,
  position: [0, WORLD_BOTTOM],
})
plane.addShape(planeShape)
planeShape.collisionGroup = GROUND
planeShape.collisionMask = BODYPARTS | OTHER
world.addBody(plane)

const wallThickness = 0.5
const wallHeight = WORLD_TOP - WORLD_BOTTOM + 1
// Side walls at the edges of the screen (inner face at WORLD_LEFT / WORLD_RIGHT)
const leftWallShape = new p2.Box({ width: wallThickness, height: wallHeight })
const leftWall = new p2.Body({
  type: p2.Body.STATIC,
  position: [WORLD_LEFT + wallThickness / 2, (WORLD_TOP + WORLD_BOTTOM) / 2],
})
leftWall.addShape(leftWallShape)
leftWallShape.collisionGroup = GROUND
leftWallShape.collisionMask = BODYPARTS | OTHER
world.addBody(leftWall)

const rightWallShape = new p2.Box({ width: wallThickness, height: wallHeight })
const rightWall = new p2.Body({
  type: p2.Body.STATIC,
  position: [WORLD_RIGHT - wallThickness / 2, (WORLD_TOP + WORLD_BOTTOM) / 2],
})
rightWall.addShape(rightWallShape)
rightWallShape.collisionGroup = GROUND
rightWallShape.collisionMask = BODYPARTS | OTHER
world.addBody(rightWall)

// Center net: height from settings (slider), ball can fly over if high enough
const getNetHeight = () => getSettings().netHeight ?? 6
const centerWallShape = new p2.Box({ width: wallThickness, height: getNetHeight() })

const centerWall = new p2.Body({
  type: p2.Body.STATIC,
  position: [0, WORLD_BOTTOM + getNetHeight() / 2],
})
centerWall.addShape(centerWallShape)
centerWall.isNet = true
centerWallShape.collisionGroup = GROUND
centerWallShape.collisionMask = BODYPARTS | OTHER
world.addBody(centerWall)

const ceilingWidth = WORLD_RIGHT - WORLD_LEFT + wallThickness * 2
const ceilingShape = new p2.Box({ width: ceilingWidth, height: wallThickness })
const ceiling = new p2.Body({
  type: p2.Body.STATIC,
  position: [(WORLD_LEFT + WORLD_RIGHT) / 2, WORLD_TOP + wallThickness / 2],
})
ceiling.addShape(ceilingShape)
ceilingShape.collisionGroup = GROUND
ceilingShape.collisionMask = BODYPARTS | OTHER
world.addBody(ceiling)

// Мяч в стиле TapBall (p2-es restitution demo): упругий, без затухания
const BALL_RADIUS = 0.25
const ballMaterial = new p2.Material()
const ballShape = new p2.Circle({ radius: BALL_RADIUS, material: ballMaterial })
ballShape.collisionGroup = OTHER
ballShape.collisionMask = GROUND

const ballContactMaterial = new p2.ContactMaterial(ballMaterial, world.defaultMaterial, {
  restitution: 0,
  stiffness: Number.MAX_VALUE,
})
world.addContactMaterial(ballContactMaterial)

const ball = new p2.Body({
  mass: 1,
  position: [0, 0],
  type: p2.Body.DYNAMIC,
  damping: 0,
  angularDamping: 0,
})
ball.addShape(ballShape)
ball.gravityScale = 0
ball.isBall = true
ball.squashX = 1
ball.squashY = 1
world.addBody(ball)

/** Tracks who last had the ball in flight, for alternating respawn. */
let lastThrowBy = 'p1'

world.on('beginContact', (ev) => {
  const { bodyA, bodyB, contactEquations } = ev
  if (contactEquations.length === 0) return
  const isBallVsStatic =
    (bodyA.isBall && bodyB.type === p2.Body.STATIC) ||
    (bodyB.isBall && bodyA.type === p2.Body.STATIC)
  const isBallVsPlayer =
    (bodyA.isBall && bodyB.type === p2.Body.DYNAMIC && !bodyB.isBall) ||
    (bodyB.isBall && bodyA.type === p2.Body.DYNAMIC && !bodyA.isBall)
  if (!isBallVsStatic && !isBallVsPlayer) return
  const ballBody = bodyA.isBall ? bodyA : bodyB
  const otherBody = bodyA.isBall ? bodyB : bodyA
  const eq = contactEquations[0]
  const normalA = eq.normalA
  // Normal pointing away from ball (into the other body)
  const n = bodyA.isBall
    ? [-normalA[0], -normalA[1]]
    : [normalA[0], normalA[1]]
  // For player bodies: use relative velocity (ball minus player part)
  // For static bodies: player velocity is [0,0], so it's just ball velocity
  const otherVel = otherBody.type === p2.Body.STATIC
    ? [0, 0]
    : [otherBody.velocity[0], otherBody.velocity[1]]
  const relVelocity = [
    ballBody.velocity[0] - otherVel[0],
    ballBody.velocity[1] - otherVel[1],
  ]
  const bounceStrength = isBallVsPlayer
    ? (getSettings().playerBounceStrength ?? 0.45)
    : 1
  pendingBallBounces.push({
    ballBody, normal: n, relVelocity, otherVel, bounceStrength,
  })
  const hitFloor = (bodyA.isBall && bodyB === plane) || (bodyB.isBall && bodyA === plane)
  if (hitFloor && ballHeldBy === null) {
    ballRespawnFor = lastThrowBy === 'p1' ? 'p2' : 'p1'
  }
})

world.on('postStep', () => {
  const s = getSettings()
  const baseBounceCoeff = (s.bounceDamping ?? 0.8) * (1 - BALL_BOUNCE_IMPULSE_LOSS)
  for (const { ballBody, normal: n, relVelocity: rv, otherVel, bounceStrength = 1 } of pendingBallBounces) {
    const bounceCoeff = baseBounceCoeff * bounceStrength
    // Reflect the relative velocity in the contact normal
    const dot = rv[0] * n[0] + rv[1] * n[1]
    const rvNormalX = dot * n[0]
    const rvNormalY = dot * n[1]
    // Reflected relative velocity + add back other body's velocity
    ballBody.velocity[0] = rv[0] - rvNormalX - bounceCoeff * rvNormalX + otherVel[0]
    ballBody.velocity[1] = rv[1] - rvNormalY - bounceCoeff * rvNormalY + otherVel[1]
    // Squash/stretch effect (based on relative impact force)
    const impactForce = Math.min(Math.abs(dot) / 10, 1) * bounceStrength
    const isVertical = Math.abs(n[1]) > Math.abs(n[0])
    if (isVertical) {
      ballBody.squashX = 1 + impactForce * 0.3
      ballBody.squashY = 1 - impactForce * 0.3
    } else {
      ballBody.squashX = 1 - impactForce * 0.3
      ballBody.squashY = 1 + impactForce * 0.3
    }
  }
  pendingBallBounces.length = 0
})

const lastGoodPosition = new WeakMap()

// Player 1 left side, Player 2 right side (size from settings; applies on restart)
const playerScale = getSettings().playerSize ?? 1
const ragdoll1 = createRagdoll(world, WORLD_BOTTOM, WORLD_LEFT + 4, playerScale, 1)
const ragdoll2 = createRagdoll(world, WORLD_BOTTOM, WORLD_RIGHT - 4, playerScale, 2)

// Hand pivot: right arm tip = +width/2, left arm tip = -width/2
const lowerRightArmShape = ragdoll1.lowerRightArm.shapes[0]
const handPivotXRight = lowerRightArmShape.width / 2
const handPivotXLeft = -lowerRightArmShape.width / 2
const BALL_OFFSET_Y = -0.06

/** 'p1' | 'p2' | null when in flight */
let ballHeldBy = 'p1'

/** Constraint that holds the ball to the hand until serve; removed on throw. */
let ballHoldConstraint = null

const ANGLE_45_RAD = (45 * Math.PI) / 180
const DIR_45_P1 = [Math.cos(ANGLE_45_RAD), Math.sin(ANGLE_45_RAD)]
const DIR_45_P2 = [-Math.cos(ANGLE_45_RAD), Math.sin(ANGLE_45_RAD)]

function placeBallAtHand(ragdoll, useRightHand) {
  const arm = useRightHand ? ragdoll.lowerRightArm : ragdoll.lowerLeftArm
  const pivotX = useRightHand ? handPivotXRight : handPivotXLeft
  const a = arm.angle ?? 0
  ball.position[0] = arm.position[0] + pivotX * Math.cos(a)
  ball.position[1] = arm.position[1] + pivotX * Math.sin(a) + BALL_OFFSET_Y
}

/** Скорость подачи = база под 45° в сторону противника + скорость туловища × коэффициент. Работает и на земле, и в прыжке. */
function getThrowVelocity(ragdoll, isP1) {
  const coef = getSettings().throwTorsoCoef ?? 1
  const baseSpeed = getSettings().throwSpeed ?? 14
  const dir45 = isP1 ? DIR_45_P1 : DIR_45_P2
  const tx = (ragdoll.upperBody.velocity[0] ?? 0) * coef
  const ty = (ragdoll.upperBody.velocity[1] ?? 0) * coef
  return [
    dir45[0] * baseSpeed + tx,
    dir45[1] * baseSpeed + ty,
  ]
}

/** Жёстко привязать мяч к руке через LockConstraint (до подачи). */
function attachBallToHand(ragdoll, useRightHand) {
  if (ballHoldConstraint) {
    world.removeConstraint(ballHoldConstraint)
    ballHoldConstraint = null
  }
  placeBallAtHand(ragdoll, useRightHand)
  ball.velocity[0] = 0
  ball.velocity[1] = 0
  ball.angularVelocity = 0
  const arm = useRightHand ? ragdoll.lowerRightArm : ragdoll.lowerLeftArm
  const pivotX = useRightHand ? handPivotXRight : handPivotXLeft
  ballHoldConstraint = new p2.LockConstraint(arm, ball, {
    collideConnected: false,
    localOffsetB: [pivotX, BALL_OFFSET_Y],
  })
  world.addConstraint(ballHoldConstraint)
}

// Initial serve: ball rigidly attached to Player 1's right hand
attachBallToHand(ragdoll1, true)
for (const body of ragdoll1.bodies) {
  const p = body.position
  if (p != null && (p[0] != null || p.x != null) && (p[1] != null || p.y != null)) {
    lastGoodPosition.set(body, [Number(p[0] ?? p.x ?? 0), Number(p[1] ?? p.y ?? 0)])
  }
}
for (const body of ragdoll2.bodies) {
  const p = body.position
  if (p != null && (p[0] != null || p.x != null) && (p[1] != null || p.y != null)) {
    lastGoodPosition.set(body, [Number(p[0] ?? p.x ?? 0), Number(p[1] ?? p.y ?? 0)])
  }
}
if (ball.position) {
  lastGoodPosition.set(ball, [ball.position[0], ball.position[1]])
}
initControls()
initSettingsPanel()

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && ballHeldBy === 'p1') {
    if (ballHoldConstraint) {
      world.removeConstraint(ballHoldConstraint)
      ballHoldConstraint = null
    }
    ballHeldBy = null
    lastThrowBy = 'p1'
    ballShape.collisionMask = GROUND | BODYPARTS
    const [vx, vy] = getThrowVelocity(ragdoll1, true)
    ball.velocity[0] = vx
    ball.velocity[1] = vy
  }
  if (e.code === 'Enter' && ballHeldBy === 'p2') {
    if (ballHoldConstraint) {
      world.removeConstraint(ballHoldConstraint)
      ballHoldConstraint = null
    }
    ballHeldBy = null
    lastThrowBy = 'p2'
    ballShape.collisionMask = GROUND | BODYPARTS
    const [vx, vy] = getThrowVelocity(ragdoll2, false)
    ball.velocity[0] = vx
    ball.velocity[1] = vy
  }
})

let accumulator = 0
let lastTime = performance.now() / 1000

/** p2-es position can become invalid after step; use previousPosition or last known good so the doll stays on screen. */
function getBodyPosition(body) {
  const p = body.position
  let x = p != null ? (p[0] ?? p.x) : undefined
  let y = p != null ? (p[1] ?? p.y) : undefined
  x = Number(x)
  y = Number(y)
  if (Number.isFinite(x) && Number.isFinite(y)) {
    lastGoodPosition.set(body, [x, y])
    return [x, y]
  }
  const prev = body.previousPosition
  x = prev != null ? (prev[0] ?? prev.x) : undefined
  y = prev != null ? (prev[1] ?? prev.y) : undefined
  x = Number(x)
  y = Number(y)
  if (Number.isFinite(x) && Number.isFinite(y)) {
    lastGoodPosition.set(body, [x, y])
    return [x, y]
  }
  const last = lastGoodPosition.get(body)
  if (last) return last
  return [0, 0]
}

function getBodyPreviousPosition(body) {
  const p = body.previousPosition
  if (p == null) return lastGoodPosition.get(body) || [0, 0]
  const x = Number(p[0] ?? p.x ?? 0)
  const y = Number(p[1] ?? p.y ?? 0)
  if (Number.isFinite(x) && Number.isFinite(y)) return [x, y]
  return lastGoodPosition.get(body) || [0, 0]
}

function getRagdollBottom(ragdoll) {
  let minY = Infinity
  for (const body of ragdoll.bodies) {
    const [_, py] = getBodyPosition(body)
    for (const shape of body.shapes) {
      let half = 0
      if (shape.type === p2.Shape.CIRCLE) half = shape.radius
      else if (shape.type === p2.Shape.BOX) half = shape.height / 2
      minY = Math.min(minY, py - half)
    }
  }
  return minY
}

/** Возвращает левую и правую границы тела по X (с учётом форм). */
function getBodyXExtents(body) {
  const x = body.position[0] ?? body.position?.x ?? 0
  let left = x
  let right = x
  for (const shape of body.shapes) {
    let hx = 0
    if (shape.type === p2.Shape.CIRCLE) hx = shape.radius
    else if (shape.type === p2.Shape.BOX) hx = shape.width / 2
    left = Math.min(left, x - hx)
    right = Math.max(right, x + hx)
  }
  return { left, right }
}

/** Глубина корпуса (ширина туловища) — на столько игрок может зайти на половину соперника. */
function getTorsoDepth(ragdoll) {
  const shape = ragdoll.upperBody?.shapes?.[0]
  return shape && shape.width != null ? shape.width : 0.5
}

/** Выше сетки ли рагдолл (хотя бы центр туловища) — тогда разрешён мягкий заход на половину соперника. */
function isRagdollAboveNet(ragdoll, netTopY) {
  const y = ragdoll.upperBody?.position?.[1] ?? ragdoll.pelvis?.position?.[1]
  return typeof y === 'number' && y > netTopY
}

/** Применяет выталкивающую силу над сеткой, если рагдолл зашёл на половину соперника дальше глубины корпуса. */
function applyNetRepulsionForce(ragdoll, side) {
  const netTopY = WORLD_BOTTOM + (getSettings().netHeight ?? 6)
  if (!isRagdollAboveNet(ragdoll, netTopY)) return
  const torsoDepth = getTorsoDepth(ragdoll)
  const k = getSettings().netRepelForce ?? 120
  if (side === 'left') {
    let rightmost = -Infinity
    for (const body of ragdoll.bodies) {
      const { right } = getBodyXExtents(body)
      rightmost = Math.max(rightmost, right)
    }
    if (rightmost <= torsoDepth) return
    const over = rightmost - torsoDepth
    const forceX = -k * over
    for (const body of ragdoll.bodies) {
      body.applyForce([forceX, 0])
    }
  } else {
    let leftmost = Infinity
    for (const body of ragdoll.bodies) {
      const { left } = getBodyXExtents(body)
      leftmost = Math.min(leftmost, left)
    }
    if (leftmost >= -torsoDepth) return
    const over = -torsoDepth - leftmost
    const forceX = k * over
    for (const body of ragdoll.bodies) {
      body.applyForce([forceX, 0])
    }
  }
}

function gameLoop(now) {
  requestAnimationFrame(gameLoop)
  const t = now / 1000
  let frameTime = t - lastTime
  lastTime = t
  if (frameTime > 0.25) frameTime = 0.25
  accumulator += frameTime

  const s = getSettings()
  world.gravity[1] = -s.gravityY
  const ragdoll1Bottom = getRagdollBottom(ragdoll1)
  const ragdoll2Bottom = getRagdollBottom(ragdoll2)
  applyControls(ragdoll1, s, { isOnGround: ragdoll1Bottom <= WORLD_BOTTOM + 0.25 }, 'p1')
  applyControls(ragdoll2, s, { isOnGround: ragdoll2Bottom <= WORLD_BOTTOM + 0.25 }, 'p2')

  while (accumulator >= FIXED_DT) {
    const headLift = s.headLiftForce ?? 0
    if (headLift > 0) {
      ragdoll1.head.applyForce([0, headLift])
      ragdoll2.head.applyForce([0, headLift])
    }
    if (ballHeldBy == null) {
      const gBall = s.ballGravity ?? s.gravityY
      ball.applyForce([0, -ball.mass * gBall])
    }
    applyNetRepulsionForce(ragdoll1, 'left')
    applyNetRepulsionForce(ragdoll2, 'right')
    world.step(FIXED_DT)
    if (ballRespawnFor !== null) {
      ballHeldBy = ballRespawnFor
      ballRespawnFor = null
      ballShape.collisionMask = GROUND
      if (ballHeldBy === 'p1') attachBallToHand(ragdoll1, true)
      else attachBallToHand(ragdoll2, false)
    }
    accumulator -= FIXED_DT
  }

  const alpha = Math.min(1, accumulator / FIXED_DT)
  for (let i = 0; i < world.bodies.length; i++) {
    const b = world.bodies[i]
    if (b.type !== p2.Body.STATIC) {
      const [posX, posY] = getBodyPosition(b)
      const [prevX, prevY] = getBodyPreviousPosition(b)
      b.interpolatedPosition = b.interpolatedPosition || [0, 0]
      b.interpolatedPosition[0] = prevX + alpha * (posX - prevX)
      b.interpolatedPosition[1] = prevY + alpha * (posY - prevY)
      const prevAngle = typeof b.previousAngle === 'number' ? b.previousAngle : b.angle
      const angle = typeof b.angle === 'number' ? b.angle : prevAngle
      b.interpolatedAngle = prevAngle + alpha * (angle - prevAngle)
    }
  }
  if (ballHeldBy == null) {
    ball.squashX += (1 - ball.squashX) * 0.2
    ball.squashY += (1 - ball.squashY) * 0.2
  } else {
    ball.squashX = 1
    ball.squashY = 1
  }
  const ballRadiusSetting = s.ballSize ?? 0.25
  if (ballShape.radius !== ballRadiusSetting) ballShape.radius = ballRadiusSetting

  const currentNetHeight = s.netHeight ?? 6
  if (centerWallShape.height !== currentNetHeight) {
    centerWallShape.height = currentNetHeight
    centerWall.position[1] = WORLD_BOTTOM + currentNetHeight / 2
  }

  render(ctx, world, size, SCALE, {
    ragdolls: [
      {
        head: ragdoll1.head,
        upperBody: ragdoll1.upperBody,
        pelvis: ragdoll1.pelvis,
        lowerLeftArm: ragdoll1.lowerLeftArm,
        lowerRightArm: ragdoll1.lowerRightArm,
      },
      {
        head: ragdoll2.head,
        upperBody: ragdoll2.upperBody,
        pelvis: ragdoll2.pelvis,
        lowerLeftArm: ragdoll2.lowerLeftArm,
        lowerRightArm: ragdoll2.lowerRightArm,
      },
    ],
    faceImage,
    torsoImage,
    pelvisImage,
    worldBottom: WORLD_BOTTOM,
    netHeight: currentNetHeight,
  })
}

requestAnimationFrame(gameLoop)
