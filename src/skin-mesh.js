// Small triangle strips continuously skin a painted limb around its joints.
// Both sides of every joint share vertices, so rotation cannot reveal a seam.
const lerp = (a, b, t) => a + (b - a) * t
const normalize = ([x, y]) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d] }
const direction = (a, b) => normalize([b[0] - a[0], b[1] - a[1]])

function tangent(points, index) {
  const before = direction(points[Math.max(0, index - 1)], points[index === 0 ? 1 : index])
  const after = direction(points[index], points[Math.min(points.length - 1, index + 1)])
  return index === 0 ? before : index === points.length - 1 ? before : normalize([before[0] + after[0], before[1] + after[1]])
}

function curve(points, index, t) {
  const a = points[index], b = points[index + 1]
  const span = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (t < 0 || t > 1) return { point: a.map((v, axis) => lerp(v, b[axis], t)), tangent: direction(a, b) }
  const before = index ? Math.hypot(a[0] - points[index - 1][0], a[1] - points[index - 1][1]) : span
  const after = index + 2 < points.length ? Math.hypot(b[0] - points[index + 2][0], b[1] - points[index + 2][1]) : span
  const m0 = tangent(points, index).map(v => v * Math.min(before, span))
  const m1 = tangent(points, index + 1).map(v => v * Math.min(after, span))
  const t2 = t * t, t3 = t2 * t
  return {
    point: a.map((v, axis) => (2 * t3 - 3 * t2 + 1) * v + (t3 - 2 * t2 + t) * m0[axis] + (-2 * t3 + 3 * t2) * b[axis] + (t3 - t2) * m1[axis]),
    tangent: normalize(a.map((v, axis) => (6 * t2 - 6 * t) * v + (3 * t2 - 4 * t + 1) * m0[axis] + (-6 * t2 + 6 * t) * b[axis] + (3 * t2 - 2 * t) * m1[axis])),
  }
}

function triangle(ctx, texture, source, target) {
  const [s0, s1, s2] = source, [t0, t1, t2] = target
  const sx1 = s1[0] - s0[0], sy1 = s1[1] - s0[1], sx2 = s2[0] - s0[0], sy2 = s2[1] - s0[1]
  const determinant = sx1 * sy2 - sx2 * sy1
  if (Math.abs(determinant) < 0.001) return
  const tx1 = t1[0] - t0[0], ty1 = t1[1] - t0[1], tx2 = t2[0] - t0[0], ty2 = t2[1] - t0[1]
  const a = (tx1 * sy2 - tx2 * sy1) / determinant
  const b = (ty1 * sy2 - ty2 * sy1) / determinant
  const c = (tx2 * sx1 - tx1 * sx2) / determinant
  const d = (ty2 * sx1 - ty1 * sx2) / determinant
  ctx.save()
  ctx.beginPath()
  const cx = (t0[0] + t1[0] + t2[0]) / 3, cy = (t0[1] + t1[1] + t2[1]) / 3
  for (let i = 0; i < 3; i++) {
    const [x, y] = target[i], length = Math.hypot(x - cx, y - cy) || 1
    // Subpixel overlap avoids dark antialiasing lines between adjacent triangles.
    const px = x + (x - cx) / length * 0.35, py = y + (y - cy) / length * 0.35
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.clip()
  ctx.transform(a, b, c, d, t0[0] - a * s0[0] - c * s0[1], t0[1] - b * s0[0] - d * s0[1])
  ctx.drawImage(texture.surface, ...texture.origin)
  ctx.restore()
}

export function drawSkinMesh(ctx, texture, sourcePoints, targetPoints, radii, widths, unit, chest = 0) {
  const target = targetPoints.map(p => [p.x, p.y])
  const rows = []
  for (let segment = 0; segment < sourcePoints.length - 1; segment++) {
    const count = 6
    const start = segment === 0 ? -2 : 0
    const end = segment === sourcePoints.length - 2 ? count + 2 : count - 1
    for (let j = start; j <= end; j++) {
      const t = j / count
      const clamped = Math.max(0, Math.min(1, t))
      const sourceSample = curve(sourcePoints, segment, t), targetSample = curve(target, segment, t)
      const sn = sourceSample.tangent, tn = targetSample.tangent
      const [sx, sy] = sourceSample.point, [tx, targetY] = targetSample.point
      const ty = targetY + Math.exp(-(((sy - 422) / 85) ** 2)) * chest * unit * 23
      const radius = lerp(radii[segment], radii[segment + 1], clamped)
      const width = lerp(widths[segment], widths[segment + 1], clamped) * unit
      rows.push({
        source: [[sx - sn[1] * radius, sy + sn[0] * radius], [sx + sn[1] * radius, sy - sn[0] * radius]],
        target: [[tx - tn[1] * radius * width, ty + tn[0] * radius * width], [tx + tn[1] * radius * width, ty - tn[0] * radius * width]],
      })
    }
  }
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i]
    triangle(ctx, texture, [a.source[0], a.source[1], b.source[0]], [a.target[0], a.target[1], b.target[0]])
    triangle(ctx, texture, [a.source[1], b.source[1], b.source[0]], [a.target[1], b.target[1], b.target[0]])
  }
}
