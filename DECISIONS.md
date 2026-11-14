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

## Phase 6.1: Feel and first impression (playtest feedback)

- **Boosters were far too strong.** New base prices: Swap 250, Crane Lift 500, Wrecking Ball 700, Upgrade Stamp 1,200. Each extra use in the same round costs 60% more, and the buttons always show the current price. A contract pays about 70 to 1,000 coins depending on tier, so a booster rescues a moment but can't carry a run.
- **Crane Lift never drops a building onto another one.** Overlapping drops made the physics fling pieces apart, which felt broken. The drop now snaps to the nearest free spot clear of buildings, scaffolds and the site boundary, or asks for another spot.
- **No more darkening.** The light used to move toward dusk and night as you climbed tiers, which read as the game getting darker. It now stays bright daylight everywhere. The lighting presets remain in code for later events.
- **Beige strip at the bottom removed.** The page background was beige, and on some iPhone configurations the browser's game area is shorter than the screen. The painted site now covers the full screen height (`100lvh`), the game area uses the dynamic viewport height, and everything is sized to the game area itself (which also fixes iPad letterboxing).
- **New loading screen:**
  - **Look:** no logo. A big outlined "BLUEPRINT MERGE" title drops in over the painted site, with a hazard-striped progress bar that animates, a percentage, and construction phrases cycling underneath ("Under construction", "Laying the foundations", "Pouring the concrete", "Raising the walls", "Framing the roof", ..., "Final inspection", "Ready to build!").
  - **Instant:** fonts are preloaded, so it renders right away, and the bar creeps forward while the game code downloads.
  - **Builder slot:** a spot is ready for a builder illustration (`public/art/loading-builder.webp`).
- **Dust-cloud transition** after loading and when starting a round: a wall of billowing grey and tan smoke rises from the bottom carrying tumbling brick, concrete and wood chunks and glinting dust, covers the screen while the scene changes behind it, then lifts off the top and clears. It plays with a low rumble and whoosh, runs on its own 2D canvas at a soft resolution so phones keep 60 fps, and falls back to a simple fade with Reduce Motion.

## Phase 6.2: Bottom strip, loading pacing, campaign navigation (playtest feedback)

- **Bottom strip, root cause:** on iPhone home-screen apps with a translucent status bar, iOS draws the page under the status bar but reports a viewport that is shorter than the screen by the status-bar height (about 60 pt). CSS units (`%`, `vh`, `dvh`, `lvh`) all follow the short viewport, so a strip of page background was left at the bottom.
- **The fix:** a tiny script in `index.html` runs before anything paints. In a portrait home-screen app, it compares the viewport with `screen.height`; if the viewport is short by less than 140 pt, it takes the real screen height. The result sets a `--app-h` variable that the page, the game area, the painted backdrop, the loading screen and the dust transition all use, and the 3D view sizes itself to the game area. It re-runs on resize and rotation. Verified by simulating the bug: every layer now fills the full screen height.
- **Fallback:** the page background is also a darker earth tone, in case another browser variant ever leaves a gap.
- **Loading screen:** the progress bar moved to the middle of the screen with the construction phrase right above it, and the phrases change every 2.3 s (was 1.1 s) with a softer fade.
- **Campaign:** a clear blue "Back" button with an arrow at the top left, instead of the small home icon.

## Phase 6.3: Booster fixes (playtest feedback)

- **Swap always changes something.** The spawner deliberately repeats the previous piece fairly often (as Suika does), so swapping two identical pieces did nothing and felt broken. When the current and NEXT pieces match, Swap now deals a different spawnable building, preferring one that matches something already on the table.
- **Crane Lift is drag-and-drop with a preview:**
  - **Lift:** press a building and it lifts on a cable and hovers a little above your finger, so the finger doesn't hide it.
  - **Preview:** a pulsing footprint ring shows exactly where it will land, green when it fits and red when there's no room. The spot snaps to the nearest free place, never overlapping another building or a scaffold.
  - **Drop:** let go to set it down with a puff of dust. Letting go without moving keeps it lifted, so you can drag again. Cancel puts it back.
  - **Charge:** coins are only taken on a successful drop.

## Phase 6.4: Music, merge "dopamine" pass, UI sounds (playtest feedback)

- **Music** (owner-supplied tracks in `public/audio`):
  - **Tracks:** a looping home track on the title and menus, and a playlist of gameplay tracks.
  - **Shuffle:** every round (including restarts and the next level) starts a freshly shuffled order from its first track. When the order runs out mid-round, a new shuffle continues, never repeating the track that just ended.
  - **Switching:** home and game music cross-fade on the way in and out of play.
  - **Plumbing:** tracks stream through `<audio>` elements routed into Web Audio gain nodes, because iOS ignores `audio.volume`. They pause when the app is hidden.
  - **Ducking:** big merges (tier 10+ or combo 3+) duck the music by 35% for 0.45 s, as the brief asks.
  - **Track 4:** the supplied `4.mp3` is byte-identical to `2.mp3`, so the playlist uses the four unique tracks until the real track 4 arrives.
