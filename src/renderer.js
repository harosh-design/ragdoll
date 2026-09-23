import beachUrl from './assets/beach-sunset.png'
import { drawRagdoll } from './characters.js'
import { drawAmbientLife } from './ambient-life.js'

const beach = new Image()
beach.src = beachUrl

function point(body, view) {
  const p = body.interpolatedPosition ?? body.position
  return { x: view.centerX + p[0] * view.scale, y: view.centerY - p[1] * view.scale }
}

// Keep the whole physics arena in view, with sand below the collision floor.
function layout(size, opts) {
  const width = Math.min(size.width, size.height * 16 / 9)
  const height = width * 9 / 16
  const x = (size.width - width) / 2
  const y = (size.height - height) / 2
  const floorY = y + height * 0.875
  const scale = Math.min(width * 0.94 / (opts.worldRight - opts.worldLeft), height * 0.84 / (opts.worldTop - opts.worldBottom))
  return { x, y, width, height, floorY, scale, centerX: size.width / 2, centerY: floorY + opts.worldBottom * scale }
}

function drawBackground(ctx, size, v) {
  const surround = ctx.createLinearGradient(0, 0, 0, size.height)
  surround.addColorStop(0, '#72abd1')
  surround.addColorStop(0.52, '#edbb88')
  surround.addColorStop(1, '#f5c58c')
  ctx.fillStyle = surround
  ctx.fillRect(0, 0, size.width, size.height)
  if (beach.complete && beach.naturalWidth) {
    ctx.drawImage(beach, v.x, v.y, v.width, v.height)
  } else {
    const sky = ctx.createLinearGradient(0, v.y, 0, v.y + v.height * 0.7)
    sky.addColorStop(0, '#6aaadd')
    sky.addColorStop(1, '#ffc16c')
    ctx.fillStyle = sky
    ctx.fillRect(v.x, v.y, v.width, v.height * 0.68)
    ctx.fillStyle = '#48b5c2'
    ctx.fillRect(v.x, v.y + v.height * 0.51, v.width, v.height * 0.17)
    ctx.fillStyle = '#f8ce91'
    ctx.fillRect(v.x, v.y + v.height * 0.68, v.width, v.height * 0.32)
  }
}

