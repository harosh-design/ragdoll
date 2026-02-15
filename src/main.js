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
const leftWallShape = new p2.Box({ width: wallThickness, height: wallHeight })
const leftWall = new p2.Body({
  type: p2.Body.STATIC,
  position: [WORLD_LEFT - wallThickness / 2, (WORLD_TOP + WORLD_BOTTOM) / 2],
})
leftWall.addShape(leftWallShape)
leftWallShape.collisionGroup = GROUND
leftWallShape.collisionMask = BODYPARTS | OTHER
world.addBody(leftWall)

const rightWallShape = new p2.Box({ width: wallThickness, height: wallHeight })
const rightWall = new p2.Body({
  type: p2.Body.STATIC,
  position: [WORLD_RIGHT + wallThickness / 2, (WORLD_TOP + WORLD_BOTTOM) / 2],
})
rightWall.addShape(rightWallShape)
rightWallShape.collisionGroup = GROUND
rightWallShape.collisionMask = BODYPARTS | OTHER
world.addBody(rightWall)

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

world.on('beginContact', (ev) => {
  const { bodyA, bodyB, contactEquations } = ev
  if (contactEquations.length === 0) return
  const isBallVsStatic =
    (bodyA.isBall && bodyB.type === p2.Body.STATIC) ||
    (bodyB.isBall && bodyA.type === p2.Body.STATIC)
  if (!isBallVsStatic) return
  const ballBody = bodyA.isBall ? bodyA : bodyB
  const eq = contactEquations[0]
  const normalA = eq.normalA
  const n = bodyA.isBall
    ? [-normalA[0], -normalA[1]]
    : [normalA[0], normalA[1]]
  const velocityAtImpact = [ballBody.velocity[0], ballBody.velocity[1]]
  pendingBallBounces.push({ ballBody, normal: n, velocityAtImpact })
})

world.on('postStep', () => {
  const s = getSettings()
  const bounceCoeff = (s.bounceDamping ?? 0.8) * (1 - BALL_BOUNCE_IMPULSE_LOSS)
  for (const { ballBody, normal: n, velocityAtImpact: v } of pendingBallBounces) {
    const dot = v[0] * n[0] + v[1] * n[1]
    const vNormalX = dot * n[0]
    const vNormalY = dot * n[1]
    ballBody.velocity[0] = v[0] - vNormalX - bounceCoeff * vNormalX
    ballBody.velocity[1] = v[1] - vNormalY - bounceCoeff * vNormalY
    const impactForce = Math.min(Math.abs(dot) / 10, 1)
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
const ragdoll = createRagdoll(world, WORLD_BOTTOM)

// Ладонь правой руки = конец предплечья (local +x у lowerRightArm)
const lowerRightArmShape = ragdoll.lowerRightArm.shapes[0]
const handPivotX = lowerRightArmShape.width / 2
const BALL_OFFSET_Y = -0.06

let ballHeld = true

// Place ball at hand for first frame (чуть ниже ладони)
const hand = ragdoll.lowerRightArm
const a = hand.angle ?? 0
const hx = hand.position[0] + handPivotX * Math.cos(a)
const hy = hand.position[1] + handPivotX * Math.sin(a) + BALL_OFFSET_Y
ball.position[0] = hx
ball.position[1] = hy
for (const body of ragdoll.bodies) {
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
  if (e.code === 'KeyR' && ballHeld) {
    ballHeld = false
    ballShape.collisionMask = GROUND | BODYPARTS
    const speed = getSettings().throwSpeed ?? 20
    const angleDeg = getSettings().throwAngle ?? 0
    const angleRad = (angleDeg * Math.PI) / 180
    ball.velocity[0] = speed * Math.sin(angleRad)
    ball.velocity[1] = speed * Math.cos(angleRad)
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

function gameLoop(now) {
  requestAnimationFrame(gameLoop)
  const t = now / 1000
  let frameTime = t - lastTime
  lastTime = t
  if (frameTime > 0.25) frameTime = 0.25
  accumulator += frameTime

  const s = getSettings()
  world.gravity[1] = -s.gravityY
  const ragdollBottom = getRagdollBottom(ragdoll)
  const isOnGround = ragdollBottom <= WORLD_BOTTOM + 0.25
  applyControls(ragdoll, s, { isOnGround })

  while (accumulator >= FIXED_DT) {
    // Постоянная сила вверх на голову
    const headLift = s.headLiftForce ?? 0
    if (headLift > 0) {
      ragdoll.head.applyForce([0, headLift])
    }
    // Гравитация мяча (свой параметр, мяч не использует world.gravity из-за gravityScale = 0)
    if (!ballHeld) {
      const gBall = s.ballGravity ?? s.gravityY
      ball.applyForce([0, -ball.mass * gBall])
    }
    world.step(FIXED_DT)
    // Кинематическое крепление мяча к ладони (после step — актуальная позиция руки, чуть ниже)
    if (ballHeld) {
      const arm = ragdoll.lowerRightArm
      const ang = arm.angle
      const ax = arm.position[0]
      const ay = arm.position[1]
      ball.position[0] = ax + handPivotX * Math.cos(ang)
      ball.position[1] = ay + handPivotX * Math.sin(ang) + BALL_OFFSET_Y
      ball.velocity[0] = arm.velocity[0] - arm.angularVelocity * handPivotX * Math.sin(ang)
      ball.velocity[1] = arm.velocity[1] + arm.angularVelocity * handPivotX * Math.cos(ang)
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
  if (!ballHeld) {
    ball.squashX += (1 - ball.squashX) * 0.2
    ball.squashY += (1 - ball.squashY) * 0.2
  } else {
    ball.squashX = 1
    ball.squashY = 1
  }
  const ballRadiusSetting = s.ballSize ?? 0.25
  if (ballShape.radius !== ballRadiusSetting) ballShape.radius = ballRadiusSetting

  render(ctx, world, size, SCALE, {
  head: ragdoll.head,
  faceImage,
  upperBody: ragdoll.upperBody,
  torsoImage,
  pelvis: ragdoll.pelvis,
  pelvisImage,
  lowerLeftArm: ragdoll.lowerLeftArm,
  lowerRightArm: ragdoll.lowerRightArm,
  worldBottom: WORLD_BOTTOM,
})
}

requestAnimationFrame(gameLoop)
