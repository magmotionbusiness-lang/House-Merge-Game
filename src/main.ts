import '@fontsource/big-shoulders-display/800';
import '@fontsource/big-shoulders-display/900';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/architects-daughter/latin-400.css';
import './style.css';
import { initPhysics } from './physics/world';
import { SceneView } from './render/scene';
import { Ambient } from './render/ambient';
import { Hud } from './ui/hud';
import { Game, savedRun } from './game/Game';
import { MAX_TIER } from './core/tiers';
import { Screens } from './ui/screens';
import { smokeTransition } from './ui/smoke';
import { Music } from './audio/music';
import { createAds } from './ads/ads';
import { booster } from './core/boosters';
import { ICONS } from './ui/icons';
import { store } from './game/storage';
import { setTheme, themeForDistrict } from './core/themes';
import { onSettings, progress } from './game/settings';
import { claimLogin, dailySeed, dayKey } from './core/meta';
import { validateDistrict, type District, type LevelDef } from './core/levels';
import district1 from '../levels/district-01.json';
import district2 from '../levels/district-02.json';
import district3 from '../levels/district-03.json';
import district4 from '../levels/district-04.json';
import district5 from '../levels/district-05.json';
import district6 from '../levels/district-06.json';
import district7 from '../levels/district-07.json';
import district8 from '../levels/district-08.json';

