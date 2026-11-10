import type { Contract } from '../core/contracts';
import { BOOSTERS, type BoosterId } from '../core/boosters';
import { ERA_RING, MAX_TIER, tier } from '../core/tiers';
import { ICONS } from './icons';
import { currentTheme, tierName, type Theme, type ThemeId } from '../core/themes';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Baked 3D thumbnail for a tier in a theme, the current one by default (see `npm run models:bake`). */
export const thumbUrl = (tierId: number, theme: ThemeId = currentTheme().id) =>
  `${import.meta.env.BASE_URL}thumbs/${theme === 'site' ? '' : `${theme}/`}tier-${String(tierId).padStart(2, '0')}.png`;

function chip(tierId: number | null, size: 'sm' | 'lg' = 'sm') {
  const c = el('div', `chip chip-${size}`);
  if (tierId === null) {
    c.classList.add('locked');
    c.textContent = '?';
  } else {
    const t = tier(tierId);
    c.style.setProperty('--c', t.color);
    c.title = tierName(tierId);
    const img = document.createElement('img');
    img.src = thumbUrl(tierId);
    img.alt = tierName(tierId);
    img.draggable = false;
    c.append(img);
    const n = el('span', 'num', String(tierId));
    n.style.setProperty('--ring', ERA_RING[t.era]);
    c.append(n);
  }
  return c;
}

export interface HudHandlers {
  onPause(): void;
  onBooster(id: BoosterId): void;
}

export class Hud {
  readonly root: HTMLElement;
  readonly top: HTMLElement;
  readonly bottom: HTMLElement;
  private score = el('div', 'score-value', '0');
  private best = el('div', 'best', 'BEST 0');
  private nextSlot = el('div', 'next-slot');
  private afterSlot = el('div', 'after-slot');
  private evo = el('div', 'evo-track');
  private combo = el('div', 'combo');
  private labels = el('div', 'labels');
  private toast = el('div', 'toast');
  private coins = el('span', 'coin-count', '0');
  private shots = el('div', 'pill stat shots');
  private tickets = el('div', 'tickets');
  private hint = el('div', 'hint');
  private coinPill = el('div', 'pill stat coins');
  private shownCoins = 0;
  private boosterBtns = new Map<BoosterId, HTMLButtonElement>();
  private targetBar = el('div', 'target-bar');
  private flashEl = el('div', 'screen-flash');
  private debugEl = el('div', 'debug');
  private chips: HTMLElement[] = [];
  private unlocked = 0;
  private highest = 0;

  constructor(root: HTMLElement, h: HudHandlers) {
    this.root = root;
    this.top = el('div', 'hud-top');
    const scoreBox = el('div', 'score-box');
    const coin = el('div', 'coin', '★');
    const col = el('div', 'score-col');
    col.append(this.score, this.best);
    scoreBox.append(coin, col);
    const btns = el('div', 'btn-row');
    this.coinPill.append(el('span', 'mini-coin'), this.coins);
    this.coinPill.setAttribute('aria-label', 'Coins');
    btns.append(this.coinPill, this.shots);
    const left = el('div', 'top-left');
    left.append(scoreBox, btns);

    const right = el('div', 'top-right');
    const next = el('div', 'next-card');
    next.append(this.nextSlot, el('div', 'next-label', 'NEXT'), this.afterSlot);
    const pause = el('button', 'pill icon-btn pause-btn');
    pause.innerHTML = ICONS.pause;
    pause.setAttribute('aria-label', 'Pause');
    pause.onclick = () => h.onPause();
    right.append(next, pause);
    this.top.append(left, this.tickets, right);

    this.bottom = el('div', 'hud-bottom');
    const arrow = el('div', 'evo-arrow');
    arrow.append(this.evo);
    this.bottom.append(arrow);
    for (let i = 1; i <= MAX_TIER; i++) {
      const c = chip(null);
      this.chips.push(c);
      this.evo.append(c);
    }

    // Booster buttons sit in the two bottom corners, just above the evolution bar.
    const left2 = el('div', 'boosters left');
    const right2 = el('div', 'boosters right');
    BOOSTERS.forEach((b, i) => {
      const btn = el('button', 'booster');
      btn.innerHTML = `${ICONS[b.id]}<span class="b-price"><span class="mini-coin"></span><span>${b.cost}</span></span>`;
      btn.setAttribute('aria-label', `${b.name}, ${b.cost} coins`);
      btn.title = b.name;
      btn.onclick = () => h.onBooster(b.id);
      this.boosterBtns.set(b.id, btn);
      (i < 2 ? left2 : right2).append(btn);
    });
    this.bottom.prepend(left2);
    this.bottom.append(right2);
    root.append(this.flashEl, this.targetBar, this.top, this.combo, this.labels, this.toast, this.hint, this.bottom, this.debugEl);
  }

