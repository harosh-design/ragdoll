# Character sprites

`player-magenta.png` and `player-cyan.png` are 1024 × 1536 RGBA sprites created
with the built-in `image_gen` tool. The renderer binds independently masked parts
to the game's skeleton, with hair and chest secondary motion. Natural anatomy,
faces, hands, feet and dimensional shading replace the earlier vector dolls.

The generator rejected the requested reference-style swimsuit variants. The
integrated sprites therefore wear athletic tops and shorts in the same side colors.

## Magenta sprite prompt

```text
Use case: stylized-concept. Make one production sprite of an adult 28-year-old female beach volleyball athlete, isolated on a transparent RGBA background. Realistic hand-painted 2D sports game art with subtle outlines and natural adult proportions, realistic face and hands, soft warm lighting and restrained colored rim light. Full body, barefoot, neutral A-pose: upright front-facing body, straight arms extending diagonally downward away from sides, straight legs with a clear gap, toes on the same baseline. Every limb clearly separated and fully visible. She wears a fitted sleeveless athletic crop top and opaque high-waisted sport shorts. This is a neutral sports character model for animation. No equipment, scenery, text, shadow, grid, additional people or extra body parts. Portrait composition 1024x1536; crown near y=100, shoulders y=330, hips y=780, knees y=1080, soles y=1450. Leave clear empty margins. Magenta color scheme. Burgundy hair tied in a long high ponytail sweeping toward screen-left, realistic green eyes, head turned slightly toward screen-right, confident composed expression, rose-magenta sportswear. Small pink wristbands and magenta knee bands. Detailed professional game artwork.
```

## Cyan sprite prompt

```text
Use case: stylized-concept. Make one production sprite of an adult 28-year-old female beach volleyball athlete, isolated on a transparent RGBA background. Realistic hand-painted 2D sports game art with subtle outlines and natural adult proportions, realistic face and hands, soft warm lighting and restrained colored rim light. Full body, barefoot, neutral A-pose: upright front-facing body, straight arms extending diagonally downward away from sides, straight legs with a clear gap, toes on the same baseline. Every limb clearly separated and fully visible. She wears a fitted sleeveless athletic crop top and opaque high-waisted sport shorts. This is a neutral sports character model for animation. No equipment, scenery, text, shadow, grid, additional people or extra body parts. Portrait composition 1024x1536; crown near y=100, shoulders y=330, hips y=780, knees y=1080, soles y=1450. Leave clear empty margins. Cyan color scheme. Blonde hair tied in a loose high bun, realistic green eyes, head turned slightly toward screen-left, confident composed expression, cyan sportswear. Small blue wristbands and cyan knee bands. Detailed professional game artwork.
```

# Neon beach background

`neon-beach.png` is the current production background. It was created with the
built-in `image_gen` tool from the user's attached neon beach reference.
Characters, palms, leaves, court lines, net and ball are rendered separately;
the ocean texture receives animated refraction in Canvas.

Generation prompt:

```text
Use case: precise-object-edit. Asset type: clean background plate for an animated Canvas 2D beach volleyball game, landscape 16:9. Image 1 is the edit target. Remove both women completely, all volleyball equipment, posts, net, ball, court lines, their shadows, and ALL palm trees/foliage, including the large foreground trees and small distant palms. Reconstruct background seamlessly. Preserve the reference's indigo starry sky, hot magenta setting sun centered at 50% width on a horizon at 50% image height, violet distant mountain island on right with tiny amber village lights, electric turquoise ocean and cyan surf, dark purple textured sand filling bottom 29% of frame and dark rocks at extreme sides. Preserve rich hand-painted game illustration, depth, framing and colors. The entire central sand court must be empty and unobstructed. No people, equipment, vegetation, text or UI. The game will draw moving palm trees, water glints, players, court, leaves and net as separate layers, so this plate is only sky, distant island, water, sand and edge rocks.
```

## Earlier sunset background

`beach-sunset.png` is the production background generated with the built-in `image_gen` tool from the user's selected `visual-references/beach-v2.png` reference. Characters, court, net, targets and volleyball are drawn separately in Canvas and follow the game's physics.

Generation prompt:

```text
Use case: precise-object-edit
Asset type: production background layer for a Canvas 2D volleyball game.
Input: the attached image is the edit target.
Remove BOTH women players, the entire volleyball net including posts, the volleyball in the air, all their shadows, and all white court boundary lines. Reconstruct the sand and scenery seamlessly in those areas.
Preserve the exact sunny cartoon beach illustration: blue-to-orange sunset sky, warm clouds, palm island silhouettes, sun on the right, turquoise ocean, gentle foamy shoreline, warm textured golden sand foreground. Preserve all positions, framing, colors, style, and 16:9 landscape composition. The lower one third is uninterrupted flat sand with restrained texture. No people, net, posts, ball, UI, text, logos or court markings. This is ONLY a clean static environment layer; the game draws all moving objects and court lines separately.
```
