// Small, articulated illustrations drawn in the same local space as the bodies.
// Keeping the artwork procedural lets every player-size setting stay sharp.
import { FOREARM_SCALE } from './player.js'
import { ART, PHYS_SCALE } from './original.js'

const TAU = Math.PI * 2

const PLAYERS = [
  {
    skin: '#ee9f79', light: '#ffd3a6', shade: '#bd5d65', back: '#cc7b73',
    outline: '#3a163a', suit: '#d51872', suitShade: '#660c43', trim: '#ff8bd7',
    hair: '#a20e50', hairShade: '#370a2f', hairLight: '#f5449c', rim: '#ff39ac',
  },
  {
    skin: '#dda380', light: '#ffe0b9', shade: '#a76772', back: '#bb857f',
    outline: '#202544', suit: '#08a9d9', suitShade: '#08476c', trim: '#90f5ff',
    hair: '#e4d7bb', hairShade: '#706274', hairLight: '#fff3d6', rim: '#24dfff',
  },
]

function position(body) {
  return body.position
}

function angle(body) {
  return body.angle
}

function localPoint(body, x, y, view) {
  const p = position(body)
  const a = angle(body)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return {
    x: view.centerX + (p[0] + x * c - y * s) * view.scale,
    y: view.centerY - (p[1] + x * s + y * c) * view.scale,
  }
}

function inBody(ctx, body, k, view, draw) {
  const p = position(body)
  ctx.save()
  ctx.translate(view.centerX + p[0] * view.scale, view.centerY - p[1] * view.scale)
  ctx.rotate(-angle(body))
  ctx.scale(k * view.scale, k * view.scale)
  draw()
  ctx.restore()
}

function fillStroke(ctx, fill, stroke, width = 0.026) {
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = width
    ctx.stroke()
  }
}

function ellipse(ctx, x, y, rx, ry, fill, stroke, width = 0.022) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU)
  fillStroke(ctx, fill, stroke, width)
}

function joint(ctx, x, y, radius, colors, back = false) {
  ellipse(ctx, x, y, radius, radius, '#17152c', colors.rim, 0.024)
  ctx.beginPath()
  ctx.arc(x - radius * 0.08, y - radius * 0.08, radius * 0.61, Math.PI * 1.04, Math.PI * 1.64)
  ctx.strokeStyle = back ? colors.shade : colors.light
  ctx.lineWidth = 0.016
  ctx.stroke()
}

/**
 * Arm = upper arm, forearm and hand. Segment lengths come from the original's
 * sprite bounds rather than its collision boxes, which are shorter; the hand is
 * drawn on the fingertip body so the arm ends where the physics ends.
 */
