// Small creatures live behind the court so they never obscure the ball or players.
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')

const fish = [
  { x: 0.11, y: 0.555, speed: 0.012, direction: 1, size: 0.86, phase: 0.4, color: '#317e9d' },
  { x: 0.31, y: 0.616, speed: 0.009, direction: -1, size: 0.72, phase: 1.8, color: '#277b94' },
  { x: 0.73, y: 0.574, speed: 0.011, direction: -1, size: 0.9, phase: 2.6, color: '#28718d' },
  { x: 0.90, y: 0.633, speed: 0.014, direction: 1, size: 0.64, phase: 3.7, color: '#398aa1' },
]

const crabs = [
  { x: 0.10, y: 0.755, phase: 0, size: 0.68, color: '#dc6c4d' },
  { x: 0.39, y: 0.765, phase: 2.1, size: 0.75, color: '#c75b43' },
  { x: 0.91, y: 0.745, phase: 4.2, size: 0.62, color: '#d87953' },
]

function drawFish(ctx, f, v, t) {
  const unit = v.width / 1250
  const travel = ((f.x + f.direction * t * f.speed - 0.05) % 0.9 + 0.9) % 0.9
  const x = v.x + v.width * (0.05 + travel)
  const y = v.y + v.height * f.y + Math.sin(t * 2.2 + f.phase) * 3 * unit
  const tail = Math.sin(t * 8 + f.phase) * 0.28

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(f.direction * unit * f.size, unit * f.size)
  ctx.globalAlpha = 0.82
  ctx.fillStyle = f.color
  ctx.strokeStyle = 'rgba(25, 90, 112, 0.55)'
  ctx.lineWidth = 1.1

  ctx.save()
  ctx.translate(-12, 0)
  ctx.rotate(tail)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-11, -7)
  ctx.quadraticCurveTo(-7, 0, -11, 7)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.beginPath()
  ctx.moveTo(-12, 0)
  ctx.quadraticCurveTo(-5, -7, 7, -6)
  ctx.quadraticCurveTo(16, -4, 18, 0)
  ctx.quadraticCurveTo(13, 6, 5, 6)
  ctx.quadraticCurveTo(-5, 7, -12, 0)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-3, -5)
  ctx.quadraticCurveTo(-7, -12, 3, -8)
  ctx.lineTo(6, -5)
  ctx.fill()

  ctx.strokeStyle = 'rgba(193, 247, 226, 0.75)'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(-3, 3)
  ctx.quadraticCurveTo(6, 5, 13, 1)
  ctx.stroke()
  ctx.fillStyle = '#e8f8e7'
  ctx.beginPath()
  ctx.arc(11, -1.8, 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawClaw(ctx, side, wave, color) {
  ctx.save()
  ctx.translate(side * 11, -3)
  ctx.rotate(side * (0.15 + wave * 0.22))
  ctx.strokeStyle = '#944638'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(side * 7, -8)
  ctx.stroke()
  ctx.translate(side * 8, -9)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(0, 0, 6.3, 4.5, side * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#944638'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(side * 4, -2)
  ctx.lineTo(side * 9, -5)
  ctx.moveTo(side * 4, 1)
  ctx.lineTo(side * 9, 3)
  ctx.stroke()
  ctx.restore()
}

function drawCrab(ctx, crab, v, t) {
  const unit = v.width / 1250 * crab.size
  const stride = Math.sin(t * 8 + crab.phase)
  const x = v.x + v.width * crab.x + Math.sin(t * 0.7 + crab.phase) * 11 * unit
  const y = v.y + v.height * crab.y + Math.abs(stride) * 1.3 * unit

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(unit, unit)
  ctx.fillStyle = 'rgba(148, 85, 45, 0.19)'
  ctx.beginPath()
  ctx.ellipse(0, 8, 22, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#904b39'
  ctx.lineWidth = 1.9
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const lift = stride * (i % 2 === 0 ? 1 : -1) * 1.3
      ctx.beginPath()
      ctx.moveTo(side * (7 + i * 2), 2)
      ctx.lineTo(side * (15 + i * 3), 5 + lift)
      ctx.lineTo(side * (18 + i * 3), 8 + lift)
      ctx.stroke()
    }
  }
  drawClaw(ctx, -1, Math.sin(t * 3 + crab.phase), crab.color)
  drawClaw(ctx, 1, Math.sin(t * 3.4 + crab.phase + 1), crab.color)

  ctx.fillStyle = crab.color
  ctx.strokeStyle = '#934737'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(-14, 0)
  ctx.quadraticCurveTo(-13, -9, 0, -10)
  ctx.quadraticCurveTo(13, -9, 14, 0)
  ctx.quadraticCurveTo(11, 8, 0, 7)
  ctx.quadraticCurveTo(-11, 8, -14, 0)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 195, 136, 0.55)'
  ctx.beginPath()
  ctx.ellipse(-4, -5, 7, 2.1, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#934737'
  ctx.lineWidth = 1.3
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * 5, -9)
    ctx.lineTo(side * 5.5, -13)
    ctx.stroke()
    ctx.fillStyle = '#fff6da'
    ctx.beginPath()
    ctx.arc(side * 5.5, -14, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#463631'
    ctx.beginPath()
    ctx.arc(side * 5, -14.2, 1, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawJumpingFish(ctx, v, t) {
  const phase = t % 5.6
  if (phase > 1.1) return
  const arc = Math.sin((phase / 1.1) * Math.PI)
  const unit = v.width / 1250
  const x = v.x + v.width * (0.58 + phase * 0.055)
  const y = v.y + v.height * 0.66 - arc * v.height * 0.045
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.38 + phase * 0.7)
  ctx.scale(unit * 0.8, unit * 0.8)
  ctx.fillStyle = '#358fa3'
  ctx.strokeStyle = '#246c83'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-10, 0)
  ctx.lineTo(-18, -6)
  ctx.lineTo(-17, 6)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f7ecc5'
  ctx.beginPath()
  ctx.arc(6, -1.5, 1.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawAmbientLife(ctx, view, elapsedSeconds) {
  const t = reduceMotion?.matches ? 0 : elapsedSeconds
  for (const f of fish) drawFish(ctx, f, view, t)
  drawJumpingFish(ctx, view, t)
  for (const crab of crabs) drawCrab(ctx, crab, view, t)
}
