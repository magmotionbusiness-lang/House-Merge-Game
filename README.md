# Blueprint Merge

*From a single brick to a city in the clouds.*

A portrait, mobile-first 3D flick-to-merge game. Slide building pieces up a blueprint table; two identical pieces that touch merge into the next tier, from a **Brick** (1) through houses and apartments up to the **Space Elevator** (18). Every piece shows its rank number; the badge ring is bronze, silver, gold or diamond by era.

## How to play

1. Touch anywhere and drag left/right to aim. The piece on the dashed launch line follows your finger, and the dotted line shows its path.
2. Let go to slide it up the table.
3. Two identical pieces touching merge into the next tier. Merges in quick succession build a combo (**APPROVED ×3**).
4. Don't let the pile settle across the **red site boundary** for 2 seconds.

**Aim modes** (button under the score): *Slide* (fixed power, like the reference game) and *Sling* (drag down to add power). Both are in for testing; the one that feels better stays.

## Status

**Campaign:** 8 themed districts × 33 levels on a Candy Crush-style scrolling map, with star gates between districts and a "Sugar Crush"-style level-clear celebration (leftover shots become bonus fireworks).

**Map themes**: a run travels through eight themes (Construction Site, Tropical Beach, Alpine Peaks, Sweet Town, Neon City, Atlantis, Sakura Spring, Desert Oasis). Each has its own backdrop, rails and 18-building lineup; the switch happens on a big moment after a couple of minutes. Campaign districts each have a home theme, and the Daily picks one by date.

Phase 7 of 10: **Meta and retention** done (Daily Blueprint, login calendar, collection book, My Skyline), plus music and the merge "dopamine" pass. Phase 6: 45 campaign levels tuned by a balancing bot, plus four coin boosters. Phase 5: title, campaign map, pause, settings, contracts, coins, level complete and fail screens. Phase 4: painted construction-site backdrop, time-of-day tint, camera ease-back. Phase 3 **Models**: All 18 tiers are procedural 3D buildings, from Brick to Space Elevator. See `docs/tier-lineup.png` for the full ladder and `DECISIONS.md` for the reasoning behind each phase.

Add `?debug` to the URL to show frame rate, render resolution and draw calls.

## Develop

```bash
npm install
npm run dev        # local dev server (also reachable from a phone on the same Wi-Fi)
npm test           # unit tests (merge rules, spawn weights, scoring)
npm run build      # type-check + production build into dist/
npm run models:bake  # re-render tier thumbnails, .glb exports and docs/tier-lineup.png
npm run balance      # bot-play every level, report to docs/balance.csv (add -- --write to tune shot limits)
```

## Deploy

Vercel auto-detects Vite: build command `npm run build`, output directory `dist`. Every push deploys.

To install on iPhone: open the site in Safari → Share → **Add to Home Screen**.

## Code map

| Folder | What lives there |
|---|---|
| `src/core` | Pure rules: tier ladder (`tiers.ts`), spawn RNG, scoring, combo, tuning config. Runs headless. |
| `src/physics` | Rapier 2D table world (the game is simulated on the table plane and drawn in 3D). |
| `src/render` | Three.js scene, camera fit, procedural textures, merge effects, the construction site (`site.ts`) and time-of-day lighting (`lighting.ts`). |
| `src/models` | One file per tier (`tier01.ts` … `tier18.ts`) for the construction site, one file per theme lineup (`beach.ts`, `alpine.ts`, `sweet.ts`, `neon.ts`), plus the modelling kit (`kit.ts`, `themekit.ts`) and shared materials. |
| `src/core/themes.ts` | Map themes: names, building names per tier, rail and confetti colours, backdrop art, switch timing. |
| `src/audio` | Procedural Web Audio sound effects (`sfx.ts`) and the music player with the shuffled playlist (`music.ts`). |
| `scripts/bake.mjs` | Bakes thumbnails (`public/thumbs`), `.glb` exports (`art/models`) and the lineup sheet. |
| `src/ui` | DOM HUD: score, NEXT card, evolution bar, combo stamp, game-over card. |
| `src/game` | The game loop that ties the above together. |
| `src/ui` | HUD (`hud.ts`) and menu screens (`screens.ts`). |
| `levels` | Campaign districts as JSON (`district-01.json`, ...). |
| `tests` | Vitest unit tests. |

All balancing data lives in `src/core/tiers.ts` and `src/core/config.ts`.

## Editing a building

Each tier lives in `src/models/tierNN.ts`. Models are built in "model units": the footprint is 1 unit across and the base sits at y = 0. After changing a model, run `npm run models:bake` so the HUD thumbnails and the lineup sheet match. The bake fails if a tier goes over its triangle budget.

## Theme backdrops

Each theme can use a painted backdrop like the construction site (`public/bg/site.webp`, portrait, about 940 × 1670). Put the image in `public/bg` (for example `public/bg/beach.webp`) and set `art: 'bg/beach.webp'` for that theme in `src/core/themes.ts`. All five themes have painted art; a theme without art falls back to a stylised backdrop painted in code (`src/render/backdrops.ts`). Keep the important scenery in the top third and down the sides: the board covers the middle and bottom.

## Adding levels

Levels live in `levels/district-01..08.json`, generated by `tools/make_levels.py` (33 levels per district in three acts of 11). After changing the generator, run `python3 tools/make_levels.py` (`ONLY=6,7 python3 tools/make_levels.py` regenerates just those districts), then `npm run balance -- --write` (or one district at a time with `--district N`, several in parallel). Levels can also have scaffold `obstacles` (`[[x, y, width, height]]`). Each level has an `id`, `name`, `shots` (a number or `null`), `contracts` (`[{ "tier": 4, "count": 2 }]`), and optionally a starting pile `start` (`[[tier, x, y], ...]`, with x from -0.5 to 0.5 and y from 0.5 to 1.8), spawn weights `spawn` and a `hint`. `npm test` validates every district.
