import * as pl from 'planck'
import { NET_X, NET_TOP_Y, PHYS_SCALE } from './original.js'

const tip = () => pl.Vec2(NET_X / PHYS_SCALE, NET_TOP_Y / PHYS_SCALE)

/** A sliding pin allows rotation and withdrawal along the spike, with dry
 * friction proportional to penetration and the pierced cross-section. */
export class Spike {
  constructor(world, net, players) {
    this.world = world
    this.net = net
    this.pins = new Map()
    this.pending = new Map()
    this.players = players
    this.dt = 1 / 28
    for (const player of players) player.spike = this
    world.on('pre-solve', contact => {
      const a = contact.getFixtureA(), b = contact.getFixtureB()
      const fixture = a.getBody() === net ? b : b.getBody() === net ? a : null
      const body = fixture?.getBody()
      if (!body?.getUserData()?.player) return
      if (this.pins.has(body) || this.pending.has(body)) {
        contact.setEnabled(false)
        return
      }
      const points = contact.getWorldManifold(null)?.points ?? []
      // Side collisions remain solid. Only a downward impact at the sharp tip
      // can pierce a limb; checking the manifold also catches fast impacts.
      if (body.getLinearVelocityFromWorldPoint(tip()).y > 0.05
        && (fixture.testPoint(tip()) || points.some(p => Math.abs(p.x - tip().x) < 0.12 && Math.abs(p.y - tip().y) < 0.16))) {
        contact.setEnabled(false)
        this.pending.set(body, body.getLocalPoint(tip()))
      }
    })
  }

  pierce(body, entry) {
    if (this.pins.has(body)) return
    const player = body.getUserData().player
    const shape = body.getFixtureList().getShape()
    const area = shape.getType() === 'circle'
      ? Math.PI * (shape.getRadius() * PHYS_SCALE) ** 2
      : Math.abs(shape.m_vertices.reduce((a, p, i, vertices) => {
        const q = vertices[(i + 1) % vertices.length]
        return a + p.x * q.y - q.x * p.y
      }, 0)) * PHYS_SCALE ** 2 / 2
    const localEntry = entry ?? body.getLocalPoint(tip())
    // A tiny nonzero spring avoids an uninitialized-axis bug in Planck 1.5
    // at exactly 0 Hz, with negligible force along the withdrawal axis.
    const slide = this.world.createJoint(pl.WheelJoint({ frequencyHz: 0.001, dampingRatio: 0,
      localAnchorA: this.net.getLocalPoint(tip()), localAnchorB: localEntry, localAxisA: pl.Vec2(0, 1),
    }, this.net, body))
    this.pins.set(body, { body, player, localEntry, slide, area, depth: 0 })
  }

  release(body) {
    const pin = this.pins.get(body)
    if (!pin) return
    this.world.destroyJoint(pin.slide)
    this.pins.delete(body)
  }

  update() {
    for (const [body, entry] of this.pending) this.pierce(body, entry)
    this.pending.clear()
    for (const pin of this.pins.values()) {
      const entry = pin.body.getWorldPoint(pin.localEntry)
      pin.depth = Math.max(0, (entry.y - tip().y) * PHYS_SCALE)
      if (entry.y < tip().y - 0.06) {
        this.release(pin.body)
        continue
      }
      // Supports the caught doll at rest, yet yields to jump impulses. Progress
      // is physical sliding, never a teleport or a timed automatic release.
      pin.resistance = 1 + pin.area / 240 + pin.depth / 12
    }
  }

  beforeStep(dt) {
    this.dt = dt
    const gravity = Math.abs(this.world.getGravity().y)
    for (const player of this.players) {
      const pins = this.caught(player)
      if (!pins.length) continue
      const bodies = Object.values(player.parts)
      const mass = bodies.reduce((sum, body) => sum + body.getMass(), 0)
      const vy = bodies.reduce((sum, body) => sum + body.getMass() * body.getLinearVelocity().y, 0) / mass
      const resistance = pins.reduce((sum, pin) => sum + pin.resistance, 0)
      const limit = mass * Math.max(1, gravity) * resistance * dt
      const drag = Math.max(-limit, Math.min(limit, -mass * (vy + gravity * dt)))
      // Distribute the reaction through the connected doll. Using impulse
      // friction avoids locking rotation or restoring a previous penetration.
      for (const body of bodies) body.applyLinearImpulse(pl.Vec2(0, drag * body.getMass() / mass), body.getWorldCenter(), true)
    }
  }

  caught(player) {
    return [...this.pins.values()].filter(pin => pin.player === player)
  }

  jump(player, impulse) {
    const pins = this.caught(player)
    if (!pins.length) return false
    const resistance = pins.reduce((sum, pin) => sum + (pin.resistance ?? 1), 0)
    const totalMass = Object.values(player.parts).reduce((sum, body) => sum + body.getMass(), 0)
    if (impulse <= 0) return true
    const gravity = Math.abs(this.world.getGravity().y)
    // Overcome static grip for this attempt; the remaining launch speed falls
    // with resistance. Subsequent frames dissipate it through actual friction.
    const kick = totalMass * (gravity * (1 + resistance) * this.dt + impulse * 0.7 / Math.sqrt(resistance))
    for (const body of Object.values(player.parts)) {
      body.applyLinearImpulse(pl.Vec2(0, -kick * body.getMass() / totalMass), body.getWorldCenter(), true)
    }
    return true
  }

  clear() {
    for (const body of this.pins.keys()) this.release(body)
    this.pending.clear()
  }
}
