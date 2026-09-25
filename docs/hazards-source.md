# Original hazard port — verified 2026-09-25

Source: [the distributed Ragdoll Volleyball SWF](https://bubblebox.com/gamedata/bubblebox/swf6/1152/ragdoll-volleyball.swf).
The MochiCrypt payload was decrypted locally and the actual AVM2 methods were
disassembled, rather than inferring behaviour from the older replication spec.
When there is more than one DefineBinaryData tag, use the largest payload tag.

## Corrections to the earlier spec

`game.update`, bytecode offsets 829–1138: the floor-contact branch jumps to
1084 when no goal occurs. The `bYesPrize` check at 1084 therefore runs during
ordinary play. It calls `sendPrize` in that same frame.

`prizeButton.sendPrize`, offsets 7–218: when `Disable` is false, start a
2000 ms timer, set `Disable=true`, and **construct the executer immediately**.
`on_SendPrize` resets `Disable` and restores the button/hatch animation. It is
a shared button cooldown, not a spawn delay or a wait until the rally ends.

`executer.update`, offsets 10–115 and 380–384:

```text
direction = normalize(target.Tors.center.x - Body.center.x,
                      target.Head.center.y - Body.center.y)
direction *= target.ID == 1 ? options.myExSpeed : options.compExSpeed
Body.SetLinearVelocity(direction)
```

The level switch at 288–360 has branches for levels 2–5 only. The default
level 1 has **no bursts**. Its speed is 1.3 m/s. The old suggestion of a
burst every third second was an approximation and is not used in this port.

`executer` constructor, offsets 134–348: spawn at (3.5,-4) or (17.5,-4) metres;
friction 0.3, density 1, restitution 1; explicitly set mass 400 and inertia 0.1;
body type 777. `on_timer` marks it dead after 25 one-second ticks.
The source does not set an initial angular velocity or bullet flag.

`prizeButton` constructor: static boxes at (-211,-245) and (837,-245) pixels,
half extents (3,35), friction 0.4, body type 7. The ball's horizontal velocity
is multiplied by 0.4 on button contact. Type 777 does not receive that modifier.

## Intentional requested changes

- The executer collision radius is **15 px, equal to the ball**, instead of the
  source's 18 px. The visible shuriken tips use the same radius.
- Target identity is taken from the pressed button's side, instead of looking
  at the ball's x position in `sendPrize`. These agree at normal contact, but
  explicit identity remains reliable across the frame boundary.
- The 25-second lifetime and two-second cooldown use the existing simulation
  frame clock, so pause freezes both. They survive ordinary round changes.
- Star rotation is cosmetic; physics uses the source's circular collision shape.
- This match has no campaign levels, so it ports the default level-1 chase.
  Box2DFlash 2.0 and Planck's solver are not bit-identical.

Implementation: `src/hazards.js`, plus the contact rule in `src/world.js`.
The old sensor targets and kinematic patrol disks have been removed.

## Spike and arena

The spike is a new mechanic requested for this version, not claimed as source
code from Flash. The triangle rises from (310,355)/(330,355) to (320,206).
Downward tip contact records a material entry point on any ragdoll part. A
sliding joint holds it laterally while allowing rotation and vertical removal;
dry friction increases with cross-section and current depth. Jump impulses
work while caught, independent of the usual grounded-only jump check. The
near-net travel limits now allow the head and torso to reach the tip too.

The new side arena uses the original 640:400 framing and original world span
x=-221..921; its floor is at 94.7% of the frame. The user's two referenced
screenshots were not available during implementation, so exact screenshot
matching remains unverified. The neon beach remains selectable in Settings.
