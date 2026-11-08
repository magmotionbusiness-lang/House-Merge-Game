# Decisions log

Choices made where the brief was ambiguous or a number felt wrong in play.

## Phase 1: Greybox

- **Launch speed.** The brief's 6–14 table-lengths/s with damping 2.2 would send a piece ~3 table-lengths, slamming the back rail every shot, and contradicts "glides then stops in under 1.2 s". Slide mode uses a fixed **6.2 table-widths/s** (≈3.4 lengths/s) with linear damping **2.6**: the piece always reaches the pile in ~0.5 s and stops on its own if the lane is empty.
- **Footprints ×1.3.** At the brief's sizes a brick was ~8% of the table width: too small to read or aim at on a phone. All footprints are scaled by `footprintScale` in `config.ts`; the ladder ratios are unchanged.
- **Heights ×0.75** in greybox so tall late tiers don't hide the pile. Revisit with real models and the camera ease-back.
- **Table length 1.8 widths**, launch line at 0.2, boundary at 0.4. Close to the reference's proportions, and keeps rounds a few minutes long.
- **Aim is horizontal position only** (as in the reference video). Shots go straight, so the "first wall bounce" preview isn't needed. Instead the aim line stops at the first piece in the path, which is the most useful information. If angled shots are added later, the bounce preview comes with them.
- **Shots fire the instant you let go** (playtest feedback: waiting for the table to settle felt like lag). The brief's "unlock only once everything has settled or 1.5 s have passed" rule is dropped. The next piece appears 0.25 s after each shot; releasing before it appears fires it the moment it does.
- **Evolution bar** starts with tiers 1–5 revealed (they spawn anyway). Higher tiers show "?" until reached once; progress is saved on the device.
- **Rapier compat build** (WASM inlined) for zero-config deploys. It costs ~1.4 MB gzipped; well within the 15 MB budget. Can switch to the non-compat build later if load time matters.
- **Spawn cap with an empty table** is tier 3 (highest on table 1 + 2), following the brief's "never more than 2 above the highest" rule literally.

## Phase 1.1: Playtest fixes

- **Performance on iPhone Safari.** Real-time shadow maps are replaced by soft blob shadows under each piece (the standard mobile trick), so the scene renders once per frame instead of twice. Resolution now adapts: if frames average slower than 50 fps, the pixel ratio steps down from 2 toward 1. Per-frame and per-merge allocations were removed to avoid garbage-collection stutter. In a software-rendered test browser this went from ~20 to ~28 fps.
- **Second performance pass.** Anti-aliasing is off on Retina screens (the pixel density hides jaggies and MSAA is expensive there), piece undersides are no longer drawn, and piece geometry and top-cap materials are shared per tier. Add `?debug` to the URL to see frame rate, resolution and draw calls on the device.

## Phase 2: Juice pass 1

- **Merge sequence** follows the brief: the twins converge (0.06 s), a white blueprint wireframe of the new piece draws itself in (0.15 s), then the solid fills from the bottom up (0.2 s) with the 0.6 → 1.18 → 0.95 → 1.0 squash, a white flash and a ring shockwave. The new piece is physical from the first frame, so chains and input are never blocked.
- **Era particles:** brick chips and dust (Era 1), wood shavings and roof tiles (Era 2), glass glints and confetti (Era 3), rising energy sparks and light rays (Era 4). Amount and spread grow with tier and combo. Geometry and materials are cached, so a merge allocates only lightweight meshes.
- **Escalation:** tier 10+ shakes the camera; tier 13+ adds a 0.15 s slow-motion beat and a white screen flash. **Bloom is deferred**: a postprocessing pass costs a full extra render on phones, and the game must hit 60 fps first. It can return as an option on high-end devices in the polish phase.
- **Sound is fully procedural** (Web Audio synthesis, no audio files): launch whoosh and tock, sliding friction loop that follows speed, era-specific impact sounds (clay, wood, glass, metal), rail bonk, pentatonic merge chimes that climb with tier, combo notes with a stamp thunk, new-tier fanfare and horn, danger heartbeat, game-over "aww", UI clicks and sling ratchet ticks. ±3% random pitch, max 4 overlapping impacts, master limiter. The aim "paper rustle" was left out: on a phone speaker it read as noise rather than feedback.
- **Silent switch:** Safari 17+ is told to treat the game as ambient audio, so the iPhone ringer switch mutes it. A 🔊 button toggles sound and is remembered.
- **"New Building!" card** shows the tier chip spinning, then flies it into its slot on the evolution bar. The 3D model on a pedestal comes with the real models in Phase 3.