- **Volume sliders in Settings:** sound effects, game music and home music (0-100%). They apply live and are saved. They replace the old on/off sound switch, and old saves with sound off migrate to 0% effects.
- **Why Block Blast-style clears feel so good:**
  - **Instant, layered feedback:** an impact, a reward and a sparkle all land in the same frame.
  - **Escalation:** each consecutive clear sounds higher, looks bigger and is praised louder, so streaks feel like climbing.
  - **Words of praise** ("Great!", "Amazing!") that name the achievement.
  - **Impact frames:** a pause, a shake and a zoom.
  - **Saturated colour bursts:** confetti and screen glow on big moments.
  - **Short loops and low friction:** frequent, variable rewards that invite "one more".
- **What the merge does now:**
  - **Sound:** a rising whoosh as the twins rush together. On impact, a low thump and click, then a major chord with bell overtones and a short reverb, then a fast sparkle arpeggio. Each combo step climbs one note up the major scale, so chains play a rising melody. Tier 9+ adds a sub boom, and combos of 3+ add a bright chord stab with a shimmer cascade.
  - **Visuals:**
    - a camera punch-in (a quick zoom that springs back) on every merge, growing with combo and tier
    - praise words from combo 2 ("Nice!", "Great!", "Awesome!", "Amazing!", "Incredible!", "Unbelievable!") with "COMBO xN", bouncing in larger and in hotter colours as the chain grows, rainbow at 7+
    - from combo 3, a confetti burst and a coloured glow pulsing in from the screen edges
    - score numbers that grow with the combo and turn rainbow at 4+
  - **Calm effects:** this setting removes the shake, punch and glow.
- **UI sounds:** every button, tile and booster plays a soft rising pop on press. Back, cancel, close and home play a falling pop instead. This is handled in one place, so new buttons get it automatically.

## Phase 7: Meta and retention

- **Title menu:** Play (Endless), Campaign, Daily Blueprint, plus a row with Skyline, Collection and Settings.
- **Daily Blueprint:**
  - **Same deal for everyone:** the piece sequence and contracts are seeded by the date (`dailySeed`).
  - **One attempt per day:** the attempt counts the moment it starts. Restart is hidden in its pause menu, and leaving mid-run keeps the score so far.
  - **Results:** the result card and the title's "Daily · score" button offer Share, using the native share sheet (or clipboard) with a spoiler-free emoji grid of the tiers reached (⬜ for not yet), the day number and the score.
- **Login calendar ("Site Pay Day"):**
  - **When:** greets the player once per day on the title.
  - **Rewards:** a 7-day streak paying 100, 150, 200, 300, 400, 500, then 1,200 coins.
  - **Streak rules:** missing a day restarts at day 1, and day 7 wraps to day 1. The rules are pure functions with unit tests.
- **Collection book:**
  - **Grid:** all 18 buildings; locked ones show as dark silhouettes with "???". Tiers 1-5 and anything reached count as discovered.
  - **Detail card:** tapping a building opens it spinning in, with its tier, league (bronze to diamond), a short fun fact and how many times it has been built.
- **My Skyline:**
  - **What goes in:** every completed contract adds its building to the player's own skyline (saved, last 80).
  - **The view:** a horizontally scrolling street over sky and grass, where bigger tiers stand bigger.
  - **Rearranging:** tap one building and then another to swap their plots, which keeps it to two taps on a phone.
- **Deferred to later phases:** achievements and weekly events are listed in the brief's retention hooks; they come with the polish phase, once the core meta is played and tuned.

## Phase 7.1: Music start, title motion, messages above the board (playtest feedback)

- **Home music delay:**
  - **Causes:** browsers only allow sound after the player touches the screen. The track also started downloading only when first needed, then faded in over 1.2 s.
  - **Fix:** the loading screen now ends with a breathing "Tap to build" button. That tap is the required gesture, so the home theme (preloaded during loading) starts at once with a 0.35 s fade while the dust transition reveals the title.
- **Quiet intros:**
  - **The problem:** the gameplay tracks had long, near-silent intros (track 1 stayed below -50 dB for about 45 s), and the tracks differed by up to 10 dB in loudness.
  - **The fix:** each file is trimmed past its quiet intro (track 1 at 45 s, 2 at 25 s, 3 at 6 s, 5 at 12 s) with a 0.5 s fade-in, and all tracks, including home, are loudness-normalised to -16 LUFS so nothing jumps in volume between songs.
- **Title screen motion:**
  - **Letters:** they drop in one by one, then ripple in a gentle wave.
  - **Background:** golden dust motes drift up, and the painted site slowly pans and zooms (a GPU transform, essentially free).
  - **Buttons:** they get a glossy top highlight and a light sweep. The Play button breathes with a soft glow and its arrow nudges forward.
  - **Press and badge:** presses squash with a spring, and the Daily button shows a pulsing NEW badge until today's run is played.
  - **Reduce Motion** turns it all off.
- **Messages no longer cover the board:** praise words, "New Building!" cards and level hints now appear in the strip between the top HUD and the back of the board (the strip was widened from 5% to 8.5% of the screen). They are also more compact: smaller praise words, and a one-line card for new buildings.

## Phase 7.2: Anti-spam and the Block Blast lessons (playtest feedback and analysis)

