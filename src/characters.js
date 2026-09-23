// Small, articulated illustrations drawn in the same local space as the bodies.
// Keeping the artwork procedural lets every player-size setting stay sharp.
import { ART, PHYS_SCALE } from './original.js'

const TAU = Math.PI * 2

const PLAYERS = [
  {
    skin: '#ffba83', light: '#ffd09a', shade: '#e79164', back: '#e9a171',
    outline: '#783c31', suit: '#e54a40', suitShade: '#bd302f', trim: '#ffcc85',
    hair: '#793324', hairShade: '#54251f', hairLight: '#ad5140',
  },
  {
    skin: '#f2ae77', light: '#ffcb90', shade: '#d78b60', back: '#dd9668',
    outline: '#673f32', suit: '#159bda', suitShade: '#0864a5', trim: '#a0e8f2',
    hair: '#53362c', hairShade: '#372820', hairLight: '#79503b',
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
  ellipse(ctx, x, y, radius, radius, back ? colors.back : colors.skin, colors.shade, 0.018)
  ctx.beginPath()
  ctx.arc(x - radius * 0.08, y - radius * 0.08, radius * 0.61, Math.PI * 1.04, Math.PI * 1.64)
  ctx.strokeStyle = back ? '#efb181' : colors.light
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

  segment(lower, ART.hand, (half) => {
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
 * Leg = thigh and shin-with-shoe. Both sprites are much longer than their
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

  let ankle = null
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
    ankle = half
  })

  // The shoe sits at the bottom of the shin sprite, following the shin's angle.
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
  fillStroke(ctx, back ? colors.suitShade : colors.suit, colors.outline, 0.025)
  ctx.beginPath()
  ctx.moveTo(-0.036, -0.045)
  ctx.lineTo(0.056, 0.028)
  ctx.strokeStyle = colors.trim
  ctx.lineWidth = 0.028
  ctx.stroke()
  ctx.restore()
}

function drawTorso(ctx, body, colors, k, view) {
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

    // Bikini straps and two simple fabric panels remain legible at 100 px tall.
    ctx.strokeStyle = colors.suitShade
    ctx.lineWidth = 0.048
    ctx.beginPath()
    ctx.moveTo(-0.178, -0.309)
    ctx.lineTo(-0.195, -0.092)
    ctx.moveTo(0.178, -0.309)
    ctx.lineTo(0.195, -0.092)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-0.237, -0.12)
    ctx.quadraticCurveTo(-0.142, -0.155, 0, -0.058)
    ctx.quadraticCurveTo(0.14, -0.155, 0.237, -0.12)
    ctx.lineTo(0.212, 0.014)
    ctx.quadraticCurveTo(0.097, 0.09, 0, 0.022)
    ctx.quadraticCurveTo(-0.11, 0.09, -0.212, 0.014)
    ctx.closePath()
    fillStroke(ctx, colors.suit, colors.suitShade, 0.026)
    ctx.beginPath()
    ctx.moveTo(-0.207, -0.094)
    ctx.quadraticCurveTo(-0.11, -0.092, -0.02, -0.025)
    ctx.moveTo(0.207, -0.094)
    ctx.quadraticCurveTo(0.11, -0.092, 0.02, -0.025)
    ctx.strokeStyle = colors.trim
    ctx.lineWidth = 0.019
    ctx.stroke()
    ellipse(ctx, 0, 0.002, 0.025, 0.019, colors.trim)
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

function drawHead(ctx, body, colors, k, view, playerIndex, facing) {
  inBody(ctx, body, k, view, () => {
    ctx.scale(facing, 1)
    if (playerIndex === 1) {
      // The ponytail is one clean silhouette, with a matching blue hair tie.
      ctx.beginPath()
      ctx.moveTo(-0.19, -0.181)
      ctx.bezierCurveTo(-0.39, -0.39, -0.54, -0.11, -0.407, 0.073)
      ctx.quadraticCurveTo(-0.369, 0.171, -0.441, 0.28)
      ctx.bezierCurveTo(-0.245, 0.286, -0.273, 0.068, -0.235, -0.063)
      ctx.closePath()
      fillStroke(ctx, colors.hair, colors.hairShade, 0.029)
      ctx.beginPath()
      ctx.moveTo(-0.35, -0.16)
      ctx.quadraticCurveTo(-0.414, -0.064, -0.348, 0.131)
      ctx.strokeStyle = colors.hairLight
      ctx.lineWidth = 0.025
      ctx.stroke()
      ellipse(ctx, -0.24, -0.16, 0.04, 0.081, colors.suit, colors.suitShade, 0.015)
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
    ellipse(ctx, 0.112, -0.042, 0.02, 0.041, '#372a23')
    ellipse(ctx, 0.118, -0.055, 0.005, 0.01, '#fff5d6')
    ctx.beginPath()
    ctx.moveTo(0.076, 0.145)
    ctx.quadraticCurveTo(0.126, 0.169, 0.167, 0.131)
    ctx.strokeStyle = colors.outline
    ctx.lineWidth = 0.02
    ctx.stroke()
    ellipse(ctx, 0.031, 0.082, 0.04, 0.018, 'rgba(220, 111, 77, 0.23)')
  })
}

/**
 * Draws one player from the original game's thirteen parts. Limb artwork follows
 * the real bodies; only the torso, hips and head carry hand-drawn detail.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, {position:number[], angle:number, shapes:object[]}>} parts
 * @param {number} playerIndex 0 = coral / bob; 1 = blue / ponytail
 * @param {{scale:number, centerX:number, centerY:number, floorY:number}} view
 */
export function drawRagdoll(ctx, parts, playerIndex, view) {
  if (!parts.Head || !parts.Tors || !parts.Ass) return
  const colors = PLAYERS[playerIndex % PLAYERS.length]
  const facing = playerIndex === 1 ? -1 : 1
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
  ctx.fillStyle = `rgba(154, 87, 44, ${shadowAlpha})`
  ctx.beginPath()
  ctx.ellipse(x, view.floorY + 0.045 * k * view.scale, 0.68 * k * view.scale, 0.095 * k * view.scale, 0, 0, TAU)
  ctx.fill()

  // One art unit is k metres, so this converts the original's sprite sizes,
  // which are in stage pixels, into the units the artwork is drawn in.
  const au = (px) => px / (k * PHYS_SCALE)

  // Arm -> upper arm, Hand -> forearm, Finger -> hand.
  const arm = (side, back) => drawArm(ctx, parts['Arm' + side], parts['Hand' + side], parts['Finger' + side], side === 'Left' ? -1 : 1, colors, k, view, back, au)
  // Leg -> thigh, Foot -> shin; the shoe is drawn at the bottom of the shin.
  const leg = (side, back) => drawLeg(ctx, parts['Leg' + side], parts['Foot' + side], colors, k, view, back, facing, au)

  arm(backSide, true)
  leg(backSide, true)
  leg(frontSide, false)
  drawPelvis(ctx, parts.Ass, colors, k, view)
  drawTorso(ctx, parts.Tors, colors, k, view)
  arm(frontSide, false)
  drawHead(ctx, parts.Head, colors, k, view, playerIndex, facing)
  ctx.restore()
}
