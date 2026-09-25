// Close-up art review using exactly the same skeleton and drawing as gameplay.
import { Game } from '../src/game.js'
import { drawRagdoll } from '../src/characters.js'
import { createSecondaryMotion, updateSecondaryMotion } from '../src/motion.js'
const game = new Game({ hazards: false })
const jumping = new URLSearchParams(location.search).get('pose') === 'jump'
const characters = new URLSearchParams(location.search).get('characters')?.split(',')
for (let frame = 0; frame < 100; frame++) {
  game.frame(g => {
    if (jumping && frame === 93) { g.player1.jump(); g.player2.jump() }
  })
}
const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d')
const motion = [createSecondaryMotion(), createSecondaryMotion()]
let last = 0
function frame(now) {
  requestAnimationFrame(frame)
  const width = innerWidth, height = innerHeight
  const dpr = Math.min(devicePixelRatio, 2)
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#17132b'; ctx.fillRect(0, 0, width, height)
  const scale = Math.min(height * 0.225, width * 0.145)
  for (const [i, player] of [game.player1, game.player2].entries()) {
    const parts = { id: player.id, characterId: characters?.[i] }
    for (const [name, body] of Object.entries(player.parts)) {
      const p = body.getPosition(), v = body.getLinearVelocity()
      parts[name] = { position: [p.x - player.Head.getPosition().x, -(p.y - 355 / 30)], angle: -body.getAngle(), velocity: [v.x, -v.y], shapes: name === 'Head' ? [{radius: 1/3}] : [{height: 0.8}] }
    }
    parts.motion = updateSecondaryMotion(motion[i], parts.Tors, Math.min((now-last)/1000,0.05), now/1000)
    const ys = Object.values(player.parts).map(body => -(body.getPosition().y - 355 / 30))
    const centerY = jumping ? height * 0.5 + (Math.min(...ys) + Math.max(...ys)) * 0.5 * scale : height * 0.92
    drawRagdoll(ctx, parts, i, {scale, centerX: width * (i ? 0.73 : 0.27), centerY, floorY: jumping ? height * 1.5 : height * 0.92, width, height})
  }
  last=now
}
requestAnimationFrame(frame)
