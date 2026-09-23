# Ragdoll Volley

A two-player Canvas 2D volleyball game whose physics is a port of the 2009 Flash
game *Ragdoll Volleyball*, drawn over a sunset beach scene.

## Run

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Run `npm run build` to build the production version.

## Controls

These follow the original game:

- Player 1 (left): **← →** — move, **↑** — jump, **↓** — down, **Space** — serve.
- Player 2 (right): **A / D** — move, **W** — jump, **S** — down, **R** — serve.

A rally ends when the ball hits the sand, or when one player touches it four
times in a row; the server has six seconds to put the ball in play. The gear
opens physics settings, presets, import/export and restart.

## Physics

The simulation runs on [planck.js](https://piqnt.com/planck.js/) (a JavaScript
port of Box2D), because the original is a Box2DFlash 2.0 game. Every constant —
body sizes and densities, joint limits, the prismatic rails the doll hangs from,
the movement and jump impulses, the ball's mass, restitution and speed clamps, the
court geometry and the 1/28 s time step — was read out of the original's
bytecode and is collected in [`src/original.js`](src/original.js).

[`docs/original-physics.md`](docs/original-physics.md) explains how the original
was recovered and where this port necessarily differs.

- `src/original.js` — the extracted constants, with provenance.
- `src/world.js` — world, court and ball.
- `src/player.js` — the thirteen-part ragdoll and its moves.
- `src/game.js` — rally rules; DOM-free, so the simulation can be run headless.
- `src/controls.js`, `src/main.js` — input, loop and rendering.

## Artwork

The sunset environment is in `src/assets/beach-sunset.png`, with its
image-generation prompt in `src/assets/README.md`. The selected visual reference
is `visual-references/beach-v2.png`.

`src/characters.js` draws the two players from the original's body parts, with
coral/blue bikinis and distinct hairstyles. `src/renderer.js` draws the court,
net, volleyball, shadows, score, targets and disks, using the original's court
framing. Rendering uses a 16:9 scene and a canvas backing resolution of up to 2×
for sharp edges on high-density screens.

`src/ambient-life.js` adds small animated crabs near the shore and fish swimming
or jumping in the sea. They are decorative and respect reduced-motion preferences.
