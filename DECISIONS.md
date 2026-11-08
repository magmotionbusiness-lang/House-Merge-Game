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
