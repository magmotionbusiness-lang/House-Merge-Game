# Blueprint Merge

*From a single brick to a city in the clouds.*

A portrait, mobile-first 3D flick-to-merge game. Slide building pieces up a blueprint table; two identical pieces that touch merge into the next tier, from **Brick** (1) all the way up to the **Orbital Elevator** (18).

## How to play

1. Touch anywhere and drag left/right to aim. The piece on the dashed launch line follows your finger, and the dotted line shows its path.
2. Let go to slide it up the table.
3. Two identical pieces touching merge into the next tier. Merges in quick succession build a combo (**APPROVED ×3**).
4. Don't let the pile settle across the **red site boundary** for 2 seconds.

**Aim modes** (button under the score): *Slide* (fixed power, like the reference game) and *Sling* (drag down to add power). Both are in for testing; the one that feels better stays.

## Status

Phase 2 of 10: **Juice pass 1** done (merge sequence, era particles, combos, procedural sound). Pieces are still numbered, coloured cylinders; the real 3D buildings arrive in Phase 3 (see `DECISIONS.md`).

Add `?debug` to the URL to show frame rate, render resolution and draw calls.

## Develop

```bash
npm install
npm run dev        # local dev server (also reachable from a phone on the same Wi-Fi)
npm test           # unit tests (merge rules, spawn weights, scoring)
npm run build      # type-check + production build into dist/
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
| `src/ui` | DOM HUD: score, NEXT card, evolution bar, combo stamp, game-over card. |
| `src/game` | The game loop that ties the above together. |
| `tests` | Vitest unit tests. |

All balancing data lives in `src/core/tiers.ts` and `src/core/config.ts`.
