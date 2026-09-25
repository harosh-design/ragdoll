/** Reflect about the head, swapping limb names to preserve physical contacts. */
export function mirrorCharacterPose(parts) {
  const headX = parts.Head.position[0]
  const mirrored = { ...parts, motion: { ...parts.motion, hair: -(parts.motion?.hair ?? 0) } }
  for (const [name, body] of Object.entries(parts)) {
    if (!body?.position) continue
    const opposite = name.replace(/Left|Right/, side => side === 'Left' ? 'Right' : 'Left')
    mirrored[opposite] = { ...body, position: [headX * 2 - body.position[0], body.position[1]], angle: -body.angle }
  }
  return mirrored
}