function drawArm(ctx, upper, lower, finger, sign, colors, k, view, back, au) {
  if (!upper || !lower) return
  // The authored limb is 0.154 across plus its outline and end joints, so the
  // sprite's height maps onto that outer thickness rather than the bare path.
  const AUTHORED_THICKNESS = 0.194
  const segment = (body, art, draw) => {
    const half = au(art.w) / 2
    inBody(ctx, body, k, view, () => {
      ctx.scale(1, au(art.h) / AUTHORED_THICKNESS)
      draw(half)
    })
  }

  segment(upper, ART.arm, (half) => {
    const gradient = ctx.createLinearGradient(0, -0.085, 0, 0.085)
    gradient.addColorStop(0, back ? colors.back : colors.light)
    gradient.addColorStop(1, back ? colors.shade : colors.skin)
    ctx.beginPath()
    ctx.roundRect(-half - 0.045, -0.077, half * 2 + 0.09, 0.154, 0.077)
    fillStroke(ctx, gradient, colors.outline)
    joint(ctx, -sign * half, 0, 0.084, colors, back)
  })

  segment(lower, { ...ART.hand, w: ART.hand.w * FOREARM_SCALE }, (half) => {
    ctx.scale(sign, 1)
    ctx.beginPath()
    ctx.moveTo(-half, -0.072)
    ctx.bezierCurveTo(-half + 0.15, -0.075, half - 0.04, -0.057, half + 0.025, -0.051)
    ctx.quadraticCurveTo(half + 0.08, 0, half + 0.025, 0.051)
    ctx.bezierCurveTo(half - 0.04, 0.065, -half + 0.08, 0.077, -half, 0.072)
    ctx.quadraticCurveTo(-half - 0.065, 0, -half, -0.072)
    ctx.closePath()
    fillStroke(ctx, back ? colors.back : colors.skin, colors.outline)
    // A short highlight gives the rounded limbs a little volume at game size.
    ctx.beginPath()
    ctx.moveTo(-half + 0.07, -0.044)
    ctx.lineTo(half - 0.02, -0.034)
    ctx.strokeStyle = back ? '#efb181' : colors.light
    ctx.lineWidth = 0.022
    ctx.stroke()
    joint(ctx, -half, 0, 0.076, colors, back)
  })

  if (!finger) return
  // The hand sprite's box is measured across spread fingers; the palm that reads
  // at this size is a good deal smaller than that.
  const PALM = 0.62
  const handW = au(ART.fingers.w * PALM) / 2
  const handH = au(ART.fingers.h * PALM) / 2
  inBody(ctx, finger, k, view, () => {
    ctx.scale(sign, 1)
    ellipse(ctx, 0, 0, handW, handH, back ? colors.back : colors.skin, colors.outline, 0.022)
    // Closed volleyball hand, with a thumb rather than separate tiny fingers.
    ctx.beginPath()
    ctx.moveTo(handW * 0.1, -handH * 0.1)
    ctx.quadraticCurveTo(handW * 0.75, -handH * 0.62, handW * 0.95, -handH * 0.1)
    ctx.strokeStyle = colors.shade
    ctx.lineWidth = 0.017
    ctx.stroke()
  })
}

/**
 * Leg = thigh and shin with a bare foot. Both sprites are much longer than their
 * colliders, so each is drawn at sprite length with its lower end pinned to the
 * bottom of the collider — which keeps the sole on the sand and lets the thigh
 * run up under the hips, the way the original's does.
 */
function drawLeg(ctx, thigh, shin, colors, k, view, back, facing, au) {
  if (!thigh || !shin) return
  const segment = (body, art, authoredHalfWidth, draw) => {
    const colliderHalf = body.shapes[0].height / k / 2
    const half = au(art.h) / 2
    const widen = au(art.w) / 2 / authoredHalfWidth
    inBody(ctx, body, k, view, () => {
      ctx.translate(0, colliderHalf - half)
      ctx.scale(widen, 1)
      draw(half)
    })
  }

  segment(thigh, ART.leg, 0.105, (half) => {
    ctx.beginPath()
    ctx.moveTo(-0.105, -half)
    ctx.quadraticCurveTo(0, -half - 0.09, 0.105, -half)
    ctx.bezierCurveTo(0.111, -half + 0.12, 0.077, half - 0.05, 0.077, half)
    ctx.quadraticCurveTo(0, half + 0.072, -0.077, half)
    ctx.bezierCurveTo(-0.08, half - 0.08, -0.116, -half + 0.12, -0.105, -half)
    ctx.closePath()
    const gradient = ctx.createLinearGradient(-0.1, 0, 0.1, 0)
    gradient.addColorStop(0, back ? colors.shade : colors.skin)
    gradient.addColorStop(0.65, back ? colors.back : colors.light)
    gradient.addColorStop(1, back ? colors.back : colors.skin)
    fillStroke(ctx, gradient, colors.outline)
  })

    segment(shin, ART.foot, 0.075, (half) => {
    ctx.beginPath()
    ctx.moveTo(-0.075, -half)
    ctx.quadraticCurveTo(0, -half - 0.058, 0.075, -half)
    ctx.bezierCurveTo(0.09, -half + 0.14, 0.062, half - 0.07, 0.054, half)
    ctx.quadraticCurveTo(0, half + 0.034, -0.054, half)
    ctx.bezierCurveTo(-0.053, half - 0.14, -0.086, -half + 0.11, -0.075, -half)
    ctx.closePath()
    fillStroke(ctx, back ? colors.back : colors.skin, colors.outline)
    ctx.beginPath()
    ctx.moveTo(0.038, -half + 0.11)
    ctx.quadraticCurveTo(0.035, 0.04, 0.023, half - 0.075)
    ctx.strokeStyle = back ? '#eeb080' : colors.light
    ctx.lineWidth = 0.024
    ctx.stroke()
    joint(ctx, 0, -half, 0.079, colors, back)
  })

  // The bare foot follows the shin's angle, with a colored ankle strap.
  const shinHalf = shin.shapes[0].height / k / 2
  const sole = localPoint(shin, 0, -shinHalf, view)
  ctx.save()
  ctx.translate(sole.x, sole.y)
  ctx.rotate(-angle(shin))
  ctx.scale(k * view.scale * facing, k * view.scale)
  ctx.beginPath()
  ctx.moveTo(-0.066, -0.045)
  ctx.quadraticCurveTo(-0.023, -0.071, 0.032, -0.034)
  ctx.lineTo(0.097, 0.006)
  ctx.quadraticCurveTo(0.181, 0.005, 0.18, 0.052)
  ctx.quadraticCurveTo(0.097, 0.081, -0.078, 0.054)
  ctx.quadraticCurveTo(-0.1, 0.022, -0.066, -0.045)
  ctx.closePath()
  fillStroke(ctx, back ? colors.back : colors.skin, colors.outline, 0.025)
  ctx.beginPath()
  ctx.moveTo(-0.036, -0.045)
  ctx.lineTo(0.056, 0.028)
  ctx.strokeStyle = colors.trim
  ctx.lineWidth = 0.028
  ctx.stroke()
  ctx.restore()
}