**Spam fix.** Shots could be fired every 0.25 s, and releases made while the launcher was empty were queued, so the pile could be machine-gunned. Now the next piece loads only once the last shot has landed (slowed below 1.2 widths/s or merged), at least 0.45 s and at most 1 s after the shot, with a small "click" sound. A release while the launcher is empty does nothing. In a test, ten taps in one second fired one shot.

**Block Blast lessons, translated to a merge game:**

| Block Blast lesson | What Blueprint Merge does now |
|---|---|
| Three visible pieces give a short planning horizon | The launcher, NEXT, and a "THEN" chip under NEXT: three pieces visible, never more |
| Consecutive clears build a combo (the core dopamine loop) | **Shot streak:** each shot that causes a merge extends a 🔥 streak that multiplies merge points (x1.25 per step, up to x3.5). A whiff breaks it with a small "Streak N lost" note, and a rising two-note jingle plays on each step |
| Make the player feel intelligent (credit for skill) | Named skill moments with bonus points and their own praise: **Chain reaction!** (a fresh merge triggering another, x1.5) and **Bank shot!** (a ricochet off a rail into a merge, x1.25) |
| Multi-line and full-board clears feel disproportionately good | **Clean site!** When a merge leaves at most one building on the table: a big bonus (500 x top tier), a triple confetti burst, flash, glow and fanfare |
| The personal high-score loop gives every run a purpose | The HUD counts down "N TO BEAT BEST" (orange and pulsing within 15%), celebrates **New best!** mid-run, and the results screen rolls the score up |
| Near-misses fuel "one more try" | Results say "So close! Only N from your best" (70%+ of the record) or "New best! +N over your record" |
| The board itself creates tension, then relief | As the pile approaches the boundary, the music is filtered as if underwater and the red line pulses faster and stronger. Clearing space brings the music back |
| Low friction: open, understand, play | First-ever session skips the menu: "Tap to build" goes straight onto the board with a one-line hint. Daily rewards wait until after the first run |
| Restarting is effortless, and runs aren't lost | **Continue:** the Endless board saves after every shot and when the app is hidden, and the title offers "Continue · score" (plus New game). "Build again" breathes on the results card, which appears faster (0.65 s) |
| Social proof (people share scores) | Endless results get "Challenge a friend" (native share sheet or clipboard) |
| Difficulty "recipes" (the 2026 teardown found ones that manufacture losses) | Only **helpful** recipes, never harmful ones: in Endless, new players (first 3 runs) and crowded boards get a better chance of a piece matching one near the front. Pieces are never dealt to cause a loss; the brief's fairness rule stands, and trust is the long-term asset |

Also fixed: going Back from the daily-reward calendar reopened it in a loop; it now greets once per session.

## Phase 7.3: Heat, the run gets flashier as it goes (playtest feedback)

Block Blast escalates its presentation over a session: early clears are modest, while later ones are louder and more colourful, so the reward keeps growing without ever pulling the player out of play. Blueprint Merge now has **Heat**, six levels driven by the run's score (0, 600, 2,500, 8,000, 22,000, 60,000). Each level permanently adds a layer for the rest of the run:

| Heat | Name | What it adds |
|---|---|---|
| 1 | Warming up! | Rails start glowing; comet trails behind every shot |
| 2 | On a roll! | Each merge also throws a ring of coloured sparks; an octave shimmer joins the merge chord; the board tint warms |
| 3 | On fire! | Sparkles drift up over the board continuously; bigger merge bursts and a harder camera punch |
| 4 | Unstoppable! | A sub thump and a sizzle under every merge; denser sparkles |
| 5 | Legendary! | Rainbow-cycling rails, a slow rainbow aurora over the screen, maximum bursts |

- **Level-ups** get their own moment: a banner in the strip above the board ("On fire!", "HEAT LEVEL 3"), a screen glow, a rising sweep into a bright chord with a cymbal-like shimmer, confetti bursts across the board and a camera punch. The music ducks briefly so it cuts through.
- **Anticipation:** a slim heat meter under the score always shows how close the next level is, in the next level's colour (rainbow at the top).
- **Fever:** a streak of 4+ sets the screen edges ablaze with flickering flames, and shot trails turn fiery until the streak breaks.
- **Never interrupting:** everything plays over the game. There are no pop-ups, no pauses and no taps needed. A resumed run restores its Heat silently.
- **Performance:** trails and ambient sparkles share one pooled particle buffer (360 points, a single draw call), and the glows are CSS layers composited by the browser. Calm effects and Reduce Motion tone it down.

## Phase 7.4: Contract delivery, room to grow past the big tiers (playtest feedback)

Feedback: from about tier 11 the board clogs. Each new tier is bigger, two of them rarely fit beside each other, and the board can't be cleared. Clearing the board in Block Blast feels great, with the edges glowing and pulsing, and that feeling was missing here.

