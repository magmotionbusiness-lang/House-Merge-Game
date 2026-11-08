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

## Phase 3.2: Cartoon look, performance and merge feel (playtest feedback)

- **Cel-shaded cartoon style with ink outlines.** Buildings now use toon shading (3 light steps) and dark outlines along every crease, and their surfaces are textured: clapboard siding, plaster, outlined shingles and bricks, framed windows with curtains, panelled doors, shutters and corner boards.
- **Higher FPS:**
  - **One texture atlas:** every building texture sits in one 512 px atlas, tiled by a small shader patch, so a house is 1 draw call plus 1 for its outline (was up to 7).
  - **Cheaper materials:** physically based materials and the reflection map are gone. Buildings use toon shading, the blueprint sheet is unlit (its shading is painted in), and the props use simple Lambert lighting.
  - **Faster auto-quality:** resolution steps down after 1 s below 54 fps (was 1.5 s below 50).
- **Leak fixed:** effects started when a merge landed were being dropped from the update list and stayed on screen forever, piling up draw calls over a session. This was a real cause of slowdown.
- **Juicier merge.** The twins accelerate into each other and swell while flashing white. On impact:
  - a spinning starburst, a coloured glow pooling on the blueprint and twinkling sparkles, plus the ring and era particles
  - a short camera kick for every merge, growing with tier and combo
  - a 50-90 ms hit-stop that freezes the physics for a beat while the effects play
  - a bounce on the score counter

  The new building then draws in as a blueprint, fills, hops and lands with a squash and a dust ring.

## Phase 4: Scene

- **Construction site** around the table, built with the same modelling kit (so it matches the cartoon style and costs a few draw calls):
  - **Table and static props:** steel I-beam rails with rivets, brick pallets, rebar bundles, traffic cones, scaffolding, a site office with a coffee mug, floodlight poles.
  - **Ambient motion, all slow and subtle:** a tower crane sweeping with a swaying hook, a cement mixer turning, an excavator arm moving now and then, a fluttering flag, drifting dust motes, and welding sparks every 6-10 s on the half-built building in the back.
- **The table is framed at 90% of the screen width** (was 96%) so the site shows at the sides. Depth of field was skipped (a blur pass is too costly on phones); fog and placement keep the site calm instead.
- **Lighting moves through the day as you progress:** morning (tiers 1-5), noon (6-9), golden hour (10-12), dusk (13-15) and night (16+). Colours ease over 2.5 s. Windows light up from dusk, and the floodlights glow at night. In the campaign each district will pick its own time of day instead.
- **The half-built building grows a floor every two tiers** reached in the run. The campaign will tie it to completed districts.
- **Camera eases back for tall towers** (tallest building over ~0.35 table-widths): at most 10% further away, as the brief says, re-framed to keep the back rail and spires in view.
- **Blueprint sheet:** faint technical drawings (house elevations, a floor plan, dimension arrows, a compass circle), paper grain, a scissors mark on the dashed launch line, and a fuller title block.
- **Reduced motion:** with the system's "Reduce Motion" setting on, the site's ambient animations stop. The "Calm background" toggle arrives with the Settings screen in Phase 5.

## Phase 4.1: Painted backdrop and 60 fps (playtest feedback)