function drawTorso(ctx, body, colors, k, view, motion) {
  inBody(ctx, body, k, view, () => {
    // Neck continues up into the head; the head itself follows its own joint.
    ctx.beginPath()
    ctx.roundRect(-0.076, -0.445, 0.152, 0.21, 0.055)
    fillStroke(ctx, colors.skin, colors.outline, 0.023)

    ctx.beginPath()
    ctx.moveTo(-0.16, -0.33)
    ctx.quadraticCurveTo(-0.27, -0.32, -0.265, -0.22)
    ctx.bezierCurveTo(-0.255, -0.045, -0.164, 0.11, -0.176, 0.305)
    ctx.quadraticCurveTo(0, 0.36, 0.176, 0.305)
    ctx.bezierCurveTo(0.164, 0.11, 0.255, -0.045, 0.265, -0.22)
    ctx.quadraticCurveTo(0.26, -0.32, 0.16, -0.33)
    ctx.quadraticCurveTo(0, -0.275, -0.16, -0.33)
    ctx.closePath()
    const skin = ctx.createLinearGradient(-0.24, 0, 0.25, 0)
    skin.addColorStop(0, colors.skin)
    skin.addColorStop(0.58, colors.light)
    skin.addColorStop(1, colors.skin)
    fillStroke(ctx, skin, colors.outline, 0.03)

    // The clothed chest is a small damped secondary shape. Shoulder anchors
    // remain fixed and the straps follow the fabric during takeoff/landing.
    const bounce = motion.chest
    for (const side of [-1, 1]) {
      const y = bounce * (side < 0 ? 0.92 : 1)
      ctx.strokeStyle = colors.suitShade
      ctx.lineWidth = 0.037
      ctx.beginPath()
      ctx.moveTo(side * 0.179, -0.31)
      ctx.lineTo(side * 0.211, -0.08 + y)
      ctx.stroke()
      ctx.save()
      ctx.translate(side * 0.119, -0.057 + y)
      ctx.scale(side, 1 - bounce * 0.6)
      const fabric = ctx.createLinearGradient(-0.08, -0.08, 0.09, 0.12)
      fabric.addColorStop(0, colors.trim)
      fabric.addColorStop(0.24, colors.suit)
      fabric.addColorStop(1, colors.suitShade)
      ctx.beginPath()
      ctx.moveTo(-0.115, 0.05)
      ctx.bezierCurveTo(-0.135, -0.005, -0.071, -0.121, 0.025, -0.132)
      ctx.bezierCurveTo(0.09, -0.119, 0.161, 0.021, 0.112, 0.092)
      ctx.quadraticCurveTo(0.005, 0.168, -0.115, 0.05)
      ctx.closePath()
      fillStroke(ctx, fabric, colors.suitShade, 0.021)
      ctx.beginPath()
      ctx.moveTo(-0.085, 0.025)
      ctx.quadraticCurveTo(-0.054, -0.043, 0.025, -0.115)
      ctx.strokeStyle = colors.trim
      ctx.lineWidth = 0.015
      ctx.stroke()
      ctx.restore()
    }
    ellipse(ctx, 0, 0.001 + bounce, 0.027, 0.022, colors.trim, colors.suitShade, 0.012)
    ctx.beginPath()
    ctx.moveTo(0.005, 0.237)
    ctx.quadraticCurveTo(-0.012, 0.254, 0.002, 0.269)
    ctx.strokeStyle = colors.shade
    ctx.lineWidth = 0.021
    ctx.stroke()
  })
}

