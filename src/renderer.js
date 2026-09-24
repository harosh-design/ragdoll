import beachUrl from './assets/neon-beach.png'
import { drawRagdoll } from './characters.js'
import { drawScenery, drawForegroundPlants } from './scenery.js'

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

function drawBackground(ctx, size, v, time) {
  const surround = ctx.createLinearGradient(0, 0, 0, size.height)
  surround.addColorStop(0, '#100c30')
  surround.addColorStop(0.52, '#251044')
  surround.addColorStop(1, '#100c24')
  ctx.fillStyle = surround
  ctx.fillRect(0, 0, size.width, size.height)
  if (beach.complete && beach.naturalWidth) {
    ctx.drawImage(beach, v.x, v.y, v.width, v.height)
    // Refracting strips move the actual illustrated water, not just an overlay.
    const horizon = 0.507
    const shore = 0.712
    const strips = 45
    ctx.save()
    ctx.beginPath()
    ctx.rect(v.x, v.y + v.height * horizon, v.width, v.height * (shore - horizon))
    ctx.clip()
    for (let i = 0; i < strips; i++) {
      const t = i / strips
      const sy = (horizon + t * (shore - horizon)) * beach.naturalHeight
      const sh = (shore - horizon) * beach.naturalHeight / strips
      const drift = Math.sin(time * (0.7 + t * 0.6) + i * 0.38) * v.width * (0.0005 + t * 0.0013)
      ctx.drawImage(beach, 0, sy, beach.naturalWidth, sh + 1,
        v.x + drift - 3, v.y + sy / beach.naturalHeight * v.height,
        v.width + 6, sh / beach.naturalHeight * v.height + 1)
    }
    ctx.restore()
  } else {
    const sky = ctx.createLinearGradient(0, v.y, 0, v.y + v.height * 0.7)
    sky.addColorStop(0, '#16134e')
    sky.addColorStop(1, '#d513ab')
    ctx.fillStyle = sky
    ctx.fillRect(v.x, v.y, v.width, v.height * 0.68)
    ctx.fillStyle = '#0668a8'
    ctx.fillRect(v.x, v.y + v.height * 0.51, v.width, v.height * 0.17)
    ctx.fillStyle = '#42216a'
    ctx.fillRect(v.x, v.y + v.height * 0.68, v.width, v.height * 0.32)
  }
}

// Court markings, in stage pixels relative to the net — the same frame the
// bodies are rendered in. The floor sits on v.floorY, so the near line is drawn
// below it and the far line above it to read as a court seen almost side on.
const COURT_HALF_WIDTH_PX = 510
const COURT_NEAR_DEPTH = 0.075
const COURT_FAR_DEPTH = 0.10

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
  ctx.fillStyle = 'rgba(69, 16, 105, 0.1)'
  ctx.strokeStyle = '#ffd2ff'
  ctx.shadowColor = '#ed36ff'
  ctx.shadowBlur = v.width * 0.009
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
  ctx.moveTo(toX(0) - v.width * 0.044, farY)
  ctx.lineTo(toX(0) + v.width * 0.033, nearY)
  ctx.stroke()
  ctx.restore()
}

function drawShadow(ctx, x, floorY, width, height, alpha) {
  ctx.fillStyle = `rgba(6, 3, 24, ${alpha})`
  ctx.beginPath()
  ctx.ellipse(x, floorY + 2, width, height, 0, 0, Math.PI * 2)
  ctx.fill()
}

