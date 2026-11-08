import type { District, LevelDef } from '../core/levels';
import { ERA_NAME, tier } from '../core/tiers';
import type { EndResult } from '../game/Game';
import { progress, settings, updateSettings } from '../game/settings';
import { ICONS } from './icons';
import { thumbUrl } from './hud';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function button(label: string, cls: string, onClick: () => void, icon?: string) {
  const b = el('button', `btn ${cls}`);
  b.innerHTML = `${icon ?? ''}<span>${label}</span>`;
  b.onclick = () => {
    onTap?.();
    onClick();
  };
  return b;
}

let onTap: (() => void) | null = null;

function stars(n: number, max = 3, animate = false) {
  const row = el('div', 'stars');
  for (let i = 0; i < max; i++) {
    const s = el('span', `star ${i < n ? 'on' : ''}`, '★');
    if (animate && i < n) s.style.animationDelay = `${0.35 + i * 0.28}s`;
    if (animate && i < n) s.classList.add('pop');
    row.append(s);
  }
  return row;
}

export interface ScreenHandlers {
  tap(): void;
  playEndless(): void;
  playLevel(level: LevelDef, district: District): void;
  resume(): void;
  restart(): void;
  home(): void;
}

/**
 * Menus and flow screens as DOM overlays: title, level select, pause,
 * settings, and the round results. Only one is shown at a time.
 */
export class Screens {
  private layer = el('div', 'screens');
  private current: HTMLElement | null = null;

  constructor(
    root: HTMLElement,
    private districts: District[],
    private h: ScreenHandlers,
  ) {
    onTap = h.tap;
    root.append(this.layer);
  }

  get open() {
    return this.current !== null;
  }

  private show(card: HTMLElement, cls = '') {
    this.hide();
    const wrap = el('div', `screen ${cls}`);
    wrap.append(card);
    this.layer.append(wrap);
    this.current = wrap;
  }

  hide() {
    this.current?.remove();
    this.current = null;
  }

  /** Animates the current screen out, then runs `then` (used when play starts). */
  leave(then: () => void) {
    const cur = this.current;
    this.current = null;
    if (!cur) {
      then();
      return;
    }
    cur.classList.add('leaving');
    cur.style.pointerEvents = 'none';
    window.setTimeout(() => cur.remove(), 320);
    window.setTimeout(then, 120);
  }

  // ---------------------------------------------------------------- title

  title() {
    const card = el('div', 'title-card');
    const logo = el('img', 'title-logo') as HTMLImageElement;
    logo.src = `${import.meta.env.BASE_URL}logo.webp`;
    logo.alt = '';
    const name = el('h1', 'title-name');
    name.innerHTML = 'BLUEPRINT<br>MERGE';
    const tag = el('div', 'title-tag', 'From a single brick to a city in the clouds');
    const stats = el('div', 'title-stats');
    const coins = el('div', 'pill stat coins');
    coins.append(el('span', 'mini-coin'), el('span', '', progress.coins().toLocaleString('en-US')));
    stats.append(coins);
    const menu = el('div', 'menu');
    menu.append(
      button('Play', 'big green', () => this.h.playEndless(), ICONS.play),
      button('Campaign', 'big blue', () => this.levels()),
      button('Settings', 'small', () => this.settings(() => this.title()), ICONS.gear),
    );
    card.append(logo, name, tag, stats, menu);
    this.show(card, 'title');
  }

  // ---------------------------------------------------------------- campaign

  levels() {
    const card = el('div', 'panel levels-panel');
    const head = el('div', 'panel-head');
    const back = button('Back', 'back-btn', () => this.title(), ICONS.back);
    back.setAttribute('aria-label', 'Back to the title screen');
    head.append(back, el('h2', '', 'Campaign'));
    card.append(head);
    const got = progress.stars();
    let unlocked = true;
    for (const d of this.districts) {
      const sec = el('section', 'district');
      const total = d.levels.reduce((a, l) => a + (got[l.id] ?? 0), 0);
      const h = el('div', 'district-head');
      h.append(el('h3', '', `${d.id}. ${d.name}`), el('span', 'district-stars', `★ ${total}/${d.levels.length * 3}`));
      sec.append(h);
      const grid = el('div', 'level-grid');
      d.levels.forEach((l, i) => {
        const s = got[l.id] ?? 0;
        const tile = el('button', `level-tile ${unlocked ? '' : 'locked'} ${(i + 1) % 5 === 0 ? 'big' : ''}`);
        tile.append(el('span', 'level-num', unlocked ? String(i + 1) : '🔒'), stars(s));
        tile.title = l.name;
        const playable = unlocked;
        tile.onclick = () => {
          onTap?.();
          if (playable) this.h.playLevel(l, d);
        };
        grid.append(tile);
        unlocked = unlocked && s > 0;
      });
      sec.append(grid);
      card.append(sec);
    }
    card.append(el('p', 'note', 'More districts are under construction.'));
    this.show(card);
  }

  /** Level intro: the contracts to build and the shot limit. */
  levelIntro(level: LevelDef, district: District, start: () => void) {
    const card = el('div', 'panel intro');
    card.append(el('div', 'eyebrow', `${district.name} · Level ${level.id}`), el('h2', '', level.name));
    const list = el('div', 'intro-contracts');
    for (const c of level.contracts) {
      const row = el('div', 'intro-row');
      const img = el('img') as HTMLImageElement;
      img.src = thumbUrl(c.tier);
      row.append(img, el('span', '', `Build ${c.count} × ${tier(c.tier).name}`));
      list.append(row);
    }
    card.append(list);
    card.append(el('div', 'intro-shots', level.shots === null ? 'Unlimited shots' : `${level.shots} shots`));
    card.append(button("Let's build", 'big green', start, ICONS.play));
    this.show(card);
  }