- **The 3D construction site is replaced by the owner's painted backdrop** (`public/bg/site.webp`, source in `art/background-source.png`), shown behind a transparent canvas. The browser composites it for free, so the GPU only draws the table and buildings. The crane, flag, mixer, excavator, welding sparks and dust motes went with it. The steel I-beam rails stay as part of the table, and a soft contact shadow seats the table on the painted ground.
- **Time of day still works:** each preset now lays a colour tint over the painting (warm in the morning, orange at golden hour, purple at dusk, deep blue at night), faded with a CSS transition instead of per-frame rendering.
- **HUD contrast:** every HUD card, pill and the evolution bar has a thicker dark-brown outline, a solid "3D" bottom edge and a soft drop shadow, so it never blends into the busy painting. Floating score numbers get a full outline.
- **60 fps work:**
  - **No first-appearance stalls:** every tier's model, outline and blueprint wireframe is pre-built at start-up and its shaders are compiled ahead. Before, the first time a tier appeared it was built on the spot, which stalled for a moment.
  - **Smoother motion:** rendering is interpolated between physics steps, so motion is smooth even when the display and the 60 Hz physics drift apart.
  - **No snowballing slow frames:** at most 3 physics steps run per frame.
  - **Less garbage collection:** physics positions and speeds are read once per step and cached, which cuts per-frame allocations.
  - **Bigger savings:** the canvas no longer draws a background or ground at all.
  - **Note:** iPhones in Low Power Mode cap Safari at 30 fps, and no web game can override that.

## Phase 5: HUD and flow

- **Screens:** title (Play, Campaign, Settings, coin balance), campaign map, level intro (contracts and shot limit), pause (Resume, Restart, Settings, Home), settings, and results (level complete with animated stars, out of shots, site overflow). All are DOM overlays in the same style as the HUD. Leaving the app opens the pause menu.
- **HUD layout:**
  - **Top left:** score, best, coins and shots left (levels only; turns red at 3).
  - **Top centre:** contract tickets.
  - **Top right:** NEXT card with a pause button underneath.
  - **Moved off the HUD:** Restart, aim mode and sound now live in the pause and settings menus to declutter the play area.
- **Contracts:** taped paper tickets showing the target building, progress (1/2) and coin reward. A completed ticket shakes, gets a green DONE stamp, and coins fly in an arc to the coin counter with a stamp-and-coins sound. In Endless, a new contract replaces it after 1.4 s, aimed a little above the player's best tier this run. In levels, completing every ticket wins the level.
- **Coins** are a saved currency (for boosters in Phase 6). Rewards grow with tier squared, so higher builds are worth chasing.
- **Levels:** defined in `levels/district-NN.json` and validated on load and in tests. Each level sets contracts, a shot limit, an optional starting pile, optional spawn weights and a hint. Stars follow the brief (1 = done; 2 = done with 30% of shots left; 3 = 50% left plus a 3+ combo). Levels unlock in order. District 1 (Backyard, 8 levels) ships now as the first slice of the campaign. Phase 6 completes the 15-level districts and tunes them with the balancing bot.
- **Settings:**
  - **Controls:** Sound, Aiming (Slide or Sling), Calm effects (no screen shake or white flashes) and Large text, all saved on the device.
  - **Not yet:** music arrives in Phase 9.

## Phase 5.1: Camera angle (playtest feedback)

- **The table lies flatter and sits lower:** the camera tilt went from 55° to 47°, and 5% of the screen height is kept free above the back rail. More of the painted site shows above the table, and the contract tickets no longer overlap the back of the table. 42° was also tried, but it made the back row too small to read. Both values live in `src/core/config.ts` (`cameraTilt`, `topGap`).

## Phase 5.2: HD rendering and a clean first impression (playtest feedback)

- **Why it looked pixelated:**
  - **Resolution got stuck low:** the adaptive resolution reacted to the hitches of start-up (when models were built) and dropped to 1x, then never recovered.
  - **No anti-aliasing:** edge smoothing was off on Retina screens.
  - **Low-resolution textures:** the textures were 128 px per surface.
