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

Phase 3 of 10: **Models** done. All 18 tiers are procedural 3D buildings, from Brick to Space Elevator. See `docs/tier-lineup.png` for the full ladder and `DECISIONS.md` for the reasoning behind each phase.

Add `?debug` to the URL to show frame rate, render resolution and draw calls.

## Develop

```bash
npm install
npm run dev        # local dev server (also reachable from a phone on the same Wi-Fi)
npm test           # unit tests (merge rules, spawn weights, scoring)
npm run build      # type-check + production build into dist/
npm run models:bake  # re-render tier thumbnails, .glb exports and docs/tier-lineup.png
```

## Deploy

Vercel auto-detects Vite: build command `npm run build`, output directory `dist`. Every push deploys.

To install on iPhone: open the site in Safari → Share → **Add to Home Screen**.

## Code map

| Folder | What lives there |
|---|---|
| `src/core` | Pure rules: tier ladder (`tiers.ts`), spawn RNG, scoring, combo, tuning config. Runs headless. |
| `src/physics` | Rapier 2D table world (the game is simulated on the table plane and drawn in 3D). |
| `src/render` | Three.js scene, camera fit, procedural textures, merge effects. |
| `src/models` | One file per tier (`tier01.ts` … `tier18.ts`) building the model in code, plus the modelling kit and shared materials. |
| `src/audio` | Procedural Web Audio sound effects. |
| `scripts/bake.mjs` | Bakes thumbnails (`public/thumbs`), `.glb` exports (`art/models`) and the lineup sheet. |
| `src/ui` | DOM HUD: score, NEXT card, evolution bar, combo stamp, game-over card. |
| `src/game` | The game loop that ties the above together. |
| `tests` | Vitest unit tests. |

All balancing data lives in `src/core/tiers.ts` and `src/core/config.ts`.

## Editing a building

Each tier lives in `src/models/tierNN.ts`. Models are built in "model units": the footprint is 1 unit across and the base sits at y = 0. After changing a model, run `npm run models:bake` so the HUD thumbnails and the lineup sheet match. The bake fails if a tier goes over its triangle budget.