- **Delivery:** when a merge builds a building that an open contract asks for, the crane collects it. After a short beat (0.75 s, long enough to enjoy the merge) it is lifted off the board on a cable and flies away. The rails pulse three times in its colour, a "Delivered!" banner names the building, a rising chime plays and a ring of sparks marks the empty spot. Delivered buildings can't merge on the way out. This is the main way to clear space, and it rewards doing the contracts.
- **Contracts sit at the top end:** Endless contracts ask for tiers around the player's best (best − 1 up to best + 2), so delivery removes the biggest footprints. A variant that asked for tiers below the best was tested and made things worse (median best tier 7 instead of 9), because it took away the pieces the player needed to climb.
- **Slimmer big tiers:** footprints from tier 6 up grow more slowly (tier 18 is 0.25 of the table width instead of reaching it). Big buildings grow taller rather than wider, which keeps the "bigger = better" read.
- **Clean Site** (board almost empty after a merge) now also pulses the edges, five gold pulses.
- **Daily** contracts refill like Endless, so delivery keeps the daily board breathing too.

Measured with `scripts/endless-sim.ts` (greedy bot, 24 runs, 600-shot cap). Delivery on: best tier median 9, 542 shots on average. Delivery off: median 9, 370 shots. The bot survives about 46% longer, and many runs hit the cap. The headless Sim mirrors delivery, and the campaign shot limits were re-tuned with 300 runs per level (`npm run balance -- --runs 300 --write`).

## Phase 7.5: Map themes and a cleaner Heat glow (playtest feedback)

Feedback: past a certain level the Heat glow washed a yellowish layer over the whole screen, which looked unpolished. It should be a flashy, pulsing stroke around the board that never covers it. And after a few minutes the eye gets used to the board. Block Blast keeps changing its theme (food, sweets, metal...), so this game should change map themes too, with house-themed lineups.

**Heat glow → a neon stroke around the board.**
- The full-screen layers are gone: the rainbow "aurora", the orange Fever flames, the inset combo glow and the board tint.
- In their place is one shader stroke on top of the rails: a solid neon tube, a white-hot centre line and a soft halo fading outward over the scenery. Lights chase around the loop.
- Each Heat level sets its look: off, cyan, green, orange, pink, then rainbow at Legendary. Chase lights get more numerous and faster with each level.
- Fever makes flames flicker along the stroke. Big combos, deliveries, Clean Site, a new best and theme changes flash it.
- It is drawn with normal (premultiplied) blending, not additive, so it stays saturated over the bright daytime backdrop and never turns the screen white or yellow.

**Map themes.** Five themes in a loop:

| Theme | Lineup |
|---|---|
| Construction Site | Brick → Space Elevator |
| Tropical Beach | Sandcastle → Overwater Bungalow → Paradise Spire |
| Alpine Peaks | Woodpile → Log Cabin → Luxury Log Cabin → Chalet → Mountain Villa → Summit Observatory |
| Sweet Town | Sugar Cube → Gingerbread House → Layer Cake Manor → Rainbow Spire |
| Neon City | Power Cell → Glass House → Holo Villa → Orbital Tower |

- **What changes:** every theme has its own 18 procedural buildings, building names, rail colour, back-beam stripes, table frame and backdrop.
- **What never changes:** tier identity. The same tier keeps its colour (roof and base disc), rank badge, number and size in every theme, so the board stays readable.
- **When:** a run stays in a theme for at least 2.5 minutes of play. After that, the next big moment carries it into the next theme: a board clear, a delivery, a combo of 3+ or a new top building. If none comes, the switch happens on any merge after 4.5 minutes. Because the switch rides on a moment the player earned, it feels like a reward.
- **The transition:** "Welcome to Tropical Beach" bursts in above the board with the theme's tagline. Confetti in the theme's colours rains across the whole screen, the board stroke flashes five times and the screen flashes. The backdrop crossfades and the rails restyle. Every building, from the front back, spins down, swaps to its new-theme equivalent where it stands and pops back up with sparkles. A rising whoosh into a big chord plays, and the music crossfades into the next track.
- **Smoothness:** half a minute before a switch is possible, the next theme's 18 models, wireframes and backdrop are built in the background, two items a frame, so the switch itself never stalls.
- **Modes:** Endless starts on the site and runs are saved with their theme. The Daily opens in a theme chosen by date. Campaign districts each have a home theme (district 1 site, 2 beach, 3 alpine, and so on) and do not switch inside a level. The collection book and My Skyline keep the site lineup.
- **Backdrops:** painted art per theme is planned. The user supplies it, in the same style as the construction-site painting. Until then each theme has a stylised backdrop painted in code: palms and sea, snowy peaks and pines, candy hills and lollipops, a night skyline with a neon grid. Dropping in the art is a one-line change in `themes.ts`.
- **Thumbnails** are baked per theme (`public/thumbs/<theme>/`), with a lineup sheet per theme in `docs/`.

**Painted backdrops arrived** for all four themes: a beach construction site, a snowy alpine site, a candy site and a neon night site. They match the original site painting, crane included. They are served as `public/bg/<theme>.webp` (941 × 1672) and preloaded with the next theme's models before a switch. Each crossfade starts only once its painting has loaded, so a switch never flashes an empty frame. The code-painted backdrops stay as a fallback for any future theme without art.

## Phase 7.6: Each map feels different (playtest feedback)

Feedback: the theme switches came too slowly. They should land while the run is already flashy. Each map should also sound and burst differently, the backdrops should move, and the board glow clashed with the scenery (purple and pink at the beach).

