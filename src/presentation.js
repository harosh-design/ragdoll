import { FLOOR_Y, NET_X, PHYS_SCALE } from './original.js'

const m = (pixels) => pixels / PHYS_SCALE

/** Owns the physics-to-canvas adapter for one world. */
export function createPresentation() {
  const previous = new WeakMap()
  const geometry = new WeakMap()

  function capture(world) {
    for (let body = world.getBodyList(); body; body = body.getNext()) {
      const p = body.getPosition()
      previous.set(body, { x: p.x, y: p.y, angle: body.getAngle() })
    }
  }

  function shapes(body) {
    let result = geometry.get(body)
    if (result) return result
    const shape = body.getFixtureList()?.getShape()
    result = []
    if (shape?.getType() === 'circle') {
      result.push({ radius: shape.getRadius() })
    } else if (shape) {
      let hx = 0, hy = 0
      for (const v of shape.m_vertices) {
        hx = Math.max(hx, Math.abs(v.x))
        hy = Math.max(hy, Math.abs(v.y))
      }
      result.push({ width: hx * 2, height: hy * 2 })
    }
    geometry.set(body, result)
    return result
  }

  /** Box2D uses y-down; the renderer uses y-up metres relative to the net. */
  function view(body, alpha) {
    const p = body.getPosition()
    const angle = body.getAngle()
    const old = previous.get(body) ?? { x: p.x, y: p.y, angle }
    let delta = angle - old.angle
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    const velocity = body.getLinearVelocity()
    return {
      position: [old.x + (p.x - old.x) * alpha - m(NET_X),
        -(old.y + (p.y - old.y) * alpha - m(FLOOR_Y))],
      angle: -(old.angle + delta * alpha),
      velocity: [velocity.x, -velocity.y],
      shapes: shapes(body),
    }
  }

  return { capture, view }
}
