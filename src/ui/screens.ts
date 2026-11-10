import type { District, LevelDef } from '../core/levels';
import { ERA_NAME, tier } from '../core/tiers';
import type { EndResult } from '../game/Game';
import { progress, settings, updateSettings } from '../game/settings';
import { dailyNumber, dailyShareText, dayKey, FUN_FACTS, LOGIN_REWARDS, loginStatus } from '../core/meta';
import { MAX_TIER } from '../core/tiers';
import { ICONS } from './icons';
import { thumbUrl } from './hud';
import { tierName } from '../core/themes';

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
  continueRun(): void;
  hasSavedRun(): number | null; // saved run's score, or null
  playDaily(): void;
  claimLogin(): number | null; // coins paid, or null if already claimed today
  coinsChanged(): void;
  playLevel(level: LevelDef, district: District): void;
  resume(): void;
  restart(): void;
  home(): void;
  /** Rewarded ads (always optional). */
  canContinue(): boolean;
  continueWithAd(): Promise<boolean>;
  doubleCoinsWithAd(): Promise<number>;
  canRefillDaily(): boolean;
  refillDailyWithAd(): void;
  /** Runs a between-rounds ad when the rules allow one, then `then`. */
  betweenRounds(then: () => void): void;
  privacy(): void;
}

/**
 * Menus and flow screens as DOM overlays: title, level select, pause,
 * settings, and the round results. Only one is shown at a time.
 */
