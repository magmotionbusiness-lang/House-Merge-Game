import '@fontsource/big-shoulders-display/800';
import '@fontsource/big-shoulders-display/900';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/architects-daughter/latin-400.css';
import './style.css';
import { initPhysics } from './physics/world';
import { SceneView } from './render/scene';
import { Hud } from './ui/hud';
import { Game } from './game/Game';
import { MAX_TIER } from './core/tiers';
import { Screens } from './ui/screens';
import { smokeTransition } from './ui/smoke';
import { onSettings } from './game/settings';
import { validateDistrict, type District, type LevelDef } from './core/levels';
import district1 from '../levels/district-01.json';
import district2 from '../levels/district-02.json';
import district3 from '../levels/district-03.json';

const DISTRICTS: District[] = [district1, district2, district3].map((d) => validateDistrict(d as District));

/** Canvas textures draw with these fonts, so wait for them (but never block boot for long). */
function loadFonts() {
  const fonts = ['900 64px "Big Shoulders Display"', '400 16px "Architects Daughter"', '700 16px "Barlow Condensed"'];
  const all = Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => undefined);
  return Promise.race([all, new Promise((r) => setTimeout(r, 2500))]);
}

const splash = document.getElementById('splash');
/** Drives the loading bar in index.html (its phrases cycle on their own). */
function loading(p: number, done = false) {
  (window as unknown as { __loading?: (v: number, d?: boolean) => void }).__loading?.(p, done);
}
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

async function boot() {
  loading(0.28);
  await Promise.all([initPhysics(), loadFonts()]);
  loading(0.4);
  await nextFrame();
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;
  const tint = document.getElementById('bg-tint') as HTMLElement;
  const view = new SceneView(canvas, (css) => (tint.style.backgroundColor = css));
  let game: Game | null = null;
  let screens: Screens | null = null;
  const pause = () => {
    if (!game?.isRunning || screens?.open) return;
    game.setPaused(true);
    screens?.pause();
  };
  const hud = new Hud(hudRoot, {
    onPause: () => {
      game?.sfx.tap();
      pause();
    },
    onBooster: (id) => {
      const r = game?.useBooster(id);
      if (r === 'coins') {
        hud.boosterDenied(id);
        hud.showHint('Not enough coins yet: finish contracts to earn more.');
      }
      game?.sfx.tap();
    },
  });
  // Build every building, outline and effect while the splash shows, so play
  // never stutters later. One tier per frame keeps the loading bar moving.
  for (let t = 1; t <= MAX_TIER; t++) {
    view.prewarm(t);
    loading(0.4 + (0.55 * t) / MAX_TIER);
    await nextFrame();
  }
  view.prewarmFx();
  loading(1, true);
  // Flow: title -> play (endless) or campaign -> level intro -> play -> results.
  /** Dust cloud rises over the menu; behind it the round starts, then it clears to reveal the table. */
  const startWithDust = (begin: () => void) => {
    game!.sfx.dust();
    void smokeTransition(() => {
      screens!.hide();
      setPlaying(true);
      begin();
    });
  };
  const setPlaying = (on: boolean) => {
    hudRoot.classList.toggle('idle', !on);
    view.setShowcase(!on, on ? 1.15 : 1.4);
    if (on) {
      // HUD slides in as the camera swoops down to the table.
      hudRoot.classList.remove('enter');
      void hudRoot.offsetWidth;
      hudRoot.classList.add('enter');
      view.settleQuality(2);
    }
  };
  const levelAfter = (id: string): [LevelDef, District] | null => {
    for (const d of DISTRICTS) {
      const i = d.levels.findIndex((l) => l.id === id);
      if (i >= 0 && i + 1 < d.levels.length) return [d.levels[i + 1], d];
    }
    return null;
  };
  const startLevel = (level: LevelDef, district: District) => {
    screens!.levelIntro(level, district, () => startWithDust(() => game!.start({ kind: 'level', level, time: district.time })));
  };
  game = new Game(view, hud, canvas, {
    onEnd: (r) => {
      const next = r.win && r.mode.kind === 'level' ? levelAfter(r.mode.level.id) : null;
      // Let the moment land before the results card slides in.
      window.setTimeout(() => screens!.result(r, next ? () => startLevel(next[0], next[1]) : null), r.win ? 300 : 900);
    },
  });
  screens = new Screens(hudRoot.parentElement as HTMLElement, DISTRICTS, {
    tap: () => {
      game!.sfx.unlock();
      game!.sfx.tap();
    },
    playEndless: () => startWithDust(() => game!.start({ kind: 'endless' })),
    playLevel: startLevel,
    resume: () => screens!.leave(() => game!.setPaused(false)),
    restart: () =>
      screens!.leave(() => {
        setPlaying(true);
        game!.start(game!.currentMode);
      }),
    home: () => {
      game!.stop();
      game!.setPaused(false);
      setPlaying(false);
      screens!.title();
    },
  });
  hudRoot.classList.add('idle');

  // Size everything to the game area itself (full screen on phones, letterboxed on iPad).
  const app = document.getElementById('app') as HTMLElement;
  const resize = () => {
    (window as unknown as { __fitApp?: () => void }).__fitApp?.();
    const box = app.getBoundingClientRect();
    const w = Math.round(box.width);
    const h = Math.round(box.height);
    const top = hud.top.getBoundingClientRect().bottom - box.top + 8;
    const bottom = box.bottom - hud.bottom.getBoundingClientRect().top + 8;
    view.resize(w, h, top, bottom);
  };
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  onSettings((st) => {
    document.documentElement.classList.toggle('large-text', st.largeText);
    requestAnimationFrame(resize);
  });

  // Leaving the app pauses the game and opens the pause menu.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });

  // Add ?debug to the URL to show frame rate and render resolution.
  const debug = new URLSearchParams(location.search).has('debug');
  let frames = 0;
  let fpsClock = 0;

  let last = performance.now();
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    game!.frame(dt);
    last = now;
    if (debug) {
      frames++;
      fpsClock += dt;
      if (fpsClock >= 0.5) {
        hud.setDebug(`${Math.round(frames / fpsClock)} fps · ${view.quality()}`);
        frames = 0;
        fpsClock = 0;
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // Let the first frames render under the loading screen, then the dust cloud
  // rises, swaps in the title behind it, and clears.
  await nextFrame();
  await nextFrame();
  await new Promise((r) => setTimeout(r, 350));
  view.settleQuality(3);
  void smokeTransition(() => {
    splash?.remove();
    screens!.title();
  });
  (window as unknown as { __game: Game; __view: SceneView }).__game = game;
  (window as unknown as { __view: SceneView }).__view = view;
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre class="boot-error">Failed to start: ${String(e)}</pre>`);
});