  // ---------------------------------------------------------------- pause & settings

  pause() {
    const card = el('div', 'panel');
    card.append(el('h2', '', 'Paused'));
    const menu = el('div', 'menu');
    menu.append(
      button('Resume', 'big green', () => this.h.resume(), ICONS.play),
      button('Restart', 'big blue', () => this.h.restart(), ICONS.restart),
      button('Settings', 'small', () => this.settings(() => this.pause()), ICONS.gear),
      button('Home', 'small', () => this.h.home(), ICONS.home),
    );
    card.append(menu);
    this.show(card);
  }

  settings(back: () => void) {
    const card = el('div', 'panel settings');
    card.append(el('h2', '', 'Settings'));
    const row = (label: string, sub: string, control: HTMLElement) => {
      const r = el('label', 'set-row');
      const t = el('div', 'set-text');
      t.append(el('div', 'set-label', label), el('div', 'set-sub', sub));
      r.append(t, control);
      return r;
    };
    // Volume slider (0-100) bound to a 0-1 setting; the label shows the value live.
    const slider = (key: 'sfxVolume' | 'gameMusic' | 'homeMusic', label: string, icon: string) => {
      const wrap = el('div', 'vol-row');
      const head = el('div', 'vol-head');
      const val = el('span', 'vol-val', `${Math.round(settings[key] * 100)}%`);
      head.innerHTML = `${icon}<span class="set-label">${label}</span>`;
      head.append(val);
      const input = el('input', 'vol') as HTMLInputElement;
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.step = '5';
      input.value = String(Math.round(settings[key] * 100));
      input.setAttribute('aria-label', `${label} volume`);
      const paint = () => input.style.setProperty('--pct', `${input.value}%`);
      paint();
      input.oninput = () => {
        updateSettings({ [key]: Number(input.value) / 100 });
        val.textContent = `${input.value}%`;
        paint();
      };
      wrap.append(head, input);
      return wrap;
    };
    const toggle = (key: 'calm' | 'largeText') => {
      const b = el('button', `toggle ${settings[key] ? 'on' : ''}`);
      b.setAttribute('role', 'switch');
      b.setAttribute('aria-checked', String(settings[key]));
      b.append(el('span', 'knob'));
      b.onclick = () => {
        updateSettings({ [key]: !settings[key] });
        b.classList.toggle('on', settings[key]);
        b.setAttribute('aria-checked', String(settings[key]));
        onTap?.();
      };
      return b;
    };
    const seg = el('div', 'segmented');
    for (const m of ['slide', 'sling'] as const) {
      const b = el('button', settings.aim === m ? 'on' : '', m === 'slide' ? 'Slide' : 'Sling');
      b.onclick = () => {
        updateSettings({ aim: m });
        seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        onTap?.();
      };
      seg.append(b);
    }
    card.append(
      slider('sfxVolume', 'Sound effects', ICONS.soundOn),
      slider('gameMusic', 'Game music', ICONS.music),
      slider('homeMusic', 'Home music', ICONS.home),
      row('Aiming', 'Slide: fixed power. Sling: pull down for power.', seg),
      row('Calm effects', 'No screen shake or white flashes', toggle('calm')),
      row('Large text', 'Bigger labels and numbers', toggle('largeText')),
      button('Done', 'big green', back),
    );
    this.show(card);
  }

  // ---------------------------------------------------------------- results

  result(r: EndResult, next: (() => void) | null) {
    const card = el('div', `panel result ${r.win ? 'win' : 'fail'}`);
    if (r.win) {
      card.append(el('h2', 'result-title', 'Level complete!'), stars(r.stars, 3, true));
    } else {
      card.append(el('h2', 'result-title', r.reason === 'Out of shots' ? 'Out of shots' : 'Site overflow!'), el('div', 'result-sub', r.reason));
    }
    const score = el('div', 'result-score', r.score.toLocaleString('en-US'));
    card.append(score);
    if (r.mode.kind === 'endless') card.append(el('div', 'result-best', r.score >= r.best && r.score > 0 ? 'New best!' : `Best ${r.best.toLocaleString('en-US')}`));
    const info = el('div', 'result-info');
    if (r.highest > 0) {
      const top = el('div', 'result-top');
      const img = el('img') as HTMLImageElement;
      img.src = thumbUrl(r.highest);
      const t = tier(r.highest);
      top.append(img, el('span', '', `${t.name} · ${ERA_NAME[t.era]}`));
      info.append(top);
    }
    if (r.coins > 0) {
      const c = el('div', 'pill stat coins');
      c.append(el('span', 'mini-coin'), el('span', '', `+${r.coins.toLocaleString('en-US')}`));
      info.append(c);
    }
    card.append(info);
    const menu = el('div', 'menu');
    if (r.win && next) menu.append(button('Next level', 'big green', next, ICONS.play));
    menu.append(
      button(r.win ? 'Replay' : r.mode.kind === 'endless' ? 'Build again' : 'Try again', r.win && next ? 'big blue' : 'big green', () => this.h.restart(), ICONS.restart),
      button('Home', 'small', () => this.h.home(), ICONS.home),
    );
    card.append(menu);
    this.show(card);
  }
}