  /** Score, with a live countdown to the record you're chasing ("1,240 TO BEAT BEST"). */
  private shownScore = 0;
  private scoreAnim = 0;

  setScore(score: number, best: number, chasing = 0) {
    this.countTo(score);
    const gap = chasing - score;
    if (chasing > 0 && gap > 0) {
      this.best.textContent = `${gap.toLocaleString('en-US')} TO BEAT BEST`;
      this.best.classList.toggle('close', gap <= chasing * 0.15);
      this.best.classList.remove('beaten');
    } else if (chasing > 0) {
      this.best.textContent = 'NEW BEST!';
      this.best.classList.add('beaten');
      this.best.classList.remove('close');
    } else {
      this.best.textContent = `BEST ${best.toLocaleString('en-US')}`;
      this.best.classList.remove('close', 'beaten');
    }
  }

  /** The score counts up to its new value (instantly when it goes down, e.g. a new round). */
  private countTo(score: number) {
    cancelAnimationFrame(this.scoreAnim);
    const from = this.shownScore;
    if (score <= from || score - from < 2) {
      this.shownScore = score;
      this.score.textContent = score.toLocaleString('en-US');
      return;
    }
    const t0 = performance.now();
    const dur = Math.min(700, 280 + (score - from) * 0.4);
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / dur);
      const v = Math.round(from + (score - from) * (1 - Math.pow(1 - u, 3)));
      this.shownScore = v;
      this.score.textContent = v.toLocaleString('en-US');
      if (u < 1) this.scoreAnim = requestAnimationFrame(step);
    };
    this.scoreAnim = requestAnimationFrame(step);
  }

  private plusEl: HTMLElement | null = null;
  private plusSum = 0;
  private plusTimer = 0;

  /**
   * Points scored: the score box glows and pops, and a gold "+N" bursts out
   * beside it (gains in quick succession add up in one label).
   */
  scoreGain(points: number) {
    const box = this.score.closest('.score-box') as HTMLElement | null;
    if (!box || points <= 0) return;
    box.classList.remove('gain');
    void box.offsetWidth;
    box.classList.add('gain');
    box.style.setProperty('--gain', String(Math.min(1, 0.35 + Math.log10(points) / 4)));
    this.plusSum = this.plusEl ? this.plusSum + points : points;
    if (!this.plusEl) {
      this.plusEl = el('div', 'score-plus');
      box.append(this.plusEl);
    }
    const p = this.plusEl;
    p.textContent = `+${this.plusSum.toLocaleString('en-US')}`;
    p.classList.remove('go');
    void p.offsetWidth;
    p.classList.add('go');
    window.clearTimeout(this.plusTimer);
    this.plusTimer = window.setTimeout(() => {
      p.remove();
      if (this.plusEl === p) this.plusEl = null;
    }, 1100);
  }

  private streakEl = el('div', 'streak');

  /** The shot streak badge: hidden below 2, flames grow with the streak. */
  setStreak(n: number) {
    if (!this.streakEl.isConnected) this.coinPill.parentElement?.append(this.streakEl);
    this.streakEl.classList.toggle('on', n >= 2);
    if (n < 2) return;
    this.streakEl.replaceChildren(el('span', 'streak-fire', '🔥'), el('span', 'streak-n', `${n}`), el('span', 'streak-x', `×${Number((1 + Math.min(n, 10) * 0.25).toFixed(2))}`));
    this.streakEl.dataset.hot = String(Math.min(5, Math.floor(n / 2)));
    this.streakEl.classList.remove('up');
    void this.streakEl.offsetWidth;
    this.streakEl.classList.add('up');
  }

  private heatBar = el('div', 'heat-bar');
  private heatFill = el('div', 'heat-fill');

  /** Heat meter under the score: always shows how close the next level is. */
  setHeat(level: number, progress: number) {
    if (!this.heatBar.isConnected) {
      this.heatBar.append(this.heatFill);
      this.score.closest('.score-box')?.append(this.heatBar);
    }
    this.heatBar.dataset.level = String(level);
    this.heatFill.style.width = `${Math.round(progress * 100)}%`;
  }

  /** Level-up banner in the strip above the board. */
  heatUp(level: number, color: string) {
    const names = ['', 'Warming up!', 'On a roll!', 'On fire!', 'Unstoppable!', 'Legendary!'];
    this.praise(5, color, names[level]);
    const sub = this.praiseEl.querySelector('.praise-combo');
    if (sub) sub.textContent = `HEAT LEVEL ${level}`;
    this.glow(color);
    this.heatBar.classList.remove('level-up');
    void this.heatBar.offsetWidth;
    this.heatBar.classList.add('level-up');
  }

  /** Big-moment glow handler: the game flashes the stroke around the board (never a screen overlay). */
  onGlow?: (color: string) => void;

  /** A streak ended: a little "streak lost" note so the player knows why the multiplier went. */
  streakLost(n: number) {
    const r = this.score.getBoundingClientRect();
    this.floatText(r.left + 60, r.bottom + 34, `Streak ${n} lost`, false);
  }

  /** Coin counter: counts up to the new total. */
  setCoins(total: number) {
    const from = this.shownCoins;
    this.shownCoins = total;
    for (const b of BOOSTERS) this.boosterBtns.get(b.id)?.classList.toggle('poor', total < (this.prices[b.id] ?? b.cost));
    if (total <= from) {
      this.coins.textContent = total.toLocaleString('en-US');
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / 700);
      this.coins.textContent = Math.round(from + (total - from) * u).toLocaleString('en-US');
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Shots left in a level (hidden in endless). Turns red when running low. */
  setShots(n: number | null) {
    this.shots.style.display = n === null ? 'none' : '';
    if (n === null) return;
    this.shots.textContent = `SHOTS ${n}`;
    this.shots.classList.toggle('low', n <= 3);
  }

  /** Contract tickets pinned at the top: target building, progress and reward. */
  setContracts(list: Contract[]) {
    const keep = new Map<number, HTMLElement>();
    for (const t of Array.from(this.tickets.children) as HTMLElement[]) keep.set(Number(t.dataset.id), t);
    this.tickets.replaceChildren(
      ...list.map((c) => {
        const t = keep.get(c.id) ?? this.ticket(c);
        const prog = t.querySelector('.t-prog') as HTMLElement;
        prog.textContent = `${Math.min(c.done, c.count)}/${c.count}`;
        t.classList.toggle('done', c.done >= c.count);
        return t;
      }),
    );
  }

  private ticket(c: Contract) {
    const t = el('div', 'ticket');
    t.dataset.id = String(c.id);
    t.title = `Build ${c.count} ${tierName(c.tier)}`;
    t.dataset.tier = String(c.tier);
    const img = document.createElement('img');
    img.src = thumbUrl(c.tier);
    img.alt = tierName(c.tier);
    const reward = el('div', 't-reward');
    reward.append(el('span', 'mini-coin'), el('span', '', String(c.reward)));
    t.append(el('div', 't-tape'), img, el('div', 't-prog'), reward, el('div', 't-stamp', 'DONE'));
    t.classList.add('pop-in');
    return t;
  }

  /** Stamps a ticket DONE and flies coins from it to the coin counter. */
  contractDone(id: number, reward: number) {
    const t = this.tickets.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
    if (!t) return;
    t.classList.add('done', 'shake');
    const from = t.getBoundingClientRect();
    const to = this.coinPill.getBoundingClientRect();
    const n = Math.min(8, 3 + Math.floor(reward / 60));
    for (let i = 0; i < n; i++) {
      const c = el('div', 'fly-coin');
      c.style.left = `${from.left + from.width / 2}px`;
      c.style.top = `${from.top + from.height / 2}px`;
      document.body.append(c);
      const dx = to.left + 12 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const arc = -40 - Math.random() * 40;
      c.animate(
        [
          { transform: 'translate(-50%,-50%) scale(0.6)' },
          { transform: `translate(calc(-50% + ${dx * 0.5 + (Math.random() - 0.5) * 40}px), calc(-50% + ${dy * 0.5 + arc}px)) scale(1.1)`, offset: 0.5 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)` },
        ],
        { duration: 650 + i * 60, easing: 'cubic-bezier(0.4,0,0.6,1)', delay: i * 45 },
      ).onfinish = () => c.remove();
    }
    window.setTimeout(() => {
      this.coinPill.classList.remove('bump');
      void this.coinPill.offsetWidth;
      this.coinPill.classList.add('bump');
    }, 650);
  }

  /** Booster aiming banner ("Tap a building to demolish it") with a cancel button; null hides it. */
  setTargeting(prompt: string | null, onCancel?: () => void) {
    this.targetBar.replaceChildren();
    this.targetBar.classList.toggle('show', prompt !== null);
    this.root.classList.toggle('targeting', prompt !== null);
    if (prompt === null) return;
    const cancel = el('button', 'pill icon-btn');
    cancel.innerHTML = ICONS.close;
    cancel.setAttribute('aria-label', 'Cancel');
    cancel.onclick = () => onCancel?.();
    this.targetBar.append(el('span', '', prompt), cancel);
  }

  private prices: Partial<Record<BoosterId, number>> = {};

  /** Current booster prices (they rise with each use in a round). */
  setBoosterPrices(prices: Record<BoosterId, number>) {
    this.prices = prices;
    for (const b of BOOSTERS) {
      const btn = this.boosterBtns.get(b.id);
      if (!btn) continue;
      const label = btn.querySelector('.b-price span:last-child');
      if (label) label.textContent = prices[b.id] === 0 ? 'Free' : prices[b.id].toLocaleString('en-US');
      btn.classList.toggle('free', prices[b.id] === 0);
      btn.setAttribute('aria-label', prices[b.id] === 0 ? `${b.name}, free` : `${b.name}, ${prices[b.id]} coins`);
      btn.classList.toggle('poor', this.shownCoins < prices[b.id]);
    }
  }

  /** "Not enough coins" nudge on a booster button. */
  boosterDenied(id: BoosterId) {
    const b = this.boosterBtns.get(id);
    if (!b) return;
    b.classList.remove('denied');
    void b.offsetWidth;
    b.classList.add('denied');
  }

  private offerEl: HTMLElement | null = null;

  private celebEl: HTMLElement | null = null;

  /**
   * Level cleared, part 1: the screen dims and the theme's shout slams in
   * ("Sugar Rush!"), like Candy Crush's "Sugar Crush!".
   */
  celebrate(shout: string, accent: string) {
    this.clearCelebration();
    const c = el('div', 'celeb');
    c.style.setProperty('--accent', accent);
    const words = el('div', 'celeb-shout');
    shout.split(' ').forEach((w, i) => {
      const s = el('span', '', w);
      s.style.animationDelay = `${i * 0.12}s`;
      words.append(s);
    });
    c.append(el('div', 'celeb-dim'), words, el('div', 'celeb-bonus'));
    this.root.append(c);
    this.celebEl = c;
    requestAnimationFrame(() => c.classList.add('in'));
  }

  /** Part 2: leftover shots turn into fireworks; the counter shows the bonus so far. */
  celebrateBonus(rockets: number, coins: number) {
    const b = this.celebEl?.querySelector('.celeb-bonus');
    if (!b) return;
    this.celebEl!.classList.add('bonus');
    b.innerHTML = `<div class="cb-title">Overtime bonus</div><div class="cb-count">${rockets} × 🎆 · <span class="mini-coin"></span> +${coins}</div>`;
    b.classList.remove('tick');
    void (b as HTMLElement).offsetWidth;
    b.classList.add('tick');
  }

  /** Part 3: the builder jumps up cheering, confetti rains and the big words land. */
  celebrateFinale(word: string, accent: string, confetti: string[]) {
    const c = this.celebEl;
    if (!c) return;
    c.classList.add('finale');
    const m = el('div', 'celeb-mascot');
    const img = el('img') as HTMLImageElement;
    img.src = `${import.meta.env.BASE_URL}logo.webp`;
    img.alt = '';
    m.append(img);
    for (let i = 0; i < 8; i++) {
      const s = el('i');
      s.style.setProperty('--a', `${i * 45}deg`);
      m.append(s);
    }
    const words = el('div', 'celeb-final');
    words.append(el('div', 'cf-word', word), el('div', 'cf-sub', 'Level complete!'));
    words.style.setProperty('--accent', accent);
    c.append(words, m);
    const layer = el('div', 'confetti');
    for (let i = 0; i < 110; i++) {
      const p = el('i');
      p.style.setProperty('--x', `${Math.random() * 100}%`);
      p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
      p.style.setProperty('--r', `${(Math.random() - 0.5) * 1440}deg`);
      p.style.setProperty('--d', `${1.8 + Math.random() * 1.6}s`);
      p.style.setProperty('--delay', `${Math.random() * 0.9}s`);
      p.style.setProperty('--w', `${6 + Math.random() * 8}px`);
      p.style.background = confetti[i % confetti.length];
      if (i % 4 === 0) p.style.borderRadius = '50%';
      layer.append(p);
    }
    c.append(layer);
  }

  clearCelebration() {
    this.celebEl?.remove();
    this.celebEl = null;
  }

  /** "Free with an ad?" card when a booster is too expensive. Hides itself after a few seconds. */
  offerAdBooster(name: string, icon: string, onWatch: () => void) {
    this.offerEl?.remove();
    const card = el('div', 'ad-offer');
    const ic = el('div', 'ao-icon');
    ic.innerHTML = icon;
    const text = el('div', 'ao-text');
    text.append(el('div', 'ao-title', `Free ${name}?`), el('div', 'ao-sub', 'Watch a short ad'));
    const watch = el('button', 'btn small green ao-watch');
    watch.innerHTML = `${ICONS.ad}<span>Watch</span>`;
    const close = el('button', 'ao-close');
    close.innerHTML = ICONS.close;
    close.setAttribute('aria-label', 'No thanks');
    const done = () => {
      card.classList.add('out');
      window.setTimeout(() => card.remove(), 250);
      if (this.offerEl === card) this.offerEl = null;
    };
    watch.onclick = () => {
      done();
      onWatch();
    };
    close.onclick = done;
    card.append(ic, text, watch, close);
    this.root.append(card);
    this.offerEl = card;
    window.setTimeout(done, 8000);
  }

  /** One-line tip at the start of a level. */
  showHint(text: string) {
    this.hint.textContent = text;
    this.hint.classList.remove('show');
    void this.hint.offsetWidth;
    this.hint.classList.add('show');
  }

  /** White flash for big moments (tier 13+, Wonders). */
  flash() {
    this.flashEl.classList.remove('go');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('go');
  }

  setDebug(text: string | null) {
    this.debugEl.textContent = text ?? '';
    this.debugEl.style.display = text ? 'block' : 'none';
  }

  /** "New Building!" card: the piece spins on a pedestal, then flies into its evolution-bar slot. */
  showNewBuilding(tierId: number) {
    this.showToast('New Building!', tierName(tierId), tierId);
    const card = this.toast.querySelector('.chip') as HTMLElement | null;
    card?.classList.add('spin');
    window.setTimeout(() => {
      const target = this.chips[tierId - 1];
      if (!card || !target) return;
      const from = card.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const fly = chip(tierId, 'lg');
      fly.classList.add('flyer');
      fly.style.left = `${from.left}px`;
      fly.style.top = `${from.top}px`;
      document.body.append(fly);
      card.style.visibility = 'hidden';
      requestAnimationFrame(() => {
        const s = to.width / from.width;
        fly.style.transform = `translate(${to.left - from.left + (to.width - from.width) / 2}px, ${to.top - from.top + (to.height - from.height) / 2}px) scale(${s})`;
      });
      window.setTimeout(() => {
        fly.remove();
        target.classList.remove('landed');
        void target.offsetWidth;
        target.classList.add('landed');
      }, 560);
    }, 1300);
  }

  /** Little bounce on the score counter when points land. */
  bumpScore() {
    const box = this.score.closest('.score-box') as HTMLElement | null;
    if (!box) return;
    box.classList.remove('bump');
    void box.offsetWidth;
    box.classList.add('bump');
  }

  /** NEXT, plus a smaller chip for the piece after it (three pieces visible in all). */
  private lastNext: [number | null, number | null] = [null, null];

  setNext(tierId: number | null, after: number | null = null) {
    this.lastNext = [tierId, after];
    this.nextSlot.replaceChildren();
    this.afterSlot.replaceChildren();
    if (tierId !== null) {
      const c = chip(tierId, 'lg');
      c.classList.add('pop-in');
      this.nextSlot.append(c);
    }
    if (after !== null) {
      const c = chip(after, 'sm');
      c.classList.add('pop-in');
      this.afterSlot.append(el('span', 'after-label', 'THEN'), c);
    }
  }

  /** Evolution bar: tiers reached ever are shown; the highest this run pulses. */
  setProgress(unlocked: number, highestThisRun: number) {
    if (unlocked !== this.unlocked) {
      this.unlocked = unlocked;
      this.chips.forEach((c, i) => {
        const fresh = chip(i + 1 <= unlocked ? i + 1 : null);
        c.replaceWith(fresh);
        this.chips[i] = fresh;
      });
      this.highest = -1;
    }
    if (highestThisRun !== this.highest) {
      this.highest = highestThisRun;
      this.chips.forEach((c, i) => c.classList.toggle('current', i + 1 === highestThisRun));
    }
  }

  private praiseEl = el('div', 'praise');

  /** Swaps every building picture (NEXT, THEN, contract tickets, evolution bar) to the current theme. */
  retheme() {
    this.setNext(...this.lastNext);
    for (const t of Array.from(this.tickets.children) as HTMLElement[]) {
      const id = Number(t.dataset.tier);
      const img = t.querySelector('img');
      if (img && id) {
        img.src = thumbUrl(id);
        img.alt = tierName(id);
      }
    }
    const unlocked = this.unlocked;
    const highest = this.highest;
    this.unlocked = -1;
    this.setProgress(unlocked, highest);
  }

  /**
   * A new map theme arrives: its name bursts in over the top of the board and
   * confetti in the theme's colours rains across the whole screen.
   */
  themeArrival(t: Theme, calm = false) {
    const banner = el('div', 'theme-banner');
    banner.style.setProperty('--accent', t.accent);
    banner.append(el('div', 'tb-kicker', 'Welcome to'), el('div', 'tb-name', t.name), el('div', 'tb-tag', t.tagline));
    this.root.append(banner);
    window.setTimeout(() => banner.remove(), 2600);
    const n = calm ? 0 : 90;
    const layer = el('div', 'confetti');
    for (let i = 0; i < n; i++) {
      const p = el('i');
      p.style.setProperty('--x', `${Math.random() * 100}%`);
      p.style.setProperty('--dx', `${(Math.random() - 0.5) * 140}px`);
      p.style.setProperty('--r', `${(Math.random() - 0.5) * 1440}deg`);
      p.style.setProperty('--d', `${1.6 + Math.random() * 1.4}s`);
      p.style.setProperty('--delay', `${Math.random() * 0.5}s`);
      p.style.setProperty('--w', `${6 + Math.random() * 8}px`);
      p.style.background = t.confetti[i % t.confetti.length];
      if (i % 4 === 0) p.style.borderRadius = '50%';
      layer.append(p);
    }
    if (n) this.root.append(layer);
    window.setTimeout(() => layer.remove(), 3600);
  }

  /**
   * Praise word for a combo: it grows and changes colour as the chain gets
   * longer, punches in with an elastic bounce and floats away.
   */
  praise(combo: number, color: string, special?: string) {
    if (!this.praiseEl.isConnected) this.root.append(this.praiseEl);
    const words = ['', '', 'Nice!', 'Great!', 'Awesome!', 'Amazing!', 'Incredible!', 'Unbelievable!'];
    const word = special ?? words[Math.min(combo, words.length - 1)];
    this.praiseEl.replaceChildren(el('div', 'praise-word', word), el('div', 'praise-combo', special ? '' : `COMBO ×${combo}`));
    // Special shout-outs ("Chain reaction!") are longer words: fixed gold, sized to fit.
    this.praiseEl.style.setProperty('--s', String(special ? 0.95 : 0.85 + Math.min(combo, 8) * 0.1));
    if (special) combo = 4;
    this.praiseEl.style.setProperty('--tint', color);
    this.praiseEl.dataset.level = String(Math.min(combo, 7));
    this.praiseEl.classList.remove('go');
    void this.praiseEl.offsetWidth;
    this.praiseEl.classList.add('go');
  }

  /** A coloured flash around the board edges on big combos. */
  glow(color: string) {
    this.onGlow?.(color);
  }

  floatText(x: number, y: number, text: string, big = false, combo = 1) {
    const l = el('div', big ? 'float big' : 'float', text);
    if (combo >= 2) l.style.fontSize = `${22 + Math.min(combo, 7) * 4}px`;
    if (combo >= 4) l.classList.add('rainbow');
    l.style.left = `${x}px`;
    l.style.top = `${y}px`;
    this.labels.append(l);
    setTimeout(() => l.remove(), 900);
  }

  showToast(title: string, sub: string, tierId: number | null) {
    this.toast.replaceChildren();
    const card = el('div', 'toast-card');
    if (tierId !== null) card.append(chip(tierId, 'lg'));
    card.append(el('div', 'toast-title', title), el('div', 'toast-sub', sub));
    this.toast.append(card);
    this.toast.classList.remove('show');
    void this.toast.offsetWidth;
    this.toast.classList.add('show');
  }

  setDanger(on: boolean) {
    this.root.classList.toggle('danger', on);
  }
}
