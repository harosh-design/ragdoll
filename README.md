# Ragdoll Volley

A two-player Canvas 2D volleyball game with articulated p2-es characters and a sunset beach scene.

## Run

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Run `npm run build` to build the production version.

## Controls

- Player 1: **A / D** — move, **W** — jump, **S** — down, **R** — serve.
- Player 2: **Left / Right** — move, **Up** — jump, **Down** — down, **Enter** — serve.

The gear opens physics and size settings, saved presets, import/export, and restart controls.

## Artwork

The sunset environment is in `src/assets/beach-sunset.png`, with its image-generation prompt in `src/assets/README.md`. The selected visual reference is `visual-references/beach-v2.png`.

`src/characters.js` draws the two adult volleyball players as separate body parts, with coral/blue bikinis and distinct hairstyles. Every part follows the existing physics body and scales with the player-size setting. `src/renderer.js` draws the court, net, volleyball, shadows, targets and disks. Rendering uses a 16:9 scene and a canvas backing resolution of up to 2× for sharp edges on high-density screens.

`src/ambient-life.js` adds small animated crabs near the shore and fish swimming or jumping in the sea. They are decorative and respect reduced-motion preferences.
