import './style.css';
import { initPhysics } from './physics/world';
import { SceneView } from './render/scene';
import { Hud } from './ui/hud';
import { Game } from './game/Game';

async function boot() {
  await initPhysics();
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;
  const view = new SceneView(canvas);
  let game: Game | null = null;
  const hud = new Hud(hudRoot, {
    onRestart: () => game?.reset(),
    onToggleMode: () => game?.toggleMode(),
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

  let last = performance.now();
  const loop = (now: number) => {
    game!.frame((now - last) / 1000);
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  (window as unknown as { __game: Game }).__game = game;
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre class="boot-error">Failed to start: ${String(e)}</pre>`);
});