- **Faster, hype-driven switching:** a run can leave a theme after 45 seconds (was 2.5 minutes). The switch rides on peak moments:
  - a shot that merges 3+ buildings
  - a streak of 4+
  - a board clear
  - a Heat level-up (after its banner lands)

  It fires 0.7 s later, while the screen is still lit up. After 2.5 minutes any merge switches. Deliveries and new top tiers no longer trigger it. The transition is snappier too: buildings morph in quicker succession and the backdrop fades in 0.6 s.
- **Glow matches the map:** each theme has its own soft, three-colour palette per Heat level, and the colours flow around the stroke.

  | Theme | Palette |
  |---|---|
  | Site | Warm amber |
  | Beach | Aqua, sun yellow and coral |
  | Alpine | Ice blue up to an aurora green and lilac |
  | Sweet | Pastel pink, mint and lemon |
  | Neon | Cyan and magenta, with a true rainbow only at Legendary |

  Combo, delivery and board-clear flashes, comet trails and Heat banners take the theme's colours too, never a tier colour that could clash.
- **Theme merge sounds:** the combo pitch ladder stays the same everywhere, so progress still "sounds up". Only the instrument changes:

  | Theme | Merge sound |
  |---|---|
  | Sweet Town | Bubbly candy pops, a soft marimba chord and fizz |
  | Beach | Steel drums and a water splash with droplets |
  | Alpine | Glockenspiel, sleigh bells and a snow crunch |
  | Neon | A laser zap, a filtered synth stab and a square arpeggio |
  | Site | The original bells |

- **Theme merge bursts**, minimal and short (shaders compiled at load):

  | Theme | Burst |
  |---|---|
  | Sweet | Gumballs and jelly beans bounce out with sprinkles |
  | Beach | Droplets and hibiscus petals |
  | Alpine | Snowflakes and ice glints |
  | Neon | Glowing pixels and light rays |
  | Site | The era bursts |

- **Living backdrops:** a light 2D layer between the painting and the board, behind the play area. Calm mode and Reduce Motion thin it out.

  | Theme | Motion |
  |---|---|
  | Site | Dust motes |
  | Beach | Sun glints, drifting petals and seagulls |
  | Alpine | Snowfall |
  | Sweet | Tumbling sprinkles and twinkles |
  | Neon | Rain streaks and glow orbs |

## Phase 8: Monetization scaffolding (ads)

The game stays fair and ad-first, as the brief asks. Everything goes through one `Ads` facade (`src/ads/ads.ts`) over an `AdService` interface. The web build uses `MockAdService`, a 3-second full-screen test ad. The Capacitor build will put AdMob behind the same interface in Phase 10, so the game code won't change.

- **Rewarded ads, always optional, each with a clear button and an ad icon:**
  - **Continue after failing:** once per round. Overflow clears the 3 buildings nearest the site boundary (with a puff and a "Second chance!" flash). Out of shots gives 3 more. The board, score, streak and theme carry on, and Endless saves again.
  - **Double coins:** the "×2" button next to the round's coins. It counts only the coins not already doubled, so continuing and doubling again can't double the same coins twice.
  - **Free booster:** when a booster costs more than the player has, a small card offers it for an ad, once per round. The booster then reads "Free", costs nothing and doesn't raise its price.
  - **One more Daily try:** once per day. The Daily now keeps the best of its attempts.
- **Interstitials** (`src/ads/policy.ts`, unit tested): only between rounds, when leaving the results card (Next, Retry or Home), never on top of it. Never in a device's first 5 rounds ("never before level 6"). At least 120 s apart. Never within 120 s of a rewarded ad or a purchase. Never with Remove Ads.
- **During an ad** the music fades out and a running game pauses. Both come back afterwards.
- **Consent:** asked once, before the first ad of any kind, never at first launch. Two equally prominent choices (personalised or non-personalised ads); both mean the same number of ads. It can be changed in Settings → Privacy & ads. This stands in for Google's UMP flow, which the native build will show to EU/UK players.
- **Remove Ads:** the policy already honours a `bm.noads` flag, which the native store purchase will set. `?noads` in the URL turns interstitials off for testing. Coin packs, the starter pack and the season pass wait for the native store (Phase 10).

## Phase 8.1: Aim preview, score gains and edge sparkles (Block Blast study)

The user's Block Blast recording showed three things that both reward and teach the player:
- **The drag preview:** dragging a piece previews the lines it would clear, and the better the placement, the flashier the preview. One line gets a soft glow in the piece's colour; three lines get a chasing rainbow neon outline.
- **Points:** the score counts up in a glowing badge while a gold "+270" floats out.
- **The board edge:** a gold outline with drifting particles flashes on a clear.

Our equivalents:
- **Aim preview** (`render/preview.ts`). While aiming, the game predicts the shot: the first building in the straight path, and whether it's the same tier. It then follows the chain: the new building (placed between the pair) touching a twin of its own tier, up to 5 links. Shots slide straight, so this is reliable; bounces after a merge are not predicted, and the guess never claims more than it can know. The preview glows on the table around the buildings involved, just outside their base discs, and the aim line takes the same colour:

  | Outcome | Preview |
  |---|---|
  | No merge | Plain white aim line |
  | Merge | A soft ring in the colour of the building it will make |
  | Chain of 2 | Brighter pulsing rings on both buildings |
  | Chain of 3+, or a merge that completes a contract | A chasing rainbow neon ring on every building, sparkles, and a rainbow aim line |

  It hides while a booster is being aimed and when out of reach in Sling mode. This makes good shots readable before they're taken, which helps new players and makes the best shots feel special.
