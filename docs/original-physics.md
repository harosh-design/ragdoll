# Where the physics numbers come from

The control and ball behaviour in this project is a port of the 2009 Flash game
**Ragdoll Volleyball** (Yuriy Shevchenko / Sedoiga). Nothing here was tuned by
eye: every constant was read out of the original game's own bytecode and lives in
[`src/original.js`](../src/original.js).

## Recovering the source

The distributed SWF is a MochiAds wrapper, not the game:

1. The outer SWF (`CWS`, ~950 KB) contains a `mochicrypt` AS3 preloader and one
   `DefineBinaryData` tag of ~941 KB.
2. Disassembling the preloader shows the payload is **RC4-encrypted**: the key is
   the payload's **last 16 bytes**, the S-box is keyed from them cyclically, and
   only the **first 128 KiB** (`min(len, 131072)`) is enciphered — then the whole
   thing is `ByteArray.uncompress()`, i.e. zlib.
3. The plaintext is an uncompressed `FWS` SWF of ~1.14 MB whose single `DoABC`
   tag holds the game: `player`, `ball`, `game`, `ground`, `control`, `AI`,
   `MyContactListener`, plus a complete **Box2DFlash 2.0** (`b2World`,
   `b2RevoluteJoint`, `b2PrismaticJoint`, `b2PolygonDef`, …).

Because the game still runs offline under Ruffle with the MochiAds servers long
dead, the decryption is necessarily local and deterministic — which is what makes
this recoverable at all.

## The part that matters most

The doll does not balance. It **hangs**:

- a 2×2 px sensor body (`PrismBody`) rides a **horizontal prismatic joint** on the
  static ground body, its translation limits being what confine each player to
  their own half;
- the **Head** rides a **vertical prismatic joint** on `PrismBody`, with limits
  `[0.2, 55]` metres.

A prismatic joint also locks relative rotation, so the head can never spin and
never sags below its standing line; the other twelve parts dangle from the neck.
Both motors are off — all movement is impulses:

| Action | What the original does |
| --- | --- |
| left / right | zero the hips' velocity, then a ±4 impulse — to the **hips** normally, to the **head** once the head is above y=200 px |
| jump | only below y=296 px; zero head and hip velocity, then `(0,-4)` to the head and hips, plus `normalize(head-torso)·13` applied to the **head** at each fingertip |
| down | `(0,+1)` into each foot, every frame |
| serve | destroy the hand joint, `(±1,-1.5)` to the serving fingers and `(±0.7,-0.5)` to the ball |

## Ball

Radius 15 px, density 0.1, friction 0.05, **restitution 1**, bullet, no damping,
and then an explicit `SetMass(mass 0.1, I 0.01)` that overrides the shape's mass.
Every frame its speed is clamped to |vx| ≤ 15 and |vy| ≤ 20 m/s. Walls and the net
multiply vx by 0.6; a hazard multiplies it by 0.4; each fresh player touch adds a
`(0,-1)` impulse, which on a 0.1 kg ball is a 10 m/s pop upward.

## World

Gravity `(0, 10)` y-down, 30 px per metre, 10 solver iterations, and a time step
of **1/28 s taken once per 30 fps frame** — so the original runs about 7% fast
against its own clock, and this port reproduces that rather than "fixing" it.

## Colliders are not the drawing

The boxes in `PARTS` are simplified colliders, and the original's own sprites are
noticeably bigger than them — the thigh collider is 26 px tall where `mc_LegL` is
35, and the shin collider is 22 where `mc_FootL` is 34. Drawing limbs at collider
size makes the doll read as long-armed and short-legged, which is not how the
original looks. The sprite bounding boxes are in `ART` (read from the inner SWF's
shape and sprite tags) and the artwork follows those, with each leg segment pinned
by its lower end so the sole still lands on the sand.

## Where this port necessarily differs

- The original is Box2D 2.0; this runs **planck.js**, a port of a later Box2D.
  The bodies, joints, limits and impulses are identical, but the two contact
  solvers are not bit-identical, so a long rally will diverge from the original
  even though the behaviour matches.
- The beach artwork, the ambient crabs and fish, and the target/disk hazards
  belong to this project, not to the 2009 game.