## Phase 2.1: Look and feel

- **Architectural typography** (playtest request): Big Shoulders Display for numbers and titles, Barlow Condensed for UI labels, Architects Daughter for blueprint annotations such as building names. Fonts are bundled with the game rather than loaded from Google, so they work offline, in the Home Screen app and in the future App Store build. Only the weights in use are included (~100 KB).
- **Icons are inline SVG line drawings**, not emoji, so they look the same on every device and match the drafting style.

## Phase 3: Models

- **All 18 tiers are built in code** with a small modelling kit (`src/models/kit.ts`): rounded boxes, gable and hip roofs, frustums, extrusions and tori, all merged into one mesh per material. Shared materials use near-white procedural textures (brick courses, roof tiles, planks, window grids) tinted by vertex colour, so 11 materials cover every building. Each building costs 1-6 draw calls and 340-1,500 triangles (see `docs/tier-stats.md`), well within the brief's budgets.
- **Token base disc.** Every building stands on a thin disc in its tier colour. It shows the true collider size, keeps the colour readable when the model is small or seen from above, and makes the table read like a board game.
- **Brick Stack is criss-crossed** rather than three bricks aligned: aligned, it was indistinguishable from the single Brick in grayscale.
- **Signature effects:** chimney smoke (Cozy Cottage), a sway for the Desert Needle's heat shimmer, a pulsing energy core and spinning ring (Hero HQ), a bobbing island with scrolling waterfalls (Sky Citadel), and a scrolling light beam with a climbing pod (Orbital Elevator). A true heat-distortion shader was skipped: it needs a full-screen pass, which costs too much on phones.
- **Glossy look:** a soft studio environment map (generated once at start) gives glass, steel and gold their reflections without real-time lights.
- **Merge wireframe** now traces the real building's edges, drawn bottom-up, instead of a cylinder outline. The white flash is a flat-white copy of the model.
- **Pieces spin with physics** now that they have no numbers to keep upright.
- **Thumbnails are baked, not rendered at start-up**, so the game opens faster. `.glb` exports go to `art/models/` (not shipped with the game, to keep the download small).
- **Instancing deferred.** With 3-4 draw calls per building and typically under 30 pieces on the table, a full table stays near 100 draw calls. Instancing would add complexity to the per-piece build-in and flash effects, so it waits for the polish pass, and only if real devices need it.
- **Tall late tiers** (13+) can reach above the back rail. The camera ease-back for them is part of Phase 4 (Scene).

## Phase 3.1: Readable ladder (playtest feedback)

Playtest feedback: it was hard to tell what the pieces were and which ranked higher (Wall vs Corner Frame vs Foundation Kit means little to most players). The ladder was rebuilt around one rule: **anyone should see at a glance which piece is worth more.**

- **Every tier is a building people already know**, in an obvious order: Brick, Doghouse, Garden Shed, Log Cabin, Cottage, House, Big House, Mansion, Townhouses, Apartments, Apartment Block, Office Tower, Skyscraper, Twisted Tower, Megatower, Hero HQ, Sky Citadel, Space Elevator. The brief's construction-material stages (wall, frame, foundation) were dropped.
- **Bigger always means better:** footprint, height and mass now strictly grow every tier (enforced by a unit test). Houses show countable floors, separated by white trim bands: 1 floor (Cottage), 2 (House, Big House), 3 (Mansion, Townhouses), 4 (Apartments), 6 (Apartment Block), then towers.
- **One bold colour per tier** on the roof and the base disc, since the camera mostly sees roofs. Neighbouring tiers never share a hue.
- **Rank badge on every piece:** the tier number on its colour, in a ring that is bronze (1-5), silver (6-10), gold (11-15) or diamond (16-18), so value is universal and needs no reading. It is drawn over its own building so it is never hidden. The HUD chips (NEXT card, evolution bar, cards) carry the same number and ring.
- **Buildings always face the player** instead of spinning with physics, so fronts, doors and badges stay readable.
- The brief's late-tier names were made generic where needed: Skyscraper (Art Deco style), Megatower, Space Elevator.

## App icon

- The icon is the owner-provided builder illustration (`art/icon-source.png`), a stand-in until the final artwork arrives. iOS gets the full image (its own corner mask hides the source's black corners); the web manifest and favicon use a crop without the corners.
