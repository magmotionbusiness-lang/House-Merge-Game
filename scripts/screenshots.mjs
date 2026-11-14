// App Store screenshots at the 6.9" iPhone size Apple requires (1320 x 2868).
// Usage: npm run build && npm run screenshots   → docs/app-store/screenshots/*.png
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { preview } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = 'docs/app-store/screenshots';
mkdirSync(OUT, { recursive: true });

const server = await preview({ preview: { port: 4199, strictPort: false }, logLevel: 'error' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  const st = {};
  for (let i = 1; i <= 33; i++) st[`1-${i}`] = 3;
  for (let i = 1; i <= 14; i++) st[`2-${i}`] = 2 + (i % 2);
  localStorage.setItem('bm.stars', JSON.stringify(st));
  localStorage.setItem('bm.runs', '20');
  localStorage.setItem('bm.consent', 'personalized');
  localStorage.setItem('bm.highest', '13');
  localStorage.setItem('bm.coins', '4820');
  localStorage.setItem('bm.best', '186400');
});
const page = await ctx.newPage();
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 120000 });
  console.log('wrote', `${OUT}/${name}.png`);
};
const wait = (ms) => page.waitForTimeout(ms);
await page.goto(url + '?noads');
await page.waitForSelector('#splash.ready', { timeout: 120000 });
await page.click('#sp-go', { force: true });
await wait(3500);

// 1. Title screen.
await page.evaluate(() => window.__screens.title());
await wait(2500);
await shot('1-title');

// 2. Gameplay: a busy beach board mid-merge, heat glowing, a streak going.
await page.evaluate(() => window.__screens.h.playEndless());
await page.waitForFunction(() => window.__game.isRunning, null, { timeout: 30000 });
await wait(2500);
await page.evaluate(() => {
  const g = window.__game;
  g.switchTheme('beach', true);
  [[5, -0.32, 1.62], [7, 0.02, 1.6], [6, 0.33, 1.58], [4, -0.22, 1.28], [8, 0.18, 1.25], [3, -0.36, 1.0], [5, 0.0, 0.98], [2, 0.34, 0.95]].forEach(([t, x, y]) => g.debugPlace(t, x, y));
  g.addScore(24800 - g.debugState().score);
  g.streak = 5;
  g.hud.setStreak(5);
});
await wait(2500);
await page.evaluate(() => {
  const g = window.__game;
  g.debugPlace(3, -0.05, 0.75);
  g.debugPlace(3, 0.05, 0.75);
});
await wait(330);
await shot('2-merge');

// 3. Another map: Sakura Spring with the aim guide showing a chain.
await page.evaluate(() => {
  const g = window.__game;
  g.switchTheme('sakura', true);
});
await wait(2800);
await page.evaluate(() => {
  const g = window.__game;
  g.aimX = 0.0;
  if (g.launcher) g.launcher.x = 0;
});
await wait(800);
await shot('3-themes');

// 4. The campaign map.
await page.evaluate(() => {
  window.__game.stop();
  window.__screens.levels();
});
await wait(3000);
await shot('4-campaign');

// 5. A level clear.
await page.evaluate(() => {
  window.__screens.h.playLevel(
    { id: '2-15', name: 'Overwater Bungalow', shots: 14, contracts: [{ tier: 4, count: 1 }], start: [[6, -0.3, 1.55], [7, 0.3, 1.6], [2, 0, 1.25], [5, -0.15, 0.95], [3, 0.22, 1.0]] },
    { id: 2, name: 'Tropical Beach', time: 'noon', levels: [] },
  );
});
await page.waitForFunction(() => window.__game.isRunning, null, { timeout: 30000 });
await wait(2500);
await page.evaluate(() => {
  const g = window.__game;
  g.debugPlace(3, -0.04, 1.5);
  g.debugPlace(3, 0.06, 1.5);
});
await page.waitForSelector('.celeb-shout span', { timeout: 30000 });
// Freeze the shout at its fully-landed pose (swiftshader frames are too slow to time it).
await page.evaluate(() => document.querySelectorAll('.celeb-shout span').forEach((s) => s.getAnimations().forEach((a) => { a.currentTime = 700; a.pause(); })));
await wait(300);
await shot('5-level-clear');

// 6. The collection with every theme.
await page.evaluate(() => {
  window.__game.stop();
  window.__screens.collection('atlantis');
});
await wait(2500);
await shot('6-collection');

await browser.close();
await new Promise((r) => server.httpServer.close(r));