function drawPelvis(ctx, body, colors, k, view) {
  inBody(ctx, body, k, view, () => {
    ctx.beginPath()
    ctx.moveTo(-0.18, -0.225)
    ctx.quadraticCurveTo(-0.21, -0.11, -0.267, 0.091)
    ctx.quadraticCurveTo(-0.303, 0.199, -0.215, 0.24)
    ctx.quadraticCurveTo(-0.08, 0.262, 0, 0.204)
    ctx.quadraticCurveTo(0.08, 0.262, 0.215, 0.24)
    ctx.quadraticCurveTo(0.303, 0.199, 0.267, 0.091)
    ctx.quadraticCurveTo(0.21, -0.11, 0.18, -0.225)
    ctx.closePath()
    fillStroke(ctx, colors.skin, colors.outline, 0.029)
    ctx.beginPath()
    ctx.moveTo(-0.235, -0.018)
    ctx.quadraticCurveTo(0, 0.07, 0.235, -0.018)
    ctx.lineTo(0.264, 0.091)
    ctx.quadraticCurveTo(0.12, 0.083, 0.057, 0.228)
    ctx.quadraticCurveTo(0, 0.25, -0.057, 0.228)
    ctx.quadraticCurveTo(-0.12, 0.083, -0.264, 0.091)
    ctx.closePath()
    fillStroke(ctx, colors.suit, colors.suitShade, 0.028)
    ctx.beginPath()
    ctx.moveTo(-0.229, 0.013)
    ctx.quadraticCurveTo(0, 0.103, 0.229, 0.013)
    ctx.strokeStyle = colors.trim
    ctx.lineWidth = 0.021
    ctx.stroke()
  })
}

