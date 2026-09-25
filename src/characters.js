import { getCharacterArt } from './character-art.js'
import { DEFAULT_CHARACTERS } from './roster.js'
import { mirrorCharacterPose } from './character-pose.js'
import { drawRagdoll as drawVectorFallback } from './characters-vector.js'
import { FOREARM_SCALE } from './player.js'
import { drawSkinMesh } from './skin-mesh.js'

const TAU = Math.PI * 2
const mix = (a, b, t = 0.5) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

// A local physics point, in the original doll's y-down stage pixels; `unit`
// is screen pixels per stage pixel, times the doll's scale.
function anchor(body, x, y, view, unit) {
  const c = Math.cos(-body.angle), s = Math.sin(-body.angle)
  return {
    x: view.centerX + body.position[0] * view.scale + (x * c - y * s) * unit,
    y: view.centerY - body.position[1] * view.scale + (x * s + y * c) * unit,
  }
}

function paint(ctx, part, from, to, unit) {
  if (!part?.surface) return
  const dx = part.to[0] - part.from[0], dy = part.to[1] - part.from[1]
  ctx.save()
  ctx.translate(from.x, from.y)
  ctx.rotate(Math.atan2(to.y - from.y, to.x - from.x))
  ctx.scale(Math.hypot(to.x - from.x, to.y - from.y) / Math.hypot(dx, dy), part.width * unit)
  ctx.rotate(-Math.atan2(dy, dx))
  ctx.translate(-part.from[0], -part.from[1])
  const [x, y] = part.origin
  ctx.drawImage(part.surface, x, y)
  ctx.restore()
}

function mapped(part, from, to, unit, x, y) {
  const dx = part.to[0] - part.from[0], dy = part.to[1] - part.from[1]
  const length = Math.hypot(dx, dy), tx = to.x - from.x, ty = to.y - from.y
  const targetLength = Math.hypot(tx, ty)
  const along = ((x - part.from[0]) * dx + (y - part.from[1]) * dy) / (length * length)
  const across = (-(x - part.from[0]) * dy + (y - part.from[1]) * dx) / length * part.width * unit
  return { x: from.x + along * tx - across * ty / targetLength, y: from.y + along * ty + across * tx / targetLength }
}

export function drawRagdoll(ctx, parts, playerIndex, view) {
  const art = getCharacterArt(parts.characterId ?? DEFAULT_CHARACTERS[playerIndex])
  if (!art.ready) return drawVectorFallback(ctx, parts, playerIndex, view)
  // Reflect both the pose and its drawing when a sprite plays on the other side.
  // Swapping left/right bones keeps the painted hands on the physical hands.
  const mirror = art.template !== playerIndex
  ctx.save()
  if (mirror) {
    const headX = parts.Head.position[0]
    const center = view.centerX + headX * view.scale
    ctx.translate(center * 2, 0)
    ctx.scale(-1, 1)
    parts = mirrorCharacterPose(parts)
  }
  drawCharacter(ctx, parts, art, view)
  ctx.restore()
}