// The mesh crosses the court in depth, anchored to the physical centre barrier.
// Its top passes through the collider top at the players' movement plane.
function drawNet(ctx, v, height, foreground) {
  const far = { x: v.centerX - v.width * 0.044, y: v.floorY - v.height * COURT_FAR_DEPTH }
  const near = { x: v.centerX + v.width * 0.033, y: v.floorY + v.height * COURT_NEAR_DEPTH }
  const netHeight = height * v.scale
  const meshHeight = netHeight * 0.72
  const poleWidth = Math.max(3, v.width * 0.0045)
  const at = (t, drop = 0) => ({
    x: far.x + (near.x - far.x) * t,
    y: far.y + (near.y - far.y) * t - netHeight + drop,
  })
  const line = (a, b) => {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
  const pole = (p) => {
    ctx.shadowColor = '#18dbff'
    ctx.shadowBlur = poleWidth * 2.5
    ctx.strokeStyle = '#64edff'
    ctx.lineWidth = poleWidth + 2
    line({ x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - netHeight - poleWidth })
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#101633'
    ctx.lineWidth = poleWidth
    line(p, { x: p.x, y: p.y - netHeight - poleWidth })
    ctx.strokeStyle = '#d3ffff'
    ctx.lineWidth = 1
    line({ x: p.x - poleWidth / 2, y: p.y }, { x: p.x - poleWidth / 2, y: p.y - netHeight })
  }
  ctx.save()
  ctx.lineCap = 'round'
  if (foreground) {
    pole(near)
  } else {
    drawShadow(ctx, v.centerX, v.floorY, v.width * 0.05, v.height * 0.01, 0.3)
    pole(far)
    ctx.beginPath()
    const corners = [at(0), at(1), at(1, meshHeight), at(0, meshHeight)]
    corners.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))
    ctx.closePath()
    ctx.fillStyle = 'rgba(8, 9, 34, 0.28)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(14, 18, 49, 0.95)'
    ctx.lineWidth = Math.max(1, v.width * 0.0012)
    const rows = 16
    for (let row = 1; row < rows; row++) line(at(0, meshHeight * row / rows), at(1, meshHeight * row / rows))
    for (let col = 1; col < 9; col++) line(at(col / 9), at(col / 9, meshHeight))
    ctx.strokeStyle = 'rgba(114, 198, 255, 0.65)'
    ctx.lineWidth = Math.max(0.5, v.width * 0.00045)
    for (let col = 1; col < 9; col++) line(at(col / 9), at(col / 9, meshHeight))
    ctx.shadowColor = '#fa2fe7'
    ctx.shadowBlur = v.width * 0.008
    ctx.strokeStyle = '#ffb1f7'
    ctx.lineWidth = Math.max(2, v.width * 0.0025)
    line(at(0), at(1))
    line(at(0, meshHeight), at(1, meshHeight))
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
  fill.addColorStop(0, '#f6ffac')
  fill.addColorStop(0.6, '#ccff0a')
  fill.addColorStop(1, '#67db06')
  ctx.fillStyle = fill
  ctx.shadowColor = '#88ff16'
  ctx.shadowBlur = r * 1.2
  ctx.strokeStyle = '#e3ffc6'
  ctx.lineWidth = Math.max(1, r * 0.065)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.clip()
  ctx.shadowBlur = 0
  ctx.strokeStyle = '#438e32'
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
  ctx.fillStyle = 'rgba(16, 12, 44, 0.72)'
  ctx.strokeStyle = body.side === 'p1' ? '#ff78c4' : '#64e9ff'
  ctx.lineWidth = Math.max(1, v.scale * 0.03)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = body.side === 'p1' ? '#ff78c4' : '#64e9ff'
  ctx.lineWidth = Math.max(1.5, r * 0.12)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#f4c8ff'
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
  drawBackground(ctx, size, v, opts.time ?? 0)
  ctx.save()
  ctx.beginPath()
  ctx.rect(v.x, v.y, v.width, v.height)
  ctx.clip()
  drawScenery(ctx, v, opts.time ?? 0)
  drawCourt(ctx, v)
  for (const target of opts.targets) drawTarget(ctx, target, v)
  for (const disk of opts.disks) drawDisk(ctx, disk, v)
  drawNet(ctx, v, opts.netHeight, false)
  opts.players.forEach((parts, index) => drawRagdoll(ctx, parts, index, v))
  drawNet(ctx, v, opts.netHeight, true)
  drawBall(ctx, opts.ball, v)
  if (opts.serve) drawServeClock(ctx, opts.ball, v, opts.serve)
  drawForegroundPlants(ctx, v, opts.time ?? 0)
  ctx.restore()
  if (opts.hud !== false) drawScore(ctx, v, opts.score, opts.pointsToWin, opts.mode)
}

const P1_COLOR = '#ff7ccb'
const P2_COLOR = '#5bedff'

// The six-second serve clock drains around the ball in the server's hand, going
// amber for the last two seconds.
function drawServeClock(ctx, body, v, serve) {
  const p = point(body, v)
  const r = body.shapes[0].radius * v.scale * 1.75
  const left = Math.max(0, Math.min(1, serve.left))
  const color = left < 1 / 3 ? '#ffc861' : serve.player === 1 ? P1_COLOR : P2_COLOR
  ctx.save()
  ctx.lineWidth = Math.max(2, r * 0.13)
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(12, 9, 41, 0.5)'
  ctx.beginPath()
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = r * 0.45
  ctx.beginPath()
  ctx.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left)
  ctx.stroke()
  ctx.restore()
}

function drawScore(ctx, v, score, pointsToWin, mode) {
  if (!score) return
  const unit = v.width / 1600
  const cx = v.x + v.width / 2
  const cy = v.y + 27 * unit
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(unit, unit)
  ctx.fillStyle = 'rgba(12, 9, 41, 0.66)'
  ctx.strokeStyle = 'rgba(168, 127, 229, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(-106, 0, 212, 68, 22)
  ctx.fill()
  ctx.stroke()
  ctx.font = "600 32px system-ui, sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = P1_COLOR
  ctx.fillText(String(score.p1), -51, 29)
  ctx.fillStyle = P2_COLOR
  ctx.fillText(String(score.p2), 51, 29)
  ctx.font = '700 10px system-ui, sans-serif'
  ctx.fillText(mode === 'bot' ? 'BOT' : 'P2', 51, 53)
  ctx.fillStyle = P1_COLOR
  ctx.fillText(mode === 'bot' ? 'YOU' : 'P1', -51, 53)
  ctx.font = "400 20px system-ui, sans-serif"
  ctx.fillStyle = '#9d8cbd'
  ctx.fillText(':', 0, 34)
  if (pointsToWin) {
    const p1 = score.p1 === pointsToWin - 1
    const p2 = score.p2 === pointsToWin - 1
    ctx.font = "700 15px system-ui, sans-serif"
    ctx.letterSpacing = '2px'
    ctx.shadowColor = 'rgba(6, 3, 24, 0.9)'
    ctx.shadowBlur = 6
    ctx.fillStyle = p1 && p2 ? '#f4e9ff' : p1 ? P1_COLOR : p2 ? P2_COLOR : '#b9a9da'
    ctx.fillText(p1 || p2 ? 'MATCH POINT' : `FIRST TO ${pointsToWin}`, 0, 90)
  }
  ctx.restore()
}