function drawHead(ctx, body, colors, k, view, playerIndex, facing, motion) {
  inBody(ctx, body, k, view, () => {
    ctx.scale(facing, 1)
    if (playerIndex === 1) {
      // Pale top knot with cyan tie, as in the reference.
      ellipse(ctx, -0.2, -0.31, 0.15, 0.17, colors.hair, colors.hairShade, 0.025)
      ctx.strokeStyle = colors.hairShade
      ctx.lineWidth = 0.013
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(-0.21 + i * 0.035, -0.31, 0.07, 0.14, -0.4, -1.5, 1.8)
        ctx.stroke()
      }
      ellipse(ctx, -0.18, -0.195, 0.079, 0.026, colors.suit, colors.trim, 0.012)
    }

    ctx.beginPath()
    if (playerIndex === 0) {
      ctx.moveTo(0.195, -0.186)
      ctx.bezierCurveTo(0.198, -0.333, -0.142, -0.341, -0.259, -0.18)
      ctx.bezierCurveTo(-0.328, -0.058, -0.34, 0.205, -0.263, 0.269)
      ctx.quadraticCurveTo(-0.165, 0.324, -0.012, 0.253)
      ctx.lineTo(0.156, 0.121)
    } else {
      ctx.moveTo(0.202, -0.169)
      ctx.bezierCurveTo(0.19, -0.326, -0.144, -0.327, -0.248, -0.174)
      ctx.bezierCurveTo(-0.309, -0.064, -0.226, 0.154, -0.116, 0.204)
      ctx.lineTo(0.13, 0.105)
    }
    ctx.closePath()
    fillStroke(ctx, colors.hair, colors.hairShade, 0.03)

    // Friendly profile with a modest nose, jaw and ear, facing the other player.
    ctx.beginPath()
    ctx.moveTo(-0.12, -0.178)
    ctx.bezierCurveTo(-0.028, -0.24, 0.111, -0.215, 0.157, -0.118)
    ctx.quadraticCurveTo(0.186, -0.065, 0.182, -0.02)
    ctx.lineTo(0.237, 0.024)
    ctx.quadraticCurveTo(0.257, 0.05, 0.198, 0.068)
    ctx.bezierCurveTo(0.192, 0.19, 0.112, 0.25, 0.019, 0.235)
    ctx.quadraticCurveTo(-0.114, 0.217, -0.154, 0.099)
    ctx.quadraticCurveTo(-0.19, -0.032, -0.12, -0.178)
    ctx.closePath()
    fillStroke(ctx, colors.light, colors.outline, 0.025)
    ellipse(ctx, -0.124, 0.047, 0.07, 0.081, colors.skin, colors.outline, 0.018)
    ctx.beginPath()
    ctx.moveTo(-0.14, 0.021)
    ctx.quadraticCurveTo(-0.1, 0.011, -0.115, 0.071)
    ctx.strokeStyle = colors.shade
    ctx.lineWidth = 0.017
    ctx.stroke()

    // Fringe is drawn over the forehead, never as a circular photo texture.
    ctx.beginPath()
    ctx.moveTo(-0.239, -0.09)
    ctx.bezierCurveTo(-0.247, -0.3, 0.078, -0.323, 0.192, -0.185)
    ctx.quadraticCurveTo(0.155, -0.123, 0.081, -0.185)
    ctx.bezierCurveTo(0.039, -0.071, -0.077, -0.075, -0.11, 0.021)
    ctx.quadraticCurveTo(-0.205, -0.011, -0.201, 0.126)
    ctx.lineTo(-0.252, 0.18)
    ctx.closePath()
    fillStroke(ctx, colors.hair, colors.hairShade, 0.022)
    ctx.beginPath()
    ctx.moveTo(-0.211, -0.117)
    ctx.bezierCurveTo(-0.188, -0.233, -0.078, -0.266, 0.05, -0.25)
    ctx.strokeStyle = colors.hairLight
    ctx.lineWidth = 0.027
    ctx.stroke()

    ctx.strokeStyle = colors.outline
    ctx.lineWidth = 0.021
    ctx.beginPath()
    ctx.moveTo(0.07, -0.108)
    ctx.quadraticCurveTo(0.107, -0.132, 0.131, -0.108)
    ctx.stroke()
    ellipse(ctx, 0.111, -0.041, 0.041, 0.039, '#fff4e5', colors.outline, 0.012)
    ellipse(ctx, 0.123, -0.038, 0.018, 0.029, '#218f86')
    ellipse(ctx, 0.13, -0.039, 0.009, 0.023, '#152b39')
    ellipse(ctx, 0.118, -0.055, 0.005, 0.01, '#fff5d6')
    ctx.beginPath()
    ctx.moveTo(0.076, 0.145)
    ctx.quadraticCurveTo(0.126, 0.169, 0.167, 0.131)
    ctx.strokeStyle = colors.outline
    ctx.lineWidth = 0.02
    ctx.stroke()
    ellipse(ctx, 0.031, 0.082, 0.04, 0.018, 'rgba(220, 111, 77, 0.23)')
    // A loose face-framing lock follows the same spring as the ponytail.
    ctx.beginPath()
    ctx.moveTo(0.062, -0.247)
    ctx.bezierCurveTo(0.22, -0.21, 0.023, 0.08, 0.12 + motion.hair * 0.09, 0.24)
    ctx.strokeStyle = colors.hairShade
    ctx.lineWidth = 0.042
    ctx.stroke()
    ctx.strokeStyle = colors.hairLight
    ctx.lineWidth = 0.019
    ctx.stroke()
  })
}