- **Score gains:** the score counts up instead of jumping. The score box pops with a gold glow that scales with the points. A gold "+N" bursts out just under it, beside the coin counter (clear of the contract tickets), and quick gains add up in one label.
- **Edge sparkles:** every board-edge flash (combos, deliveries, board clears, theme changes, Heat) now also sends sparkles drifting off the rails in the same colour.

## Phase 9a: The campaign as a Candy Crush-style map, 5 × 33 levels, and a level-clear celebration

The user shared Candy Crush recordings: the saga map and a level being cleared.

### The map (`src/ui/map.ts`)

- **Layout:** a full-screen scrolling map. A winding road climbs from level 1 at the bottom through the five districts. Each district's painted backdrop crossfades in as you scroll into it.
- **Road:** drawn as SVG in the theme's colours, with a dotted centre line. The beaten stretch glows gold.
- **Level buttons:** glossy 3D buttons in the district's accent colour, with stars arched over them. Locked levels are grey with a padlock. The current level is bigger and pulses. Every 11th level is a landmark: a larger button with that level's 3D target building standing on it.
- **Scenery:** the district's own buildings (baked 3D thumbnails) line the road on the open side of each bend, growing from tier 2 to 18 along the way, which sells the 3D world.
- **Signs and gates:** each district starts with a sign (name, stars x/99). The districts are separated by star gates: a padlock, the next district's name and tagline, and a progress bar of stars.
- **You are here:** the builder's portrait on a pin marks the current level.
- **After a win:** "Next level" returns to the map. The builder hops along the road to the next level, the button pops open with a starburst, and the level card drops in.
- **The level card:** hangs on two striped ribbons and swings to rest. It shows the district, "Level 12", the level's name, the best stars, the buildings to build (that district's 3D models), the shot limit and a pulsing Play button. Play starts the level directly; the old separate intro card is gone.

### The campaign (`tools/make_levels.py`)

- **Districts:** 5 themed districts (Construction Site, Tropical Beach, Alpine Peaks, Sweet Town, Neon City) of 33 levels each.
- **Acts:** each district has three acts of 11: a breather, then single, paired and double contracts with and without scaffolds, up to a landmark Big Build on levels 11, 22 and 33. Every act starts a tier higher, every district starts higher too, and starting piles help less later on.
- **Gates:** a district opens when the previous district's last level is beaten and the player has 40 / 85 / 130 / 180 stars in total, about 1.3 stars a level.
- **Balancing:** the bot tuned all 165 shot limits (150 runs a level, five districts in parallel). The target win rate falls from 95% to about 75% through district 1 and to about 50% by the end of district 5, with a dip on each Big Build and a breather after it. Two scaffold layouts ("gate", "funnel") and later "pillars" proved too tight with big buildings (the table jammed in front of them), so they were dropped. Scaffold and landmark levels deal gentler spawns, and contract tiers are capped at 10 (9 with scaffolds). Every level is winnable; the hardest (5-32) the greedy bot wins 35% of the time.

### The level clear

What makes Candy Crush's clear such a rush is that the reward keeps coming after the goal: "Sugar Crush!", every leftover move turning into a free explosion, the score climbing on its own, then a cheering character and confetti before the stars. Ours:

