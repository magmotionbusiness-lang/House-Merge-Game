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

/** Canvas textures draw with these fonts, so wait for them (but never block boot for long). */
function loadFonts() {
  const fonts = ['900 64px "Big Shoulders Display"', '400 16px "Architects Daughter"', '700 16px "Barlow Condensed"'];
  const all = Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => undefined);
  return Promise.race([all, new Promise((r) => setTimeout(r, 2500))]);
}

async function boot() {
  await Promise.all([initPhysics(), loadFonts()]);
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;
  const view = new SceneView(canvas);
  let game: Game | null = null;
  const hud = new Hud(hudRoot, {
    onRestart: () => {
      game?.sfx.unlock();
      game?.sfx.tap();
      game?.reset();
    },
    onToggleMode: () => game?.toggleMode(),
    onToggleSound: () => game?.toggleSound(),
  });
  game = new Game(view, hud, canvas);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const top = hud.top.getBoundingClientRect().bottom + 8;
    const bottom = h - hud.bottom.getBoundingClientRect().top + 8;
    view.resize(w, h, top, bottom);
  };
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  resize();

  document.addEventListener('visibilitychange', () => game?.setPaused(document.hidden));

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
  (window as unknown as { __game: Game }).__game = game;
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre class="boot-error">Failed to start: ${String(e)}</pre>`);
});
