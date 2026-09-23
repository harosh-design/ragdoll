import beachUrl from './assets/beach-sunset.png'
import { drawRagdoll } from './characters.js'
import { drawAmbientLife } from './ambient-life.js'

const beach = new Image()
beach.src = beachUrl

function point(body, view) {
  const p = body.position
  return { x: view.centerX + p[0] * view.scale, y: view.centerY - p[1] * view.scale }
}

// The original's stage shows world x -221..921 and puts the floor near the
// bottom; the same span is used here so players, net and ball keep the
// proportions they have in the Flash game.
const VIEW_LEFT_PX = -221
const VIEW_RIGHT_PX = 921
const NET_PX = 320
const PHYS_SCALE = 30

function layout(size) {
  const width = Math.min(size.width, size.height * 16 / 9)
  const height = width * 9 / 16
  const x = (size.width - width) / 2
  const y = (size.height - height) / 2
  const floorY = y + height * 0.875
  const spanPx = VIEW_RIGHT_PX - VIEW_LEFT_PX
  const scale = width / (spanPx / PHYS_SCALE)
  const centerX = x + width * ((NET_PX - VIEW_LEFT_PX) / spanPx)
  return { x, y, width, height, floorY, scale, centerX, centerY: floorY }
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

// Court markings, in stage pixels relative to the net — the same frame the
// bodies are rendered in. The floor sits on v.floorY, so the near line is drawn
// below it and the far line above it to read as a court seen almost side on.
const COURT_HALF_WIDTH_PX = 300
const COURT_NEAR_DEPTH = 0.055
const COURT_FAR_DEPTH = 0.038

function drawCourt(ctx, v) {
  const toX = (px) => v.centerX + (px / 30) * v.scale
  const nearY = v.floorY + v.height * COURT_NEAR_DEPTH
  const farY = v.floorY - v.height * COURT_FAR_DEPTH
  // Perspective: the far line is the narrower one.
  const inset = (toX(COURT_HALF_WIDTH_PX) - toX(-COURT_HALF_WIDTH_PX)) * 0.055
  const nearLeft = toX(-COURT_HALF_WIDTH_PX)
  const nearRight = toX(COURT_HALF_WIDTH_PX)
  const farLeft = nearLeft + inset
  const farRight = nearRight - inset

  ctx.save()
  ctx.fillStyle = 'rgba(232, 169, 92, 0.12)'
  ctx.strokeStyle = '#fff2cc'
  ctx.lineWidth = Math.max(1.5, v.width * 0.0022)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(farLeft, farY)
  ctx.lineTo(farRight, farY)
  ctx.lineTo(nearRight, nearY)
  ctx.lineTo(nearLeft, nearY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // Centre line, under the net.
  ctx.beginPath()
  ctx.moveTo(toX(0) + (farLeft + farRight) / 2 - (nearLeft + nearRight) / 2, farY)
  ctx.lineTo(toX(0), nearY)
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
  ctx.rotate(-body.angle)
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
  ctx.strokeStyle = body.side === 'p1' ? '#d77650' : '#488ca2'
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
  ctx.rect(body.side === 'p1' ? v.x : v.centerX, v.y, v.width / 2, v.height)
  ctx.clip()
  ctx.translate(p.x, p.y)
  ctx.rotate(-body.angle)
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

export function render(ctx, size, opts) {
  const v = layout(size)
  ctx.setTransform(size.pixelRatio ?? 1, 0, 0, size.pixelRatio ?? 1, 0, 0)
  drawBackground(ctx, size, v)
  ctx.save()
  ctx.beginPath()
  ctx.rect(v.x, v.y, v.width, v.height)
  ctx.clip()
  drawAmbientLife(ctx, v, performance.now() / 1000)
  drawCourt(ctx, v)
  for (const target of opts.targets) drawTarget(ctx, target, v)
  for (const disk of opts.disks) drawDisk(ctx, disk, v)
  drawNet(ctx, v, opts.netHeight, false)
  opts.players.forEach((parts, index) => drawRagdoll(ctx, parts, index, v))
  drawNet(ctx, v, opts.netHeight, true)
  drawBall(ctx, opts.ball, v)
  ctx.restore()
  drawScore(ctx, v, opts.score)
}

function drawScore(ctx, v, score) {
  if (!score) return
  const fontSize = Math.max(16, v.height * 0.062)
  ctx.save()
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, 'Segoe UI', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const text = `${score.p1} - ${score.p2}`
  const cx = v.x + v.width / 2
  const cy = v.y + v.height * 0.035
  ctx.lineWidth = Math.max(3, fontSize * 0.16)
  ctx.strokeStyle = 'rgba(58, 34, 20, 0.55)'
  ctx.strokeText(text, cx, cy)
  ctx.fillStyle = '#fff4d8'
  ctx.fillText(text, cx, cy)
  ctx.restore()
}