1. **Shout:** the screen dims to a deep blue vignette and the theme's shout slams in word by word: "Master Builder!", "Beach Blast!", "Peak Power!", "Sugar Rush!" or "Neon Overdrive!". The board edges flash, with a sweeping chord and a sub drop. Input locks and nothing can fail any more.
2. **Overtime bonus:** each leftover shot (up to 15) becomes a firework. It streaks from the launch line to a building with a sparkling trail, blows it up, and pays 100 + 25 per rocket in points plus 5 coins. The rockets speed up as they go, and each one's bell rings a step higher. The "Overtime bonus" counter ticks up, and the shot counter runs down to zero.
3. **Finale:** "Wonderful!" (or "Brilliant!", "Fantastic!", ...) and "Level complete!" land in the middle of the screen while theme-coloured confetti rains down to a fanfare. (A jumping logo mascot was tried and removed at the user's request.)
4. **Results:** the stars land one by one, each with its own rising chime.

**Clouds over what's next (playtest feedback):** the map now only contains the districts the player has opened. Above the last one, the road disappears into a thick bank of softly drifting clouds. Nothing of the next district shows: no name, no backdrop, no buildings. In the clouds sits a card with a "?" badge reading "A new district is hiding in the clouds", a star progress bar and exactly what's left to do ("beat level 33 and collect 12 more ★"). Once every district is open, the clouds say more districts are under construction. The mystery makes reaching the gate a reveal.

## Neon City lineup rebuilt (playtest feedback)

Players couldn't tell the Neon City buildings apart: the small tiers were blobs (the "Sleep Pod" read as a bean), and most models were dark glass that disappeared on the board, so the tier colour barely showed. The lineup is rebuilt on the same rules as the others:
- White walls or light glass.
- The tier colour on every roof and main surface.
- Neon trim in a lighter tint of that colour on top.
- Proper house shapes that grow with each tier.

New lineup: Power Cube → Capsule Hut (barrel roof) → Neon Garage → Cube Home → Smart Cottage → Neon House → Hover House → Glass Villa → Neon Townhouses → Neon Apartments → Arcology → Neon Tower → Holo Skyscraper → Helix Tower → Mega Spire → Cyber HQ → Sky Dome → Orbital Tower. District 5's level names were renamed in place, so the tuned shot limits are kept.

## Phase 9b: Accessibility pass

- **Calm effects** (Settings) now covers everything added since it was introduced: no confetti (theme arrivals, level clears), no looping bounces on the map (clouds, "?" badge, the builder pin, the current level, the Play button), the level card fades in instead of dropping and swinging, and no score-box pop. The system's Reduce Motion setting gets the same treatment, and the animated backdrop thins out under both.
- **Large text** already scales every screen, including the new map and its cards.
- **Colour blindness:** the 18 tier colours were checked under simulated deuteranopia, protanopia and tritanopia. The closest neighbouring pair is still ΔE ≈ 12 apart (tiers 11/12 for tritanopia, 3/4 for deuteranopia), which is clearly distinguishable, and every building also carries its tier number on the badge. The aim preview tells its levels apart by size, brightness and the rainbow chase as well as by colour.

**Neon tiers 1-10 redesigned again (playtest feedback):** the first rebuild read clearly but looked like ordinary suburban houses. Tiers 11-18 stay; 1-10 are now futuristic, each with its own silhouette, the tier colour as the main body, and thick neon trim:

Neon Cube → Pod Home (tilted roof, porthole) → A-Frame Pod (glass triangle front) → Hexa Home (six-sided with a glass top room) → Wedge House (roof sweeping up into a glass wall) → Stack House (box cantilevered across a glass floor) → Hover House (on four glowing thrusters) → Sky Villa → Neon Rowhouses (zig-zag roofs, neon signs) → Pod Tower (capsule homes spiralling round a core).

District 5 level names were renamed in place.

## Three new maps: Atlantis, Sakura Spring, Desert Oasis

The user painted three more backdrops in the house style (crane, cones, scaffolding). Each became a full map: its own 18 procedural buildings, building names, rail, frame and beam colours, board-glow palette, confetti, level-clear shout, merge instrument, merge burst, a living backdrop, a campaign district of 33 levels (districts 6-8), and a place in the Endless theme rotation (after Neon City).

**Atlantis** ("Tidal Wave!")
- Buildings: white marble, gold capitals and coral, with domes and roofs in the tier colour. Seashell → Coral Hut → Clam House → Diving Bell → Bubble Dome → Reef Cottage → Sea Manor → Pearl Villa → Coral Terraces → Column Hall → Reef Apartments → Lighthouse Tower → Kelp Tower → Trident Tower → Conch Spire → Poseidon's Temple → Crystal Palace → Atlantis Spire.
- Sound: a rising bubbly "bloop", a soft harp chord and a whale-song swell.
- Burst: bubbles rising and pearls.
- Backdrop motion: bubbles wobbling up, small schools of fish crossing, and light rays from the surface slowly swaying.

**Sakura Spring** ("Full Bloom!")
- Buildings: dark timber, white paper walls and stone bases, with flared roofs in the tier colour, lanterns and blossom trees. Stone Lantern → Tea Stall → Shrine Gate → Garden Teahouse → Paper House → Machiya → Ryokan Inn → Samurai House → Temple Hall → Moon Pavilion → Three-Tier Pagoda → Five-Tier Pagoda → Castle Keep → Blossom Tower → Golden Pavilion → Shogun Castle → Cloud Palace → Sakura Spire.
- Sound: koto plucks and a wind chime.
- Burst: a puff of petals drifting away.
- Backdrop motion: cherry petals riding a calm breeze. One shared wind slowly gusts and eases, and every petal also flutters and tumbles on its own.

**Desert Oasis** ("Golden Sands!")
- Buildings: sandstone and mud brick with Egyptian blue-and-gold friezes and lotus columns; the tier colour is on domes, awnings, tents and capstones. Mud Brick → Nomad Tent → Market Stall → Adobe Hut → Oasis House → Courtyard House → Domed Villa → Merchant House → Sandstone Row → Bazaar Palace → Obelisk → Temple of the Sun → Step Pyramid → Great Pyramid → Sphinx Temple → Pharaoh's Palace → Golden Citadel → Sun Spire.
- Sound: a darbuka doum-tek, an oud-like chord and a coin shimmer.
- Burst: sand chips and spinning gold coins.
- Backdrop motion (the "something creative"): wind-blown sand streams and grains sweeping across, heat haze shimmering over the dunes, and a falcon slowly circling high above the oasis.

**Campaign:** districts 6-8 open at 230 / 280 / 330 stars. The bot's target win rate keeps falling past district 5, but by 2% a district instead of 6%, so the curve flattens out instead of becoming punishing. Districts 1-5 were not regenerated; their tuned limits are untouched.

## Playtest fixes: aim guide, card drop, collection versions, map clouds, settings cog

- **Aim guide predicts the real shot.** The aim line used to be a straight dotted line that stopped at the first building; scaffolds were ignored. `predictShot` (physics/world.ts) now plays the shot out in a throwaway Rapier world with the same rails and scaffolds, the table's buildings held still, and the same launch speed, damping and restitution. It reports:
  - the exact path, including glancing bounces off scaffold corners and rails
  - whether a scaffold stops it dead, either head-on or with no room to slip through the gap to the rail
  - where it comes to rest, and the first building it touches

  It re-runs only when the aim, the power or the table changes. A check against a real shot off a scaffold corner landed within about 0.05 table widths. The guide (render/aimpath.ts) draws:
  - bold dots with a dark rim flowing along that path
  - a ghost ring where the building will end up
  - a pulsing ring at every bounce
  - a red stop sign where a scaffold will stop it

  It takes the merge-preview colour (rainbow for the best shots), and the merge and chain preview now uses the predicted contact point.
- **Level card drop as physics.** The card falls from above the screen and the ribbons catch it with a damped spring and a squash. The catch sets it swinging like a pendulum, then it settles. Its contents pop in one by one after it lands, and closing yanks it back up. Calm and Reduce Motion make it a short gentle drop.
- **Collection shows every version.** Theme tabs (each with that theme's House as its icon) switch the whole book. A building's card shows all 8 versions; tapping one swaps the big picture, name and theme. Discovering a tier counts in every theme.
- **Map:**
  - Clear sky between the last open level and the cloud bank, so the last level, its landmark and the builder pin are never half under the clouds. The pin is also drawn above the clouds.
  - An already-open gate is no longer drawn: it duplicated the next district's sign right above it.
- **Settings button:** a proper filled cogwheel, centred (icon-only buttons no longer reserve space for an empty label).

**Aim guide end ring removed (playtest feedback):** the ghost ring where the building lands was removed; the dots now run all the way to the landing spot. Bounce rings and the red stop sign stay.

**Roof flicker fixed (playtest feedback):** the Market Stall's striped awning (and the Nomad Tent's top band) blinked while moving. Two surfaces sat in exactly the same plane, so the GPU alternated which one it drew (z-fighting).
- `stripedBox` now makes the stripes stand a hair proud of the block on every side.
- The tent band, the courtyard parapets and the Egyptian friezes were nudged apart.
- A one-off scan of every model (every axis-aligned box pair sharing a visible face plane) also found and fixed the same problem on the neon trims (`neonBox` rims and posts), the Arcology and Holo Skyscraper bands, the Sky Villa deck, the Step Pyramid stair and the Sphinx headdress. The remaining coplanar pairs are hidden under roofs or slabs.

## Phase 10: The iPhone app

- **Capacitor 8** wraps the built game (`dist/`) into an iOS app (`ios/`, Swift Package Manager, so no CocoaPods). It runs offline from the bundle. iPhone only (iPads run it in compatibility mode, so iPad screenshots aren't needed) and portrait only.
- **`src/native/`** holds everything platform-specific behind the game's existing interfaces; the web build is unchanged:
  - `AdMobService` implements the same `AdService` as the web mock. It runs Apple's tracking prompt, then Google's UMP consent form where required, preloads rewarded and interstitial ads, and falls back to non-personalised ads without tracking permission. With Google's public test IDs (`ids.ts`) it shows test ads.
  - `store.ts`: a StoreKit non-consumable Remove Ads (sets the `bm.noads` flag the ad rules already honour), Restore purchases, and a silent ownership check on launch.
  - `haptics.ts`: the Taptic Engine on native and `navigator.vibrate` on the web. Shot = light, merge = light/medium/heavy by tier and combo, level clear / new map = success, game over = error. Rate-limited, with a Vibration switch in Settings.
  - `app.ts`: status bar, the launch screen handed over to the loading screen, and background = save and pause.
- **Store compliance:**
  - `PrivacyInfo.xcprivacy`.
  - Info.plist: `NSUserTrackingUsageDescription`, `GADApplicationIdentifier`, Google's SKAdNetwork IDs, `ITSAppUsesNonExemptEncryption = NO`, arm64.
  - Privacy policy and support pages on the site, linked from Settings along with the app version.
  - Restore purchases, as Apple requires.
- **Icon:** the logo's black rounded corners were flood-filled with its blue and softened, giving the full-square 1024 icon iOS needs (it applies its own mask).
- **Build and release:** `codemagic.yaml` builds in the cloud. It runs the tests, `npm run ios:sync`, signs with an App Store Connect API key, sets the build number to the latest TestFlight build + 1, and submits to TestFlight. `npm run screenshots` renders the six store screenshots at 1320 × 2868. `docs/APP-STORE.md` is the step-by-step launch guide with all the store text and form answers.
- **Not done here (needs the owner's accounts or a device):** enrolling in the Apple Developer Program, creating the App Store Connect app, API key, AdMob app and ad units, the IAP product and the Paid Apps agreement, and a real-device TestFlight pass.