export class Screens {
  private layer = el('div', 'screens');
  private calendarShown = false;
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
    // Each letter drops in on its own, then the title keeps a gentle wave.
    const name = el('h1', 'title-name');
    ['BLUEPRINT', 'MERGE'].forEach((word, w) => {
      const line = el('span', 'title-line');
      [...word].forEach((ch, i) => {
        const l = el('span', 'tl', ch);
        const k = w * 9 + i;
        l.style.setProperty('--d', `${0.05 + k * 0.045}s`);
        l.style.setProperty('--w', `${k * 0.12}s`);
        line.append(l);
      });
      name.append(line);
    });
    const sparks = el('div', 'title-sparks');
    for (let i = 0; i < 18; i++) {
      const sp = el('i');
      sp.style.left = `${Math.random() * 100}%`;
      sp.style.animationDelay = `${-Math.random() * 6}s`;
      sp.style.animationDuration = `${4 + Math.random() * 4}s`;
      sp.style.setProperty('--sx', `${(Math.random() - 0.5) * 60}px`);
      sparks.append(sp);
    }
    const tag = el('div', 'title-tag', 'From a single brick to a city in the clouds');
    const stats = el('div', 'title-stats');
    const coins = el('div', 'pill stat coins');
    coins.append(el('span', 'mini-coin'), el('span', '', progress.coins().toLocaleString('en-US')));
    stats.append(coins);
    const menu = el('div', 'menu');
    const today = dayKey();
    const played = progress.daily(today);
    const daily = button(played ? `Daily · ${played.score.toLocaleString('en-US')}` : 'Daily Blueprint', 'big orange', () => (played ? this.dailyDone() : this.h.playDaily()), ICONS.calendar);
    if (played) daily.classList.add('done');
    const row = el('div', 'menu-row');
    row.append(
      button('Skyline', 'small', () => this.skyline(), ICONS.city),
      button('Collection', 'small', () => this.collection(), ICONS.book),
      button('', 'small icon-only', () => this.settings(() => this.title()), ICONS.gear),
    );
    (row.lastElementChild as HTMLElement).setAttribute('aria-label', 'Settings');
    // A run in progress comes first: one tap back to exactly where you were.
    const saved = this.h.hasSavedRun();
    const play =
      saved !== null
        ? button(`Continue · ${saved.toLocaleString('en-US')}`, 'big green hero', () => this.h.continueRun(), ICONS.play)
        : button('Play', 'big green hero', () => this.h.playEndless(), ICONS.play);
    if (!played) daily.append(el('span', 'badge-new', 'NEW'));
    menu.append(play);
    if (saved !== null) menu.append(button('New game', 'small', () => this.h.playEndless(), ICONS.restart));
    menu.append(button('Campaign', 'big blue shine', () => this.levels()), daily, row);
    card.append(logo, name, tag, stats, menu);
    this.show(card, 'title');
    this.current!.prepend(sparks);
    // The daily reward calendar greets the player once per day.
    // Greets once per session; going Back from it must not reopen it.
    if (!this.calendarShown && Number(localStorage.getItem('bm.runs') ?? 0) > 0 && loginStatus(progress.login(), today).claimable) (this.calendarShown = true) && window.setTimeout(() => this.current?.classList.contains('title') && this.calendar(), 650);
  }

  // ---------------------------------------------------------------- meta

  private back(to: () => void) {
    const b = button('Back', 'back-btn', to, ICONS.back);
    b.setAttribute('aria-label', 'Back');
    return b;
  }

  /** 7-day login calendar; today's reward is highlighted and claimable. */
  calendar() {
    const card = el('div', 'panel calendar');
    card.append(el('div', 'eyebrow', 'Daily reward'), el('h2', '', 'Site Pay Day'));
    const st = loginStatus(progress.login(), dayKey());
    const grid = el('div', 'cal-grid');
    LOGIN_REWARDS.forEach((r, i) => {
      const d = i + 1;
      const cell = el('div', `cal-day ${d < st.day ? 'got' : ''} ${d === st.day ? 'today' : ''} ${d === 7 ? 'big' : ''}`);
      const coin = el('div', 'cal-coin');
      coin.append(el('span', 'mini-coin'), el('span', '', r.toLocaleString('en-US')));
      cell.append(el('div', 'cal-label', `Day ${d}`), coin);
      if (d < st.day) cell.append(el('div', 'cal-check', '✓'));
      grid.append(cell);
    });
    card.append(grid, el('p', 'note', 'Come back every day to grow your streak. Miss a day and it starts again.'));
    const claim = button(st.claimable ? `Collect ${LOGIN_REWARDS[st.day - 1].toLocaleString('en-US')}` : 'Collected today', 'big green', () => {
      if (this.h.claimLogin() !== null) {
        this.h.coinsChanged();
        claim.disabled = true;
        grid.children[st.day - 1].classList.add('got', 'pop');
        window.setTimeout(() => this.title(), 900);
      } else this.title();
    });
    claim.disabled = !st.claimable;
    card.append(claim, this.back(() => this.title()));
    this.show(card);
  }

  /** The collection book: every building, locked until built, with a fun fact. */
  collection() {
    const card = el('div', 'panel collection');
    const head = el('div', 'panel-head');
    head.append(this.back(() => this.title()), el('h2', '', 'Collection'));
    const counts = progress.builtCounts();
    const reached = Math.max(5, Number(localStorage.getItem('bm.highest') ?? 0) || 0);
    const owned = (t: number) => (counts[t] ?? 0) > 0 || t <= reached;
    const total = Array.from({ length: MAX_TIER }, (_, i) => i + 1).filter(owned).length;
    card.append(head, el('div', 'collection-count', `${total} / ${MAX_TIER} buildings discovered`));
    const grid = el('div', 'book-grid');
    for (let t = 1; t <= MAX_TIER; t++) {
      const info = tier(t);
      const has = owned(t);
      const cell = el('button', `book-cell ${has ? '' : 'locked'}`);
      cell.style.setProperty('--c', info.color);
      const img = el('img') as HTMLImageElement;
      img.src = thumbUrl(t, 'site');
      img.alt = has ? info.name : 'Locked';
      cell.append(img, el('div', 'book-name', has ? info.name : '???'), el('div', 'book-num', String(t)));
      cell.onclick = () => (has ? this.buildingCard(t, counts[t] ?? 0) : undefined);
      grid.append(cell);
    }
    card.append(grid);
    this.show(card);
  }

  private buildingCard(t: number, built: number) {
    const info = tier(t);
    const card = el('div', 'panel building-card');
    const img = el('img', 'bc-img') as HTMLImageElement;
    img.src = thumbUrl(t, 'site');
    card.append(
      el('div', 'eyebrow', `Tier ${t} · ${ERA_NAME[info.era]}`),
      img,
      el('h2', '', info.name),
      el('p', 'bc-fact', FUN_FACTS[t - 1]),
      el('div', 'bc-built', built ? `Built ${built} time${built === 1 ? '' : 's'}` : 'Dealt by the launcher'),
      this.back(() => this.collection()),
    );
    this.show(card);
  }

  /**
   * My Skyline: every building from a finished contract stands in the
   * player's own city. Tap one building, then another, to swap their plots.
   */
  skyline() {
    const card = el('div', 'panel skyline-panel');
    const head = el('div', 'panel-head');
    head.append(this.back(() => this.title()), el('h2', '', 'My Skyline'));
    const list = progress.skyline();
    card.append(head);
    if (!list.length) {
      card.append(el('p', 'note', 'Finish contracts and their buildings will rise here.'));
      this.show(card);
      return;
    }
    card.append(el('div', 'collection-count', `${list.length} building${list.length === 1 ? '' : 's'} · tap two to swap their plots`));
    const view = el('div', 'skyline-view');
    const street = el('div', 'skyline-street');
    let selected: number | null = null;
    const render = () => {
      street.replaceChildren(
        ...progress.skyline().map((t, i) => {
          const b = el('button', `plot ${selected === i ? 'sel' : ''}`);
          // Bigger tiers stand bigger, so the city reads as a real skyline.
          b.style.setProperty('--w', `${46 + t * 7}px`);
          b.setAttribute('aria-label', tier(t).name);
          const img = el('img') as HTMLImageElement;
          img.src = thumbUrl(t, 'site');
          img.alt = '';
          b.append(img);
          b.onclick = () => {
            if (selected === null) selected = i;
            else {
              const l = progress.skyline();
              [l[selected], l[i]] = [l[i], l[selected]];
              progress.setSkyline(l);
              selected = null;
            }
            render();
          };
          return b;
        }),
      );
    };
    render();
    view.append(street);
    card.append(view);
    this.show(card);
    view.scrollLeft = view.scrollWidth;
  }

  /** Daily already played: today's result and a share button. */
  dailyDone() {
    const day = dayKey();
    const r = progress.daily(day);
    if (!r) return this.title();
    const card = el('div', 'panel result');
    card.append(el('div', 'eyebrow', `Daily Blueprint #${dailyNumber(day)}`), el('h2', '', "Today's build"), el('div', 'result-score', r.score.toLocaleString('en-US')));
    card.append(el('p', 'note', 'A new blueprint arrives tomorrow.'));
    const menu = el('div', 'menu');
    if (this.h.canRefillDaily()) menu.append(button('One more try', 'big green hero ad', () => this.h.refillDailyWithAd(), ICONS.ad));
    menu.append(this.shareButton(day, r.score, r.highest, r.built), this.back(() => this.title()));
    card.append(menu);
    this.show(card);
  }

  /** Endless: share a score and the top building as a challenge. */
  private scoreShare(r: EndResult) {
    const b = button('Challenge a friend', 'small', async () => {
      const top = r.highest ? ` and built a ${tierName(r.highest)}` : '';
      const text = `I scored ${r.score.toLocaleString('en-US')} in Blueprint Merge${top}. Can you beat it? 🏗️`;
      try {
        if (navigator.share) await navigator.share({ text, url: location.origin });
        else {
          await navigator.clipboard.writeText(`${text} ${location.origin}`);
          b.querySelector('span')!.textContent = 'Copied!';
        }
      } catch {
        /* dismissed */
      }
    }, ICONS.share);
    return b;
  }

  private shareButton(day: string, score: number, highest: number, built: number[]) {
    const b = button('Share result', 'big blue', async () => {
      const text = dailyShareText(day, score, highest, new Set(built));
      try {
        if (navigator.share) await navigator.share({ text });
        else {
          await navigator.clipboard.writeText(text);
          b.querySelector('span')!.textContent = 'Copied!';
        }
      } catch {
        /* share sheet dismissed */
      }
    }, ICONS.share);
    return b;
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
      row.append(img, el('span', '', `Build ${c.count} × ${tierName(c.tier)}`));
      list.append(row);
    }
    card.append(list);
    card.append(el('div', 'intro-shots', level.shots === null ? 'Unlimited shots' : `${level.shots} shots`));
    card.append(button("Let's build", 'big green', start, ICONS.play));
    this.show(card);
  }

  // ---------------------------------------------------------------- pause & settings

  pause(daily = false) {
    const card = el('div', 'panel');
    card.append(el('h2', '', 'Paused'));
    if (daily) card.append(el('p', 'note', 'Daily Blueprint: one attempt per day. Leaving ends your run.'));
    const menu = el('div', 'menu');
    menu.append(button('Resume', 'big green', () => this.h.resume(), ICONS.play));
    if (!daily) menu.append(button('Restart', 'big blue', () => this.h.restart(), ICONS.restart));
    menu.append(
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
      row('Privacy & ads', 'Personalised or non-personalised ads', button('Review', 'small', () => this.h.privacy())),
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
    // The score rolls up, then the "so close" or "new best" line lands.
    const score = el('div', 'result-score', '0');
    card.append(score);
    const t0 = performance.now();
    const roll = (now: number) => {
      const u = Math.min(1, (now - t0) / 900);
      score.textContent = Math.round(r.score * (1 - Math.pow(1 - u, 3))).toLocaleString('en-US');
      if (u < 1) requestAnimationFrame(roll);
    };
    requestAnimationFrame(roll);
    if (r.mode.kind === 'endless') {
      const gap = r.bestBefore - r.score;
      let line = `Best ${r.best.toLocaleString('en-US')}`;
      let cls = 'result-best';
      if (r.score > r.bestBefore && r.bestBefore > 0) {
        line = `New best! +${(r.score - r.bestBefore).toLocaleString('en-US')} over your record`;
        cls += ' hot';
      } else if (r.bestBefore === 0 && r.score > 0) line = 'Your first record!';
      else if (gap > 0 && r.score >= r.bestBefore * 0.7) {
        line = `So close! Only ${gap.toLocaleString('en-US')} from your best`;
        cls += ' close';
      }
      card.append(el('div', cls, line));
    }
    const info = el('div', 'result-info');
    if (r.highest > 0) {
      const top = el('div', 'result-top');
      const img = el('img') as HTMLImageElement;
      img.src = thumbUrl(r.highest);
      const t = tier(r.highest);
      top.append(img, el('span', '', `${tierName(r.highest)} · ${ERA_NAME[t.era]}`));
      info.append(top);
    }
    if (r.coins > 0) {
      const c = el('div', 'pill stat coins');
      const amount = el('span', '', `+${r.coins.toLocaleString('en-US')}`);
      c.append(el('span', 'mini-coin'), amount);
      info.append(c);
      // Rewarded: double this round's coins.
      const dbl = button('×2', 'small ad double', async () => {
        dbl.disabled = true;
        const added = await this.h.doubleCoinsWithAd();
        if (added > 0) {
          amount.textContent = `+${(r.coins + added).toLocaleString('en-US')}`;
          c.classList.add('doubled');
          dbl.remove();
        } else dbl.disabled = false;
      }, ICONS.ad);
      dbl.setAttribute('aria-label', 'Watch an ad to double your coins');
      info.append(dbl);
    }
    card.append(info);
    const menu = el('div', 'menu');
    // Rewarded: continue a failed round once (the 3 buildings nearest the line are cleared).
    if (!r.win && this.h.canContinue()) {
      const cont = button(r.reason === 'Out of shots' ? '3 more shots' : 'Continue', 'big green hero ad', async () => {
        cont.disabled = true;
        if (!(await this.h.continueWithAd())) cont.disabled = false;
      }, ICONS.ad);
      menu.append(cont);
      menu.append(el('div', 'ad-note', r.reason === 'Out of shots' ? 'Watch a short ad for 3 more shots' : 'Watch a short ad: the 3 buildings nearest the line are cleared'));
    }
    const gate = (fn: () => void) => () => this.h.betweenRounds(fn);
    if (r.mode.kind === 'daily') {
      card.prepend(el('div', 'eyebrow', `Daily Blueprint #${dailyNumber(r.mode.day)}`));
      menu.append(this.shareButton(r.mode.day, r.score, r.highest, r.built), button('Home', 'small', gate(() => this.h.home()), ICONS.home));
      card.append(menu);
      this.show(card);
      return;
    }
    const retryHero = !(r.win && next) && !menu.childElementCount;
    if (r.win && next) menu.append(button('Next level', 'big green hero', gate(next), ICONS.play));
    menu.append(
      button(r.win ? 'Replay' : r.mode.kind === 'endless' ? 'Build again' : 'Try again', retryHero ? 'big green hero' : 'big blue', gate(() => this.h.restart()), ICONS.restart),
    );
    if (r.mode.kind === 'endless') menu.append(this.scoreShare(r));
    menu.append(button('Home', 'small', gate(() => this.h.home()), ICONS.home));
    card.append(menu);
    this.show(card);
  }
}
