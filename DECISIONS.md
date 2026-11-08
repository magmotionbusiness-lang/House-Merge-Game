# Decisions log

Choices made where the brief was ambiguous or a number felt wrong in play.

## Phase 1: Greybox

- **Launch speed.** The brief's 6–14 table-lengths/s with damping 2.2 would send a piece ~3 table-lengths, slamming the back rail every shot, and contradicts "glides then stops in under 1.2 s". Slide mode uses a fixed **6.2 table-widths/s** (≈3.4 lengths/s) with linear damping **2.6**: the piece always reaches the pile in ~0.5 s and stops on its own if the lane is empty.
- **Footprints ×1.3.** At the brief's sizes a brick was ~8% of the table width: too small to read or aim at on a phone. All footprints are scaled by `footprintScale` in `config.ts`; the ladder ratios are unchanged.
- **Heights ×0.75** in greybox so tall late tiers don't hide the pile. Revisit with real models and the camera ease-back.
- **Table length 1.8 widths**, launch line at 0.2, boundary at 0.4. Close to the reference's proportions, and keeps rounds a few minutes long.
- **Aim is horizontal position only** (as in the reference video). Shots go straight, so the "first wall bounce" preview isn't needed. Instead the aim line stops at the first piece in the path, which is the most useful information. If angled shots are added later, the bounce preview comes with them.
- **No dead time between shots.** The next piece appears 0.3 s after a launch and can be aimed straight away. It's shown semi-transparent until the table settles (or 1.5 s pass). Releasing early queues the shot. This keeps the brief's "wait for settle" fairness without making players wait idle.
- **Evolution bar** starts with tiers 1–5 revealed (they spawn anyway). Higher tiers show "?" until reached once; progress is saved on the device.
- **Rapier compat build** (WASM inlined) for zero-config deploys. It costs ~1.4 MB gzipped; well within the 15 MB budget. Can switch to the non-compat build later if load time matters.
- **Spawn cap with an empty table** is tier 3 (highest on table 1 + 2), following the brief's "never more than 2 above the highest" rule literally.