function drawCourt(ctx, v, opts) {
  const left = v.centerX + (opts.worldLeft + 0.5) * v.scale
  const right = v.centerX + (opts.worldRight - 0.5) * v.scale
  const backY = v.floorY - v.height * 0.033
  const frontY = v.floorY + v.height * 0.046
  const inset = v.width * 0.034
  ctx.save()
  ctx.fillStyle = 'rgba(232, 169, 92, 0.12)'
  ctx.strokeStyle = '#fff2cc'
  ctx.lineWidth = Math.max(2, v.width * 0.003)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(left + inset, backY)
  ctx.lineTo(right - inset, backY)
  ctx.lineTo(right, frontY)
  ctx.lineTo(left, frontY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawShadow(ctx, x, floorY, width, height, alpha) {
  ctx.fillStyle = `rgba(132, 79, 42, ${alpha})`
  ctx.beginPath()
  ctx.ellipse(x, floorY + 2, width, height, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawNet(ctx, v, height, foreground) {
  const topY = v.floorY - height * v.scale
  const frontX = v.centerX + v.scale * 0.15
  const backX = v.centerX - v.scale * 0.38
  const depth = v.scale * 0.33
  const poleWidth = Math.max(4, v.scale * 0.16)
  const bottom = v.floorY + depth
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (!foreground) {
    drawShadow(ctx, frontX + v.scale * 0.35, bottom, v.scale * 0.72, v.scale * 0.09, 0.17)
    const meshBottom = topY + Math.max(0, height * v.scale * 0.67)
    ctx.fillStyle = 'rgba(255, 246, 215, 0.09)'
    ctx.beginPath()
    ctx.moveTo(backX, topY - depth)
    ctx.lineTo(frontX, topY)
    ctx.lineTo(frontX, meshBottom)
    ctx.lineTo(backX, meshBottom - depth)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(91, 111, 127, 0.68)'
    ctx.lineWidth = Math.max(0.7, v.scale * 0.023)
    const rows = Math.max(2, Math.ceil(height * 1.6))
    for (let row = 1; row < rows; row++) {
      const yy = topY + (meshBottom - topY) * row / rows
      ctx.beginPath()
      ctx.moveTo(backX, yy - depth)
      ctx.lineTo(frontX, yy)
      ctx.stroke()
    }
    for (let col = 1; col < 4; col++) {
      const t = col / 4
      const xx = backX + (frontX - backX) * t
      ctx.beginPath()
      ctx.moveTo(xx, topY - depth * (1 - t))
      ctx.lineTo(xx, meshBottom - depth * (1 - t))
      ctx.stroke()
    }
    ctx.strokeStyle = '#fff5d6'
    ctx.lineWidth = Math.max(2, v.scale * 0.065)
    ctx.beginPath()
    ctx.moveTo(backX, meshBottom - depth)
    ctx.lineTo(frontX, meshBottom)
    ctx.moveTo(backX, topY - depth)
    ctx.lineTo(frontX, topY)
    ctx.stroke()
    ctx.strokeStyle = '#66788c'
    ctx.lineWidth = poleWidth * 0.8
    ctx.beginPath()
    ctx.moveTo(backX, topY - depth - poleWidth * 0.3)
    ctx.lineTo(backX, v.floorY - depth)
    ctx.stroke()
  } else {
    const pole = ctx.createLinearGradient(frontX - poleWidth / 2, 0, frontX + poleWidth / 2, 0)
    pole.addColorStop(0, '#8592a5')
    pole.addColorStop(0.5, '#67768c')
    pole.addColorStop(1, '#49586f')
    ctx.strokeStyle = pole
    ctx.lineWidth = poleWidth
    ctx.beginPath()
    ctx.moveTo(frontX, topY - poleWidth * 0.35)
    ctx.lineTo(frontX, bottom)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(248, 247, 225, 0.38)'
    ctx.lineWidth = Math.max(0.8, poleWidth * 0.13)
    ctx.beginPath()
    ctx.moveTo(frontX - poleWidth * 0.24, topY + 2)
    ctx.lineTo(frontX - poleWidth * 0.24, bottom - 2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawBall(ctx, body, v) {
  const p = point(body, v)
  const r = body.shapes[0].radius * v.scale
  const height = Math.max(0, v.floorY - p.y - r)
  const proximity = Math.max(0, 1 - height / (v.scale * 10))
  drawShadow(ctx, p.x, v.floorY, r * (1.6 - proximity * 0.3), r * 0.3, proximity * 0.2)
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(-(body.interpolatedAngle ?? body.angle))
  ctx.scale(body.squashX ?? 1, body.squashY ?? 1)
  const fill = ctx.createRadialGradient(-r * 0.4, -r * 0.5, r * 0.05, 0, 0, r)
  fill.addColorStop(0, '#ffd658')
  fill.addColorStop(0.6, '#ffb422')
  fill.addColorStop(1, '#e77c09')
  ctx.fillStyle = fill
  ctx.strokeStyle = '#b96915'
  ctx.lineWidth = Math.max(1, r * 0.065)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.clip()
  ctx.strokeStyle = '#fff5cf'
  ctx.lineWidth = Math.max(1, r * 0.075)
  ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    ctx.save()
    ctx.rotate(i * Math.PI * 2 / 3 + 0.2)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(r * 0.28, -r * 0.03, r * 0.5, -r * 0.68, r * 0.12, -r * 1.03)
    ctx.moveTo(r * 0.36, r * 0.49)
    ctx.bezierCurveTo(r * 0.8, r * 0.18, r * 0.94, -r * 0.48, r * 0.48, -r * 0.92)
    ctx.stroke()
    ctx.restore()
  }
  ctx.fillStyle = 'rgba(255, 255, 230, 0.36)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.16, r * 0.3, 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawTarget(ctx, body, v) {
  const p = point(body, v)
  const r = body.shapes[0].radius * v.scale
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.fillStyle = 'rgba(255, 244, 199, 0.78)'
  ctx.strokeStyle = '#cf934b'
  ctx.lineWidth = Math.max(1, v.scale * 0.03)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = body.triggerSide === 'p1' ? '#d77650' : '#488ca2'
  ctx.lineWidth = Math.max(1.5, r * 0.12)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#ecb54c'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.19, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawDisk(ctx, body, v) {
  const p = point(body, v)
  const r = body.shapes[0].radius * v.scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(body.diskSide === 'p1' ? v.x : v.centerX, v.y, v.width / 2, v.height)
  ctx.clip()
  ctx.translate(p.x, p.y)
  ctx.rotate(-(body.interpolatedAngle ?? body.angle))
  const fill = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r)
  fill.addColorStop(0, '#c4f9ef')
  fill.addColorStop(0.6, '#64cdd6')
  fill.addColorStop(1, '#2695b1')
  ctx.fillStyle = fill
  ctx.strokeStyle = '#226b89'
  ctx.lineWidth = Math.max(1.5, r * 0.08)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#d8ffef'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export function render(ctx, world, size, opts) {
  const v = layout(size, opts)
  ctx.setTransform(size.pixelRatio ?? 1, 0, 0, size.pixelRatio ?? 1, 0, 0)
  drawBackground(ctx, size, v)
  ctx.save()
  ctx.beginPath()
  ctx.rect(v.x, v.y, v.width, v.height)
  ctx.clip()
  drawAmbientLife(ctx, v, performance.now() / 1000)
  drawCourt(ctx, v, opts)
  for (const body of world.bodies) {
    if (body.isTriggerButton) drawTarget(ctx, body, v)
    if (body.isDisk) drawDisk(ctx, body, v)
  }
  drawNet(ctx, v, opts.netHeight, false)
  opts.ragdolls.forEach((ragdoll, index) => {
    drawRagdoll(ctx, ragdoll, index, v)
  })
  drawNet(ctx, v, opts.netHeight, true)
  for (const body of world.bodies) {
    if (body.isBall) drawBall(ctx, body, v)
  }
  ctx.restore()
}