- **True 1080p:** the game now renders at least 1080 physical pixels across (about 2.8x on an iPhone), capped at the screen's own density.
- **Edge smoothing (MSAA) always on.** Apple's tile-based GPUs resolve it almost for free.
- **Quality floor and recovery:** adaptive resolution never drops below 2x. It ignores the first seconds and screen transitions, uses a trimmed 2 s average so single hitches don't count, and steps back up after 6 s of smooth frames.
- **HD textures:** every canvas texture is drawn at 2x (building atlas 1024 px with 256 px per surface; blueprint sheet 2048 px wide), with 16x anisotropic filtering so the tilted table stays sharp to the back rail.
- **Loading screen:** it is part of the page itself, so it appears instantly, before the game code finishes downloading. It shows the painted site, the builder logo floating, and a progress bar. While it shows, every building, outline, wireframe and merge effect is built and its shaders are compiled, one per frame, so the game never stutters afterwards.
- **Title and transitions:**
  - **Title:** the camera floats in a higher "showcase" view with a slow sway, and the title buttons pop in one after another.
  - **Play:** the menu card drops away, the camera swoops down into the play view, and the HUD slides in from the top and bottom in a staggered sequence.
  - **Home:** the camera glides back up.
  - **Reduced motion:** the system's "Reduce Motion" setting turns the HUD entrance and the logo float off.
- **The painted backdrop is 941 x 1672 px**, a little under an iPhone's 1170 x 2532. A higher-resolution export of the same painting would make it as sharp as the 3D.

## Phase 6: Campaign, balancing bot and boosters

- **Three districts of 15 levels:** Backyard (morning), Suburbs (noon) and Old Town (golden hour). They are generated from a compact design table (`tools/make_levels.py`) into `levels/district-NN.json`, and validated on load and in tests: pieces must fit on the table and must not overlap each other or the scaffolds. Every 5th level is a Big Build, and the level after it is a breather.
- **District ideas:** Backyard teaches aiming, merging and contracts. Suburbs focuses on shot limits and stars, with chain starts. Old Town adds starting piles and scaffold bumpers.
- **Scaffold bumpers absorb hits (no bounce).** With a bouncy bumper the bot overflowed in nearly every Old Town run: a blocked shot rebounded and settled over the site boundary, a 2-second loss. Now a blocked shot stops in front of the scaffold, which is fair and readable. The aim line stops at scaffolds too.
- **Exponential effort shaped the targets.** Building tier N from scratch costs roughly twice tier N-1. In early tests a tier-10 contract needed 140+ shots, so:
  - **Chain starts:** late levels start with a descending chain (e.g. 9-8-7-6-5), so the job is building the smallest link.
  - **Richer spawn mixes:** later districts deal more 3s, 4s and 5s, per level as the brief allows.
  - **Top contract tiers are capped:** Backyard 8, Suburbs 10, Old Town 10. Tier 11 stays an Endless goal; as a contract it pushed levels past 5 minutes.
- **Headless simulation:** `src/sim/sim.ts` runs the same physics world and rules as the game (spawn table and cap, merges with the merge shove, contracts, the fail rule) without rendering. One level plays in about 30 ms.
- **Balancing bot:** a greedy player that scans 17 lanes, finds what each shot would hit first, and prefers same-tier hits (merges, especially toward contract tiers), then deep open lanes. It avoids scaffolds and adds slight randomness.
- **Tuning method:** each level is played many times with unlimited shots, and the number of shots each win took is recorded. The shot limit is then the quantile of that distribution that gives the level's target win rate: 97% for the first levels, sloping to about 60% by the end, with -5% on Big Builds and +12% on breathers. One pass per level sets the limit exactly, instead of trial and error. `npm run balance -- --write` writes the limits into the JSON, and `docs/balance.csv` has the full report (win rate, average, median and p90 shots, overflow rate).
- **The bot is a stand-in for a casual player.** Skilled players will beat the targets, which suits the 3-star system: 2 and 3 stars need 30% and 50% of the shots left.
- **Boosters** sit in the bottom corners above the evolution bar, each showing its coin price:
  - Wrecking Ball (100): demolish a building.
  - Swap (40): swap the current piece with NEXT.
  - Upgrade Stamp (150): raise a building one tier. It counts toward contracts, and the new building gets the blueprint build-in.
  - Crane Lift (80): pick a building, then tap where to set it. It swings over on a cable and lands with dust.

  Aiming shows a banner with a cancel button and a gold frame around the screen. Coins are only taken when the booster lands. Without enough coins the button shakes and a tip explains how to earn more. Rewarded-ad boosters come with the monetization phase.
