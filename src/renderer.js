import * as p2 from 'p2-es'
import { LOWER_ARM_LENGTH } from './ragdoll.js'

/**
 * Transform world coords (p2: y-up) to canvas (y-down), with scale and center.
 * @param {number} x - world x
 * @param {number} y - world y
 * @param {number} scale - pixels per physics unit
 * @param {number} centerX - canvas center x
 * @param {number} centerY - canvas center y
 */
function toCanvas(x, y, scale, centerX, centerY) {
  return {
    x: centerX + scale * x,
    y: centerY - scale * y,
  }
}

/**
 * Draw the physics world to canvas. Y-up (p2) -> Y-down (canvas).
 * @param {CanvasRenderingContext2D} ctx
 * @param {p2.World} world
 * @param {{ width: number, height: number }} size - canvas size
 * @param {number} scale - pixels per physics unit (e.g. 100)
 * @param {{ ragdolls?: Array<{ head: p2.Body, upperBody: p2.Body, pelvis: p2.Body, lowerLeftArm: p2.Body, lowerRightArm: p2.Body }>, faceImage?: HTMLImageElement, torsoImage?: HTMLImageElement, pelvisImage?: HTMLImageElement, worldBottom?: number }} [opts]
 */
export function render(ctx, world, size, scale = 100, opts = {}) {
  const { ragdolls = [], faceImage, torsoImage, pelvisImage, worldBottom } = opts
  const centerX = size.width / 2
  const centerY = size.height / 2

  function getRagdollRefs(body) {
    for (let r = 0; r < ragdolls.length; r++) {
      const rd = ragdolls[r]
      if (body === rd.head) return { head: rd.head, faceImage }
      if (body === rd.upperBody) return { upperBody: rd.upperBody, torsoImage }
      if (body === rd.pelvis) return { pelvis: rd.pelvis, pelvisImage }
      if (body === rd.lowerLeftArm) return { arm: body, sign: -1 }
      if (body === rd.lowerRightArm) return { arm: body, sign: 1 }
    }
    return null
  }

  ctx.fillStyle = '#16213e'
  ctx.fillRect(0, 0, size.width, size.height)

  for (let i = 0; i < world.bodies.length; i++) {
    const body = world.bodies[i]
    if (body.isBall) continue
    if (body.type === p2.Body.STATIC) {
      const hasPlane = body.shapes.some((s) => s.type === p2.Shape.PLANE)
      if (hasPlane) {
        drawGround(ctx, body, scale, centerX, centerY, size)
      } else {
        drawStaticBox(ctx, body, scale, centerX, centerY)
      }
      continue
    }

    const pos = body.interpolatedPosition ?? body.position
    const angle = body.interpolatedAngle ?? body.angle

    const refs = getRagdollRefs(body)
    for (let j = 0; j < body.shapes.length; j++) {
      const shape = body.shapes[j]
      if (shape.type === p2.Shape.CIRCLE) {
        const r = shape.radius
        const c = toCanvas(pos[0], pos[1], scale, centerX, centerY)
        const isHead = refs && refs.head === body && faceImage && faceImage.complete
        if (isHead) {
          drawHeadFace(ctx, c.x, c.y, -angle, r * scale, faceImage)
        } else if (body.isWeight) {
          drawFoot(ctx, c.x, c.y, -angle, scale * r)
        } else {
          ctx.save()
          ctx.translate(c.x, c.y)
          ctx.rotate(-angle)
          ctx.beginPath()
          ctx.arc(0, 0, scale * r, 0, Math.PI * 2)
          ctx.fillStyle = '#e94560'
          ctx.fill()
          ctx.strokeStyle = '#0f3460'
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.restore()
        }
      } else if (shape.type === p2.Shape.BOX) {
        const hw = shape.width / 2
        const hh = shape.height / 2
        const ox = shape.position ? shape.position[0] : 0
        const oy = shape.position ? shape.position[1] : 0
        const oa = shape.angle || 0
        const boxAngle = angle + oa
        const isTorso = refs && refs.upperBody === body && torsoImage && torsoImage.complete
        const isPelvis = refs && refs.pelvis === body && pelvisImage && pelvisImage.complete
        if (isTorso || isPelvis) {
          const img = isTorso ? torsoImage : pelvisImage
          drawBoxWithTexture(ctx, pos, boxAngle, shape, scale, centerX, centerY, img)
        } else if (refs && refs.arm === body) {
          drawArmWithHand(ctx, pos, boxAngle, shape, scale, centerX, centerY, refs.sign)
        } else {
          const cos = Math.cos(boxAngle)
          const sin = Math.sin(boxAngle)
          const verts = [
            [-hw + ox, -hh + oy],
            [hw + ox, -hh + oy],
            [hw + ox, hh + oy],
            [-hw + ox, hh + oy],
          ]
          ctx.beginPath()
          for (let v = 0; v < verts.length; v++) {
            const wx = pos[0] + verts[v][0] * cos - verts[v][1] * sin
            const wy = pos[1] + verts[v][0] * sin + verts[v][1] * cos
            const p = toCanvas(wx, wy, scale, centerX, centerY)
            if (v === 0) ctx.moveTo(p.x, p.y)
            else ctx.lineTo(p.x, p.y)
          }
          ctx.closePath()
          ctx.fillStyle = '#e94560'
          ctx.fill()
          ctx.strokeStyle = '#0f3460'
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }
    }
  }

  // Мяч как в Interactive Bouncing Ball: градиент, блик, squash/stretch, тень
  const floorY = worldBottom != null ? centerY - scale * worldBottom : centerY + scale * 4
  for (let i = 0; i < world.bodies.length; i++) {
    const body = world.bodies[i]
    if (!body.isBall) continue
    const pos = body.interpolatedPosition ?? body.position
    const angle = body.interpolatedAngle ?? body.angle
    for (let j = 0; j < body.shapes.length; j++) {
      const shape = body.shapes[j]
      if (shape.type === p2.Shape.CIRCLE) {
        const r = shape.radius
        const c = toCanvas(pos[0], pos[1], scale, centerX, centerY)
        const rPx = scale * r
        const squashX = body.squashX ?? 1
        const squashY = body.squashY ?? 1
        const shadowOpacity = Math.max(0, 1 - (floorY - c.y - rPx) / (scale * 3))
        const shadowWidth = rPx * 1.5 * (1 + shadowOpacity * 0.5)
        ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity * 0.3})`
        ctx.beginPath()
        ctx.ellipse(c.x, floorY + 5, shadowWidth, shadowWidth * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(-angle)
        ctx.scale(squashX, squashY)
        const gradient = ctx.createRadialGradient(
          -rPx * 0.3, -rPx * 0.3, 0,
          0, 0, rPx
        )
        gradient.addColorStop(0, '#fbbf24')
        gradient.addColorStop(0.7, '#f59e0b')
        gradient.addColorStop(1, '#d97706')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(0, 0, rPx, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.beginPath()
        ctx.arc(-rPx * 0.3, -rPx * 0.3, rPx * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  }
}

/**
 * Draw face image as head: circular clip, image scaled to diameter.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - canvas x of head center
 * @param {number} cy - canvas y of head center
 * @param {number} angle - head angle (radians)
 * @param {number} radiusPx - head radius in pixels
 * @param {HTMLImageElement} img
 */
function drawHeadFace(ctx, cx, cy, angle, radiusPx, img) {
  const d = radiusPx * 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.arc(0, 0, radiusPx, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, -radiusPx, -radiusPx, d, d)
  ctx.restore()
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.arc(0, 0, radiusPx, 0, Math.PI * 2)
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

/**
 * Draw a box body with a texture image (torso or pelvis). Clips to the rotated box and fills with image.
 */
function drawBoxWithTexture(ctx, pos, boxAngle, shape, scale, centerX, centerY, img) {
  const c = toCanvas(pos[0], pos[1], scale, centerX, centerY)
  const wPx = shape.width * scale
  const hPx = shape.height * scale
  ctx.save()
  ctx.translate(c.x, c.y)
  ctx.rotate(-boxAngle)
  ctx.beginPath()
  ctx.rect(-wPx / 2, -hPx / 2, wPx, hPx)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, -wPx / 2, -hPx / 2, wPx, hPx)
  ctx.restore()
  ctx.save()
  ctx.translate(c.x, c.y)
  ctx.rotate(-boxAngle)
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 2
  ctx.strokeRect(-wPx / 2, -hPx / 2, wPx, hPx)
  ctx.restore()
}

/** Простая ступня — круг с цветом кожи. */
function drawFoot(ctx, cx, cy, angle, radiusPx) {
  const footRadius = radiusPx * 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.arc(0, 0, footRadius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = '#ffd0b0'
  ctx.fill()
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

/** Предплечье с ладонью на конце. */
function drawArmWithHand(ctx, pos, boxAngle, shape, scale, centerX, centerY, sign) {
  const hw = shape.width / 2
  const hh = shape.height / 2
  const ox = shape.position ? shape.position[0] : 0
  const oy = shape.position ? shape.position[1] : 0
  const oa = shape.angle || 0
  const cos = Math.cos(boxAngle)
  const sin = Math.sin(boxAngle)
  const verts = [
    [-hw + ox, -hh + oy],
    [hw + ox, -hh + oy],
    [hw + ox, hh + oy],
    [-hw + ox, hh + oy],
  ]
  ctx.beginPath()
  for (let v = 0; v < verts.length; v++) {
    const wx = pos[0] + verts[v][0] * cos - verts[v][1] * sin
    const wy = pos[1] + verts[v][0] * sin + verts[v][1] * cos
    const p = toCanvas(wx, wy, scale, centerX, centerY)
    if (v === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
  ctx.closePath()
  ctx.fillStyle = '#e94560'
  ctx.fill()
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 2
  ctx.stroke()

  const handRadius = 0.12
  const tipX = pos[0] + sign * (LOWER_ARM_LENGTH / 2) * cos
  const tipY = pos[1] + sign * (LOWER_ARM_LENGTH / 2) * sin
  const handC = toCanvas(tipX, tipY, scale, centerX, centerY)
  ctx.beginPath()
  ctx.arc(handC.x, handC.y, scale * handRadius, 0, Math.PI * 2)
  ctx.fillStyle = '#ffd0b0'
  ctx.fill()
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawGround(ctx, body, scale, centerX, centerY, size) {
  const pos = body.position
  const angle = body.angle
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const len = Math.max(size.width, size.height) / scale + 2
  const ax = pos[0] - len * cos
  const ay = pos[1] - len * sin
  const bx = pos[0] + len * cos
  const by = pos[1] + len * sin
  const a = toCanvas(ax, ay, scale, centerX, centerY)
  const b = toCanvas(bx, by, scale, centerX, centerY)
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 4
  ctx.stroke()
}

function drawStaticBox(ctx, body, scale, centerX, centerY) {
  const pos = body.position
  const angle = body.angle
  for (let j = 0; j < body.shapes.length; j++) {
    const shape = body.shapes[j]
    if (shape.type !== p2.Shape.BOX) continue
    const hw = shape.width / 2
    const hh = shape.height / 2
    const ox = shape.position ? shape.position[0] : 0
    const oy = shape.position ? shape.position[1] : 0
    const oa = shape.angle || 0
    const cos = Math.cos(angle + oa)
    const sin = Math.sin(angle + oa)
    const verts = [
      [-hw + ox, -hh + oy],
      [hw + ox, -hh + oy],
      [hw + ox, hh + oy],
      [-hw + ox, hh + oy],
    ]
    ctx.beginPath()
    for (let v = 0; v < verts.length; v++) {
      const wx = pos[0] + verts[v][0] * cos - verts[v][1] * sin
      const wy = pos[1] + verts[v][0] * sin + verts[v][1] * cos
      const p = toCanvas(wx, wy, scale, centerX, centerY)
      if (v === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fillStyle = '#0f3460'
    ctx.fill()
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}
