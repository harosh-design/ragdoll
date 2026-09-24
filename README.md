# Ragdoll Volley

A Canvas 2D volleyball game for one player against a bot or two local players,
whose physics is a port of the 2009 Flash
game *Ragdoll Volleyball*, drawn over an animated neon beach scene.

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
- **Esc** or **P** — pause and resume. The game also pauses when the window loses focus.

A rally ends when the ball hits the sand, or when one player touches it four
times in a row; the server has six seconds to put the ball in play, shown as a
ring draining around the ball. The gear opens physics settings, presets,
import/export and restart.

## Menus

The title screen offers **Против бота** (you on the left, computer on the right)
and **Только люди** (two local players on one keyboard). In bot mode, the right
player serves automatically, predicts incoming shots, moves and jumps through
the same ragdoll physics. WASD/R control the right player only in human mode.
The menu also sets the match length: first to 5, 11 or 21 points, or endless as
in the original. Both choices are remembered and kept for restarts and rematches.
A match starts after a 3-2-1 countdown, which also runs when play resumes. The
pause menu offers resume, restart, controls, settings and the main menu, and
the first player to reach the target gets a result screen with a rematch
button. Arrow keys and Enter work in every menu.

## Physics

The simulation runs on [planck.js](https://piqnt.com/planck.js/) (a JavaScript
port of Box2D), because the original is a Box2DFlash 2.0 game. Every constant —
body sizes and densities, joint limits, the prismatic rails the doll hangs from,
the movement and jump impulses, the ball's mass, restitution and speed clamps, the
court geometry and the 1/28 s time step — was read out of the original's
bytecode and is collected in [`src/original.js`](src/original.js).

[`docs/original-physics.md`](docs/original-physics.md) explains how the original
was recovered and where this port necessarily differs.

Two things depart from it on purpose. The dolls play 15% bigger than the
original's; **Размер игроков** in the settings sets the size, 1 being the
original. A bigger doll grows about its soles and keeps every part's original
mass, so the original impulses still carry it as far and lift it as high. And by
each side wall hangs a trigger: sending the ball through it releases a slow disk
that patrols that half, where the ball loses most of its sideways speed.

- `src/original.js` — the extracted constants, with provenance.
- `src/world.js` — world, court and ball.
- `src/player.js` — the thirteen-part ragdoll and its moves.
- `src/game.js` — rally and match rules; DOM-free, so the simulation can be run headless.
- `src/bot.js` — the computer controller, with reaction delay and trajectory prediction.
- `src/controls.js`, `src/main.js` — input, the game phases, loop and rendering.
- `src/ui.js`, `src/ui.css` — menus, countdown and point banners, in the DOM over the canvas.

## Artwork

The neon environment is in `src/assets/neon-beach.png`, generated from the
user's purple / magenta / cyan beach reference. The complete generation prompt
is in `src/assets/README.md`. The earlier sunset asset is kept for reference.

`src/characters.js` animates two detailed illustrated athletes, with natural
faces and proportions, burgundy/blonde hairstyles, and pink/cyan sportswear.
The RGBA artwork is in `src/assets/player-magenta.png` and `player-cyan.png`;
`src/character-art.js` defines the separate limb masks and bind-pose anchors.
`src/skin-mesh.js` bends continuous texture strips around shared joints, keeping
skin and fabric connected through the elbows, knees, waist and hips. A neck bridge
follows the head and collar independently. The collision skeleton stays unchanged.
`src/characters-vector.js` is the fallback while the images load.
`src/renderer.js` draws the court,
net, volleyball, shadows, score, targets and disks, using the original's court
framing. Rendering uses a 16:9 scene and a canvas backing resolution of up to 2×
for sharp edges on high-density screens.

The net runs across the court in perspective. Its centre intersects the original
collision barrier and its top matches the collider at the players' movement
plane. Neon posts sit at the far and near court boundaries.

`src/scenery.js` animates palm crowns and individual fronds, water glints,
stars and rooted palm bushes in the foreground corners. The renderer also refracts the actual ocean
texture in moving horizontal strips. `src/motion.js` shares the wind with the
hair and adds damped, bounded chest and hair springs driven by player velocity
changes. These effects do not alter collisions or gameplay. Decorative movement
stops with the system's reduced-motion preference.

Run `npm test` for secondary-motion checks covering impacts, settling, frame-rate
consistency, reduced motion and resets, and for the headless rally and match rules;
run `npm run build` for the production build.

The foreground centre is unobstructed; there are no floating leaves, fish or crabs.

For close-up art review with the production renderer, open
`/dev/character-preview.html` while Vite is running. Add `?pose=jump` to inspect
the articulated cutouts in an airborne pose.
