import { windAt } from './motion.js'

const palms = [
  { x: 28, y: 632, h: 305, lean: 29, phase: 1, far: true },
  { x: 1580, y: 632, h: 320, lean: -46, phase: 3, far: true },
  { x: -26, y: 626, h: 517, lean: 111, phase: 0 },
  { x: 1615, y: 625, h: 490, lean: -115, phase: 2 },
  { x: 1595, y: 641, h: 350, lean: -35, phase: 4 },
]

let frond
function palmFrond() {
  if (frond) return frond
  frond = new Path2D()
  frond.moveTo(0, 0)
  frond.quadraticCurveTo(75, -45, 174, 43)
  frond.quadraticCurveTo(90, -28, 0, 0)
  for (let i = 1; i < 16; i++) {
    const t = i / 16
    const x = t * 174
    const y = -72 * t + 115 * t * t
    const length = Math.sin(t * Math.PI) * 43 + 8
    frond.moveTo(x - 9, y)
    frond.quadraticCurveTo(x + 8, y - length * 0.65, x + 22, y - length)
    frond.quadraticCurveTo(x + 9, y - 9, x + 5, y + 1)
    frond.closePath()
    frond.moveTo(x - 5, y)
    frond.quadraticCurveTo(x + 4, y + length * 0.6, x + 19, y + length)
    frond.quadraticCurveTo(x + 12, y + 9, x + 7, y + 1)
    frond.closePath()
  }
  return frond
}

function drawPalm(ctx, palm, time) {
  const gust = windAt(time, palm.phase)
  const tipX = palm.lean + Math.sin(time * 0.66 + palm.phase) * palm.h * 0.016
  const tipY = -palm.h + Math.sin(time * 0.91 + palm.phase) * 2
  ctx.save()
  ctx.translate(palm.x, palm.y)
  ctx.fillStyle = palm.far ? '#161342' : '#080b26'
  ctx.strokeStyle = palm.far ? '#50236b' : '#90206f'
  ctx.lineWidth = palm.far ? 0.8 : 1.6
  ctx.beginPath()
  ctx.moveTo(-12, 0)
  ctx.quadraticCurveTo(tipX * 0.35 - 9, tipY * 0.48, tipX - 5, tipY)
  ctx.lineTo(tipX + 6, tipY)
  ctx.quadraticCurveTo(tipX * 0.48 + 9, tipY * 0.45, 11, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.translate(tipX, tipY)
  const scale = palm.h / 490
  ctx.scale(scale, scale)
  for (let i = 0; i < 9; i++) {
    const side = i < 5 ? 1 : -1
    const index = i < 5 ? i : i - 5
    ctx.save()
    ctx.scale(side, 1)
    ctx.rotate(-1.15 + index * 0.58 + gust * 0.07 + Math.sin(time * 1.4 + i + palm.phase) * 0.035)
    ctx.scale(0.78 + (i % 3) * 0.12, 0.8 + (i % 2) * 0.22)
    ctx.fill(palmFrond())
    // Only a fine edge catches sunset light; dark leaflets remain silhouettes.
    ctx.save()
    ctx.globalAlpha = palm.far ? 0.1 : 0.2
    ctx.lineWidth = 0.55
    ctx.stroke(palmFrond())
    ctx.restore()
    ctx.restore()
  }
  ctx.restore()
}

export function drawScenery(ctx, v, time) {
  ctx.save()
  ctx.translate(v.x, v.y)
  ctx.scale(v.width / 1600, v.height / 900)
  // Sparse stars breathe gently; the painted sky remains the main texture.
  for (let i = 0; i < 22; i++) {
    const x = (i * 173.73 + 153) % 1540 + 30
    const y = (i * 83.31) % 290 + 30
    ctx.fillStyle = `rgba(184,229,255,${0.18 + (Math.sin(time * 1.2 + i) + 1) * 0.22})`
    ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1)
  }
  // Travelling broken glints, with speed and wavelength increasing toward shore.
  for (let row = 0; row < 16; row++) {
    const depth = row / 15
    const y = 458 + depth * depth * 170
    ctx.strokeStyle = row % 3 === 0 ? 'rgba(255,97,221,0.28)' : `rgba(67,243,255,${0.08 + depth * 0.19})`
    ctx.lineWidth = 0.6 + depth * 1.6
    ctx.beginPath()
    for (let i = 0; i < 14; i++) {
      const x = ((i * 127.3 + row * 69 + time * (5 + depth * 12)) % 1760) - 100
      const yy = y + Math.sin(time * 1.5 + i + row) * (1 + depth * 3)
      ctx.moveTo(x, yy)
      ctx.quadraticCurveTo(x + 12, yy - 2, x + 22 + depth * 28, yy)
    }
    ctx.stroke()
  }
  for (const palm of palms) drawPalm(ctx, palm, time)
  ctx.restore()
}

// Rooted foliage frames the bottom corners. All leaf bases stay fixed; only
// the fronds bend with wind. The playable centre remains completely clear.
export function drawForegroundPlants(ctx, v, time) {
  ctx.save()
  ctx.translate(v.x, v.y)
  ctx.scale(v.width / 1600, v.height / 900)
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side === -1 ? -24 : 1624, 935)
    ctx.scale(-side, 1)
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 6; i++) {
        ctx.save()
        ctx.translate(i * 7, layer * 18)
        ctx.rotate(-1.28 + i * 0.21 + windAt(time, i + side) * 0.025)
        const length = (1.18 - i * 0.065) * (layer ? 0.75 : 1)
        ctx.scale(length, 0.85)
        const fill = ctx.createLinearGradient(0, -45, 50, 45)
        fill.addColorStop(0, layer ? '#091d27' : '#133739')
        fill.addColorStop(0.5, layer ? '#081827' : '#102d32')
        fill.addColorStop(1, '#060b20')
        ctx.fillStyle = fill
        ctx.fill(palmFrond())
        ctx.strokeStyle = side < 0 ? 'rgba(217,55,139,0.23)' : 'rgba(59,209,201,0.24)'
        ctx.lineWidth = 0.65
        ctx.stroke(palmFrond())
        ctx.restore()
      }
    }
    ctx.restore()
  }
  ctx.restore()
}
