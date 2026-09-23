# Beach sunset background

`beach-sunset.png` is the production background generated with the built-in `image_gen` tool from the user's selected `visual-references/beach-v2.png` reference. Characters, court, net, targets and volleyball are drawn separately in Canvas and follow the game's physics.

Generation prompt:

```text
Use case: precise-object-edit
Asset type: production background layer for a Canvas 2D volleyball game.
Input: the attached image is the edit target.
Remove BOTH women players, the entire volleyball net including posts, the volleyball in the air, all their shadows, and all white court boundary lines. Reconstruct the sand and scenery seamlessly in those areas.
Preserve the exact sunny cartoon beach illustration: blue-to-orange sunset sky, warm clouds, palm island silhouettes, sun on the right, turquoise ocean, gentle foamy shoreline, warm textured golden sand foreground. Preserve all positions, framing, colors, style, and 16:9 landscape composition. The lower one third is uninterrupted flat sand with restrained texture. No people, net, posts, ball, UI, text, logos or court markings. This is ONLY a clean static environment layer; the game draws all moving objects and court lines separately.
```