const DISTRICTS: District[] = [district1, district2, district3, district4, district5, district6, district7, district8].map((d) => validateDistrict(d as District));

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
  // Snow, sprinkles, rain... the backdrop's own little motion, behind the board.
  const ambient = new Ambient(canvas.parentElement as HTMLElement, canvas);
  onSettings((st) => ambient.setCalm(st.calm));
  let game: Game | null = null;
  let screens: Screens | null = null;
  const music = new Music();
  // Ads: the web build shows 3-second test ads; the native build will use AdMob behind the same API.
  let adPaused = false;
  const ads = createAds({
    onStart: () => {
      music.suspend(true);
      if (game?.isRunning && !game.isPaused) {
        game.setPaused(true);
        adPaused = true;
      }
    },
    onEnd: () => {
      music.suspend(false);
      if (adPaused) game?.setPaused(false);
      adPaused = false;
    },
  });
  music.playHome();
  const pause = () => {
    if (!game?.isRunning || screens?.open) return;
    game.setPaused(true);
    screens?.pause(game.currentMode.kind === 'daily');
  };
  const hud = new Hud(hudRoot, {
    onPause: () => pause(),
    onBooster: (id) => {
      const r = game?.useBooster(id);
      if (r === 'coins') {
        hud.boosterDenied(id);
        // One booster per round can be had for a short ad instead.
        if (game?.canAdBooster()) {
          const def = booster(id);
          hud.offerAdBooster(def.name, ICONS[id], async () => {
            if (await ads.rewarded('booster')) game?.grantFreeBooster(id);
          });
        } else hud.showHint('Not enough coins yet: finish contracts to earn more.');
      }
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
  /** Dust cloud rises over the menu; behind it the round starts (with a freshly shuffled playlist), then it clears. */
  const startWithDust = (begin: () => void) => {
    game!.sfx.dust();
    void smokeTransition(() => {
      screens!.hide();
      setPlaying(true);
      music.playGame();
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
  /** The map's level card already showed the goal: Play starts the level straight away. */
  const startLevel = (level: LevelDef, district: District) => {
    setTheme(themeForDistrict(district.id));
    startWithDust(() => game!.start({ kind: 'level', level, time: district.time }));
  };
  /** After a win: back to the map, where the builder hops on to the next level and its card drops in. */
  const toMap = (hopFrom?: string) => {
    game!.stop();
    game!.setPaused(false);
    setPlaying(false);
    music.playHome();
    screens!.levels({ hopFrom, autoOpen: !!hopFrom });
  };
  game = new Game(view, hud, canvas, {
    onTension: (k) => music.setTension(k),
    onTheme: () => music.changeTrack(),
    onMerge: (tierId, combo) => {
      if (tierId >= 10 || combo >= 3) music.duck(0.35, 0.45);
    },
    onEnd: (r) => {
      const next = r.win && r.mode.kind === 'level' ? () => toMap((r.mode as { level: LevelDef }).level.id) : null;
      // Let the moment land before the results card slides in.
      window.setTimeout(() => screens!.result(r, next), r.win ? 300 : 650);
      // Each star rings as it lands on the results card.
      if (r.win) for (let i = 0; i < r.stars; i++) window.setTimeout(() => game!.sfx.star(i), 300 + 350 + i * 280);
    },
  });
  screens = new Screens(hudRoot.parentElement as HTMLElement, DISTRICTS, {
    tap: () => game!.sfx.unlock(),
    playEndless: () => startWithDust(() => game!.start({ kind: 'endless' })),
    continueRun: () => {
      const r = savedRun();
      if (r) startWithDust(() => game!.resumeRun(r));
      else startWithDust(() => game!.start({ kind: 'endless' }));
    },
    hasSavedRun: () => savedRun()?.score ?? null,
    playDaily: () => {
      const day = dayKey();
      if (progress.daily(day)) return screens!.dailyDone();
      // One attempt per day: the attempt counts as soon as it starts.
      progress.setDaily(day, { score: 0, highest: 0, built: [] });
      startWithDust(() => game!.start({ kind: 'daily', day, seed: dailySeed(day) }));
    },
    claimLogin: () => {
      const r = claimLogin(progress.login(), dayKey());
      if (!r) return null;
      progress.setLogin(r.state);
      hud.setCoins(progress.addCoins(r.reward));
      game!.sfx.contract();
      return r.reward;
    },
    coinsChanged: () => undefined,
    playLevel: startLevel,
    resume: () => screens!.leave(() => game!.setPaused(false)),
    restart: () =>
      screens!.leave(() => {
        setPlaying(true);
        music.playGame();
        game!.start(game!.currentMode);
      }),
    canContinue: () => game!.canRevive(),
    continueWithAd: async () => {
      if (!(await ads.rewarded('continue'))) return false;
      if (!game!.revive()) return false;
      screens!.leave(() => undefined);
      return true;
    },
    doubleCoinsWithAd: async () => ((await ads.rewarded('double_coins')) ? game!.doubleCoins() : 0),
    canRefillDaily: () => store.num(`bm.dailyRefill.${dayKey()}`, 0) === 0,
    refillDailyWithAd: async () => {
      if (!(await ads.rewarded('daily_refill'))) return;
      const day = dayKey();
      store.set(`bm.dailyRefill.${day}`, 1);
      // The Daily keeps the best of the two attempts.
      startWithDust(() => game!.start({ kind: 'daily', day, seed: dailySeed(day) }));
    },
    betweenRounds: (then) => void ads.betweenRounds(game!.roundsFinished).then(then),
    privacy: () => void ads.reviewConsent(),
    home: () => {
      game!.stop();
      game!.setPaused(false);
      setPlaying(false);
      music.playHome();
      screens!.title();
    },
  });
  hudRoot.classList.add('idle');

  // Audio starts on the first touch (browsers require a gesture); music joins the same context.
  game.sfx.onUnlock((ctx) => music.attach(ctx));
  onSettings((st) => {
    music.setVolume('home', st.homeMusic);
    music.setVolume('game', st.gameMusic);
  });
  // Every button gets a click: a soft pop, or a falling pop for back, close and home.
  const unlock = () => game!.sfx.unlock();
  document.addEventListener('touchend', unlock, { passive: true });
  document.addEventListener('click', unlock);
  document.addEventListener(
    'pointerdown',
    (e) => {
      unlock();
      const b = (e.target as Element | null)?.closest('button, .level-tile');
      if (!b) return;
      const label = `${b.getAttribute('aria-label') ?? ''} ${b.textContent ?? ''}`.toLowerCase();
      if (/back|cancel|home|close/.test(label)) game!.sfx.tapBack();
      else game!.sfx.tap();
    },
    { capture: true },
  );

  // Size everything to the game area itself (full screen on phones, letterboxed on iPad).
  const app = document.getElementById('app') as HTMLElement;
  const resize = () => {
    (window as unknown as { __fitApp?: () => void }).__fitApp?.();
    const box = app.getBoundingClientRect();
    const w = Math.round(box.width);
    const h = Math.round(box.height);
    const top = hud.top.getBoundingClientRect().bottom - box.top + 8;
    // Praise, cards and hints sit in the strip between the top HUD and the board.
    hudRoot.style.setProperty('--band-top', `${Math.round(top - 4)}px`);
    const bottom = box.bottom - hud.bottom.getBoundingClientRect().top + 8;
    view.resize(w, h, top, bottom);
  };
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  onSettings((st) => {
    document.documentElement.classList.toggle('large-text', st.largeText);
    document.documentElement.classList.toggle('calm', st.calm);
    requestAnimationFrame(resize);
  });

  // Leaving the app pauses the game and opens the pause menu.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game?.saveRun();
      pause();
    }
  });
  window.addEventListener('pagehide', () => game?.saveRun());

  // Add ?debug to the URL to show frame rate and render resolution.
  const debug = new URLSearchParams(location.search).has('debug');
  let frames = 0;
  let fpsClock = 0;

  let last = performance.now();
  const loop = (now: number) => {
    const dt = (now - last) / 1000;
    game!.frame(dt);
    ambient.tick(dt);
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
  // Browsers only allow sound after a touch, so loading ends on "Tap to build":
  // that tap starts the home music at once while the dust clears to the title.
  await new Promise<void>((resolve) => {
    const go = document.getElementById('sp-go');
    const start = () => {
      game!.sfx.unlock();
      game!.sfx.dust();
      resolve();
    };
    if (go) go.addEventListener('click', start, { once: true });
    else resolve();
  });
  view.settleQuality(3);
  // Brand-new players go straight onto the board: no menu between "I want to
  // play" and playing. Everyone else lands on the title (with Continue if a run is saved).
  const firstEver = Number(localStorage.getItem('bm.runs') ?? 0) === 0 && !savedRun();
  void smokeTransition(() => {
    splash?.remove();
    if (firstEver) {
      setPlaying(true);
      music.playGame();
      game!.start({ kind: 'endless' });
      hud.showHint('Drag to aim, let go to slide. Match two buildings to merge them!');
    } else screens!.title();
  });
  (window as unknown as { __game: Game; __view: SceneView; __ads: unknown }).__game = game;
  (window as unknown as { __ads: unknown }).__ads = ads;
  (window as unknown as { __screens: unknown }).__screens = screens;
  (window as unknown as { __view: SceneView }).__view = view;
  (window as unknown as { __music: Music }).__music = music;
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre class="boot-error">Failed to start: ${String(e)}</pre>`);
});