function drawHairBehind(ctx, body, colors, k, view, playerIndex, facing, motion) {
  inBody(ctx, body, k, view, () => {
    ctx.scale(facing, 1)
    ctx.translate(-0.19, -0.2)
    ctx.rotate(-motion.hair * facing)
    const length = playerIndex === 0 ? 1 : 0.5
    ctx.scale(1, length)
    ctx.beginPath()
    ctx.moveTo(0.03, 0.02)
    ctx.bezierCurveTo(-0.15, -0.22, -0.4, -0.12, -0.39, 0.19)
    ctx.bezierCurveTo(-0.37, 0.48, -0.6, 0.64, -0.76, 0.59)
    ctx.bezierCurveTo(-0.55, 0.91, -0.29, 0.75, -0.18, 0.48)
    ctx.bezierCurveTo(-0.2, 0.8, -0.31, 0.91, -0.47, 0.87)
    ctx.bezierCurveTo(-0.19, 1.02, 0.015, 0.59, -0.05, 0.26)
    ctx.quadraticCurveTo(-0.1, 0.08, 0.03, 0.02)
    fillStroke(ctx, colors.hair, colors.hairShade, 0.029)
    ctx.strokeStyle = colors.hairLight
    ctx.lineWidth = 0.017
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(-0.08 - i * 0.08, 0.01)
      ctx.bezierCurveTo(-0.38, 0.12, -0.08 - i * 0.15, 0.55, -0.43 - i * 0.1, 0.71)
      ctx.stroke()
    }
    ellipse(ctx, -0.035, 0.04, 0.055, 0.075, colors.suit, colors.trim, 0.013)
  })
}

/**
 * Draws one player from the original game's thirteen parts. Limb artwork follows
 * the real bodies; only the torso, hips and head carry hand-drawn detail.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, {position:number[], angle:number, shapes:object[]}>} parts
 * @param {number} playerIndex 0 = pink / ponytail; 1 = cyan / blonde bun
 * @param {{scale:number, centerX:number, centerY:number, floorY:number}} view
 */
export function drawRagdoll(ctx, parts, playerIndex, view) {
  if (!parts.Head || !parts.Tors || !parts.Ass) return
  const colors = PLAYERS[playerIndex % PLAYERS.length]
  const facing = playerIndex === 1 ? -1 : 1
  const motion = parts.motion ?? { chest: 0, hair: 0 }
  const k = (parts.Head.shapes[0]?.radius ?? 0.25) / 0.25
  const backSide = playerIndex === 1 ? 'Right' : 'Left'
  const frontSide = playerIndex === 1 ? 'Left' : 'Right'

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  const p = position(parts.Ass)
  const x = view.centerX + p[0] * view.scale
  const lift = Math.max(0, view.floorY - (view.centerY - p[1] * view.scale) - 1.2 * k * view.scale)
  const shadowAlpha = Math.max(0.055, 0.21 - lift / (view.scale * 12))
  ctx.fillStyle = `rgba(5, 3, 28, ${shadowAlpha})`
  ctx.beginPath()
  ctx.ellipse(x, view.floorY + 0.045 * k * view.scale, 0.68 * k * view.scale, 0.095 * k * view.scale, 0, 0, TAU)
  ctx.fill()

  // One art unit is k metres, so this converts the original's sprite sizes,
  // which are in stage pixels, into the units the artwork is drawn in.
  const au = (px) => px / (k * PHYS_SCALE)

  // Arm -> upper arm, Hand -> forearm, Finger -> hand.
  const arm = (side, back) => drawArm(ctx, parts['Arm' + side], parts['Hand' + side], parts['Finger' + side], side === 'Left' ? -1 : 1, colors, k, view, back, au)
  // Leg -> thigh, Foot -> shin; the bare foot is drawn at the bottom of the shin.
  const leg = (side, back) => drawLeg(ctx, parts['Leg' + side], parts['Foot' + side], colors, k, view, back, facing, au)

  ctx.shadowColor = colors.rim
  ctx.shadowBlur = view.width * 0.0017
  drawHairBehind(ctx, parts.Head, colors, k, view, playerIndex, facing, motion)
  arm(backSide, true)
  leg(backSide, true)
  leg(frontSide, false)
  drawPelvis(ctx, parts.Ass, colors, k, view)
  drawTorso(ctx, parts.Tors, colors, k, view, motion)
  arm(frontSide, false)
  drawHead(ctx, parts.Head, colors, k, view, playerIndex, facing, motion)
  ctx.restore()
}