function drawCharacter(ctx, parts, art, view) {
  // A bigger doll has bigger bodies, so the art and its offsets on them scale too.
  const unit = view.scale / 30 * (parts.scale ?? 1)
  const facing = art.template === 0 ? 1 : -1
  const motion = parts.motion ?? { chest: 0, hair: 0 }
  const at = (name, x = 0, y = 0) => anchor(parts[name], x, y, view, unit)
  const waist = mix(at('Tors', 0, 5), at('Ass', 0, -13))
  const hips = at('Ass', 0, -3)
  const shoulders = mix(at('ArmLeft', 10, 0), at('ArmRight', -10, 0))
  const head = at('Head')
  const headScale = art.head.width * unit
  const headDown = { x: head.x, y: head.y + (art.head.to[1] - art.head.from[1]) * headScale }

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const lift = Math.max(0, view.floorY - hips.y - 48 * unit)
  ctx.fillStyle = `rgba(4, 2, 23, ${Math.max(0.06, 0.3 - lift / (view.height * 0.55))})`
  ctx.beginPath()
  ctx.ellipse(hips.x, view.floorY + 2 * unit, 17 * unit + lift * 0.025, 2.9 * unit, 0, 0, TAU)
  ctx.fill()

  if (art.hair) {
    const root = {
      x: head.x + (art.hair.from[0] - art.head.from[0]) * headScale,
      y: head.y + (art.hair.from[1] - art.head.from[1]) * headScale,
    }
    const dx = (art.hair.to[0] - art.hair.from[0]) * headScale
    const dy = (art.hair.to[1] - art.hair.from[1]) * headScale
    const sway = -motion.hair * 0.75
    const tip = { x: root.x + dx * Math.cos(sway) - dy * Math.sin(sway), y: root.y + dx * Math.sin(sway) + dy * Math.cos(sway) }
    paint(ctx, art.hair, root, tip, unit)
  }

  // A continuous neck follows both head and collar, rather than leaving two
  // independently rotated hard-cut edges exposed when the torso leans.
  const neckTop = mapped(art.head, head, headDown, unit, art.head.to[0], art.head.to[1] - 18)
  const collar = mapped(art.torso, shoulders, waist, unit, art.torso.from[0], art.torso.from[1] - 37)
  const neckShade = ctx.createLinearGradient(neckTop.x - 3 * unit, 0, neckTop.x + 3 * unit, 0)
  neckShade.addColorStop(0, art.shade)
  neckShade.addColorStop(0.5, art.skin)
  neckShade.addColorStop(1, art.skin)
  ctx.fillStyle = neckShade
  ctx.beginPath()
  ctx.moveTo(neckTop.x - 2.7 * unit, neckTop.y)
  ctx.lineTo(neckTop.x + 2.7 * unit, neckTop.y)
  ctx.quadraticCurveTo(collar.x + 2.6 * unit, collar.y - 2 * unit, collar.x + 4.3 * unit, collar.y + 1.5 * unit)
  ctx.lineTo(collar.x - 4.3 * unit, collar.y + 1.5 * unit)
  ctx.quadraticCurveTo(collar.x - 2.6 * unit, collar.y - 2 * unit, neckTop.x - 2.7 * unit, neckTop.y)
  ctx.fill()

  const arms = {}
  const legs = {}
  for (const side of ['Left', 'Right']) {
    const sign = side === 'Left' ? -1 : 1
    arms[side] = {
      shoulder: at('Arm' + side, -sign * 10, 0),
      elbow: mix(at('Arm' + side, sign * 9, 0), at('Hand' + side, -sign * 10 * FOREARM_SCALE, 0)),
      wrist: at('Hand' + side, sign * 12 * FOREARM_SCALE, 0),
      tip: at('Finger' + side, sign * 7.5, 0),
    }
    // Retarget the drawn hips and knees to adult proportions while retaining
    // shared joints and the original sole, hand and head contact positions.
    const hip = at('Ass', (art['thigh' + side].from[0] - art.pelvis.to[0]) * art.pelvis.width, -3)
    const physicalKnee = mix(at('Leg' + side, 0, 11), at('Foot' + side, 0, -10))
    legs[side] = { hip, knee: mix(physicalKnee, hip, 0.17), ankle: at('Foot' + side, 0, 6), sole: at('Foot' + side, facing * 2, 11.5) }
  }

  function arm(side) {
    const a = arms[side]
    drawSkinMesh(ctx, art['arm' + side],
      [art['upper' + side].from, art['lower' + side].from, art['hand' + side].from, art['hand' + side].to],
      [a.shoulder, a.elbow, a.wrist, a.tip], [67, 53, 38, 40], [0.086, 0.084, 0.077, 0.073], unit)
  }
  function leg(side) {
    const l = legs[side]
    drawSkinMesh(ctx, art['leg' + side],
      [art['thigh' + side].from, art['shin' + side].from, art['foot' + side].from, art['foot' + side].to],
      [l.hip, l.knee, l.ankle, l.sole], [97, 64, 44, 59], [0.08, 0.077, 0.074, 0.079], unit)
  }
  const back = facing === 1 ? 'Left' : 'Right'
  const front = facing === 1 ? 'Right' : 'Left'
  arm(back)
  leg(back)
  leg(front)
  drawSkinMesh(ctx, art.core, [art.torso.from, art.pelvis.from, art.pelvis.to],
    [shoulders, waist, hips], [161, 148, 181], [art.torso.width, art.pelvis.width, art.pelvis.width], unit, motion.chest * (art.softMotion ?? 1))
  arm(front)
  paint(ctx, art.head, head, headDown, unit)

  // Loose flyaway hairs respond to wind even for the tied blonde bun.
  if (art.wisps) {
    ctx.save()
    ctx.translate(head.x, head.y)
    ctx.scale(unit, unit)
    ctx.strokeStyle = 'rgba(241,219,178,0.8)'
    ctx.lineWidth = 0.28
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(5 + i * 0.5, -9 + i)
      ctx.bezierCurveTo(10 + motion.hair * 4, -5, 6 + motion.hair * 10, 3, 9 + motion.hair * 12, 5 + i * 2)
      ctx.stroke()
    }
    ctx.restore()
  }
  ctx.restore()
}
