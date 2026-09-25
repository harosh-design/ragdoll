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

export function layout(size, arena = 'side') {
  const aspect = arena === 'side' ? 640 / 400 : 16 / 9
  const width = Math.min(size.width, size.height * aspect)
  const height = width / aspect
  const x = (size.width - width) / 2
  const y = (size.height - height) / 2
  const floorY = y + height * (arena === 'side' ? 0.947 : 0.875)
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

// The visible silhouette is exactly the physical triangle, in both arenas.
function drawNet(ctx, v, height) {
  const top = v.floorY - height * v.scale
  const half = 10 / PHYS_SCALE * v.scale
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(v.centerX, top)
  ctx.lineTo(v.centerX + half, v.floorY)
  ctx.lineTo(v.centerX - half, v.floorY)
  ctx.closePath()
  const fill = ctx.createLinearGradient(v.centerX - half, 0, v.centerX + half, 0)
  fill.addColorStop(0, '#1a2439')
  fill.addColorStop(0.45, '#acbccc')
  fill.addColorStop(0.53, '#52687b')
  fill.addColorStop(1, '#202737')
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = '#c2d9e5'
  ctx.lineWidth = Math.max(0.6, v.width / 1600)
  ctx.stroke()
  ctx.restore()
}

function drawSideArena(ctx, size, v) {
  ctx.fillStyle = '#111b29'
  ctx.fillRect(0, 0, size.width, size.height)
  const sky = ctx.createLinearGradient(0, v.y, 0, v.floorY)
  sky.addColorStop(0, '#183449')
  sky.addColorStop(0.65, '#547987')
  sky.addColorStop(1, '#9daaa0')
  ctx.fillStyle = sky
  ctx.fillRect(v.x, v.y, v.width, v.height)
  // All landscape bands are horizontal; no receding court lines or net mesh.
  ctx.fillStyle = '#c3b99a'
  ctx.fillRect(v.x, v.floorY, v.width, v.y + v.height - v.floorY)
  ctx.fillStyle = '#ddd2ac'
  ctx.fillRect(v.x, v.floorY, v.width, Math.max(2, v.height * 0.004))
  ctx.fillStyle = 'rgba(14,31,43,.35)'
  const toX = px => v.centerX + (px - NET_PX) / PHYS_SCALE * v.scale
  ctx.fillRect(v.x, v.y, toX(-215) - v.x, v.floorY - v.y)
  ctx.fillRect(toX(840), v.y, v.x + v.width - toX(840), v.floorY - v.y)
  // Flush launch hatches at the original executer spawn positions.
  for (const x of [105, 525]) {
    const y = v.floorY - (355 + 120) / PHYS_SCALE * v.scale
    ctx.fillStyle = 'rgba(22,40,53,.35)'
    ctx.beginPath()
    ctx.arc(toX(x), y, 22 / PHYS_SCALE * v.scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(202,220,218,.25)'
    ctx.lineWidth = 2
    ctx.stroke()
  }
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

function drawTarget(ctx, body, v, cooldown) {
  const p = point(body, v)
  const w = body.shapes[0].width * v.scale
  const h = body.shapes[0].height * v.scale
  const color = cooldown > 0 ? '#e49d54' : '#eff09f'
  ctx.save()
  ctx.fillStyle = '#263a47'
  ctx.fillRect(p.x - w / 2 - 3, p.y - h / 2 - 4, w + 6, h + 8)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = cooldown > 0 ? 2 : 8
  ctx.fillRect(p.x - w / 2, p.y - h / 2, Math.max(3, w), h)
  ctx.restore()
}

function drawDisk(ctx, body, v, time) {
  const p = point(body, v)
  const r = body.shapes[0].radius * v.scale
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(-body.angle + time * 10)
  ctx.fillStyle = body.side === 1 ? '#e9b3bb' : '#afdae4'
  ctx.strokeStyle = '#273444'
  ctx.lineWidth = Math.max(1, r * 0.07)
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8
    const radius = i % 2 ? r * 0.48 : r
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#253646'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.23, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#f4edce'
  ctx.stroke()
  ctx.restore()
}

export function render(ctx, size, opts) {
  const side = opts.arena !== 'beach'
  const v = layout(size, side ? 'side' : 'beach')
  ctx.setTransform(size.pixelRatio ?? 1, 0, 0, size.pixelRatio ?? 1, 0, 0)
  if (side) drawSideArena(ctx, size, v)
  else drawBackground(ctx, size, v, opts.time ?? 0)
  ctx.save()
  ctx.beginPath()
  ctx.rect(v.x, v.y, v.width, v.height)
  ctx.clip()
  if (!side) { drawScenery(ctx, v, opts.time ?? 0); drawCourt(ctx, v) }
  for (const target of opts.targets) drawTarget(ctx, target, v, opts.hazardCooldown)
  for (const disk of opts.disks) drawDisk(ctx, disk, v, opts.time ?? 0)
  opts.players.forEach((parts, index) => drawRagdoll(ctx, parts, index, v))
  drawNet(ctx, v, opts.netHeight)
  drawBall(ctx, opts.ball, v)
  if (opts.serve) drawServeClock(ctx, opts.ball, v, opts.serve)
  if (!side) drawForegroundPlants(ctx, v, opts.time ?? 0)
  if (opts.hud !== false) drawTouchIndicators(ctx, v, opts)
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

function drawTouchIndicators(ctx, v, opts) {
  const unit = v.width / 1142
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < 2; i++) {
    const count = opts.touches?.[i] ?? 0
    const x = v.x + v.width * (i === 0 ? 0.25 : 0.75)
    const y = v.y + 48 * unit
    const color = count >= 3 ? '#ff927b' : count === 2 ? '#ffda75' : i === 0 ? P1_COLOR : P2_COLOR
    ctx.fillStyle = 'rgba(12,23,35,.78)'
    ctx.beginPath()
    ctx.roundRect(x - 113 * unit, y - 20 * unit, 226 * unit, 62 * unit, 10 * unit)
    ctx.fill()
    for (let n = 0; n < 3; n++) {
      ctx.beginPath()
      ctx.arc(x + (n - 1) * 19 * unit, y, 5 * unit, 0, Math.PI * 2)
      ctx.fillStyle = n < count ? color : '#526575'
      ctx.fill()
      if (count === 2 && n === 2) { ctx.strokeStyle = color; ctx.lineWidth = 2 * unit; ctx.stroke() }
    }
    ctx.font = '600 ' + 11 * unit + 'px system-ui, sans-serif'
    ctx.fillStyle = color
    const label = count === 2 ? 'ОСТАЛОСЬ 3-Е КАСАНИЕ' : count >= 3 ? 'ЛИМИТ: БОЛЬШЕ НЕ КАСАТЬСЯ' : 'КАСАНИЯ · ' + count + ' / 3'
    ctx.fillText(label, x, y + 23 * unit)
    if (opts.impaled?.[i]) {
      ctx.fillStyle = '#ffda75'
      ctx.fillText('НА ОСТРИЕ · ПРЫГАЙТЕ ДЛЯ ВЫХОДА', x, y + 62 * unit)
    }
  }
  ctx.restore()
}
