import * as p2 from 'p2-es'

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
 * @param {{ width: number, height: number, scale?: number }} size - canvas size and scale (px per unit)
 * @param {number} scale - pixels per physics unit (from size.scale or fallback)
 * @param {{ ragdolls?: Array, faceImage?: HTMLImageElement, torsoImage?: HTMLImageElement, pelvisImage?: HTMLImageElement, worldBottom?: number, worldTop?: number, worldLeft?: number, worldRight?: number }} [opts]
 */
export function render(ctx, world, size, scale, opts = {}) {
  scale = size.scale ?? scale ?? 100
  const { ragdolls = [], faceImage, torsoImage, pelvisImage, worldBottom, worldTop, worldLeft, worldRight, netHeight } = opts
  // Floor 5% above bottom of screen: world y = worldBottom maps to canvas y = 95% of height
  const floorCanvasY = size.height * 0.95
  const centerX = size.width / 2
  const centerY = worldBottom != null ? floorCanvasY - scale * (-worldBottom) : size.height / 2
  const fieldW = ((worldRight != null && worldLeft != null) ? (worldRight - worldLeft) : 20) * scale
  const fieldH = ((worldTop != null && worldBottom != null) ? (worldTop - worldBottom) : 18) * scale
  const fieldLeft = (size.width - fieldW) / 2
  const fieldTop = worldBottom != null ? floorCanvasY - scale * (worldTop - worldBottom) : (size.height - fieldH) / 2
  const playerColors = ['#e94560', '#2563eb'] // red (p1), blue (p2)
  const playerStrokeColors = ['#0f3460', '#1e3a5f']

  function getRagdollRefs(body) {
    for (let r = 0; r < ragdolls.length; r++) {
      const rd = ragdolls[r]
      const playerColor = playerColors[r]
      const strokeColor = playerStrokeColors[r]
      if (body === rd.head) return { head: rd.head, faceImage, playerIndex: r, playerColor, strokeColor }
      if (body === rd.upperBody) return { upperBody: rd.upperBody, torsoImage, playerIndex: r, playerColor, strokeColor }
      if (body === rd.pelvis) return { pelvis: rd.pelvis, pelvisImage, playerIndex: r, playerColor, strokeColor }
      if (body === rd.lowerLeftArm) return { arm: body, sign: -1, playerIndex: r, playerColor, strokeColor }
      if (body === rd.lowerRightArm) return { arm: body, sign: 1, playerIndex: r, playerColor, strokeColor }
    }
    return null
  }

  // Letterbox: full canvas black, then game field area with red/blue split
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size.width, size.height)
  ctx.save()
  ctx.beginPath()
  ctx.rect(fieldLeft, fieldTop, fieldW, fieldH)
  ctx.clip()
  ctx.fillStyle = '#2a1628'
  ctx.fillRect(fieldLeft, fieldTop, fieldW / 2, fieldH)
  ctx.fillStyle = '#16202a'
  ctx.fillRect(fieldLeft + fieldW / 2, fieldTop, fieldW / 2, fieldH)
  ctx.restore()

  function drawScene(clipLeftHalf) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(fieldLeft, fieldTop, fieldW, fieldH)
    ctx.clip()
    if (clipLeftHalf) {
      ctx.beginPath()
      ctx.rect(fieldLeft, fieldTop, fieldW / 2, fieldH)
      ctx.clip()
    } else {
      ctx.beginPath()
      ctx.rect(fieldLeft + fieldW / 2, fieldTop, fieldW / 2, fieldH)
      ctx.clip()
    }
  for (let i = 0; i < world.bodies.length; i++) {
    const body = world.bodies[i]
    if (body.isBall) continue
    if (body.type === p2.Body.STATIC) {
      if (body.isNet) continue // Center net drawn as line after both halves
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
          drawHeadFace(ctx, c.x, c.y, -angle, r * scale, faceImage, refs && refs.strokeColor)
        } else if (body.isWeight) {
          drawFoot(ctx, c.x, c.y, -angle, scale * r)
        } else {
          ctx.save()
          ctx.translate(c.x, c.y)
          ctx.rotate(-angle)
          ctx.beginPath()
          ctx.arc(0, 0, scale * r, 0, Math.PI * 2)
          ctx.fillStyle = (refs && refs.playerColor) ? refs.playerColor : '#e94560'
          ctx.fill()
          ctx.strokeStyle = (refs && refs.strokeColor) ? refs.strokeColor : '#0f3460'
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
          drawArmWithHand(ctx, pos, boxAngle, shape, scale, centerX, centerY, refs.sign, refs.playerColor, refs.strokeColor)
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
          ctx.fillStyle = (refs && refs.playerColor) ? refs.playerColor : '#e94560'
          ctx.fill()
          ctx.strokeStyle = (refs && refs.strokeColor) ? refs.strokeColor : '#0f3460'
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
    ctx.restore()
  }
  drawScene(true)
  drawScene(false)

  // Center division (net): shorter so ball can fly over; only from ground up to netHeight
  const netX = size.width / 2
  const netBottomY = centerY - scale * (worldBottom ?? 0)
  const netTopY = netHeight != null
    ? centerY - scale * ((worldBottom ?? 0) + netHeight)
    : 0
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(netX, netTopY)
  ctx.lineTo(netX, netBottomY)
  ctx.stroke()
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
function drawHeadFace(ctx, cx, cy, angle, radiusPx, img, strokeColor = '#0f3460') {
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
  ctx.strokeStyle = strokeColor
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
function drawArmWithHand(ctx, pos, boxAngle, shape, scale, centerX, centerY, sign, playerColor = '#e94560', strokeColor = '#0f3460') {
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
  ctx.fillStyle = playerColor
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 2
  ctx.stroke()

  const armHalfLen = shape.width / 2
  const handRadius = 0.12 * (shape.width / 0.4)
  const tipX = pos[0] + sign * armHalfLen * cos
  const tipY = pos[1] + sign * armHalfLen * sin
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
