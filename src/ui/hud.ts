import type { Contract } from '../core/contracts';
import { BOOSTERS, type BoosterId } from '../core/boosters';
import { ERA_RING, MAX_TIER, tier } from '../core/tiers';
import { ICONS } from './icons';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Baked 3D thumbnail for a tier (see `npm run models:bake`). */
export const thumbUrl = (tierId: number) => `${import.meta.env.BASE_URL}thumbs/tier-${String(tierId).padStart(2, '0')}.png`;

function chip(tierId: number | null, size: 'sm' | 'lg' = 'sm') {
  const c = el('div', `chip chip-${size}`);
  if (tierId === null) {
    c.classList.add('locked');
    c.textContent = '?';
  } else {
    const t = tier(tierId);
    c.style.setProperty('--c', t.color);
    c.title = t.name;
    const img = document.createElement('img');
    img.src = thumbUrl(tierId);
    img.alt = t.name;
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
    next.append(this.nextSlot, el('div', 'next-label', 'NEXT'));
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

  setScore(score: number, best: number) {
    this.score.textContent = score.toLocaleString('en-US');
    this.best.textContent = `BEST ${best.toLocaleString('en-US')}`;
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
    t.title = `Build ${c.count} ${tier(c.tier).name}`;
    const img = document.createElement('img');
    img.src = thumbUrl(c.tier);
    img.alt = tier(c.tier).name;
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
      if (label) label.textContent = prices[b.id].toLocaleString('en-US');
      btn.setAttribute('aria-label', `${b.name}, ${prices[b.id]} coins`);
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
    this.showToast('New Building!', tier(tierId).name, tierId);
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

  /** Blank the NEXT card briefly, then show the upcoming piece. */
  setNext(tierId: number | null) {
    this.nextSlot.replaceChildren();
    if (tierId !== null) {
      const c = chip(tierId, 'lg');
      c.classList.add('pop-in');
      this.nextSlot.append(c);
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
  private glowEl = el('div', 'combo-glow');

  /**
   * Praise word for a combo: it grows and changes colour as the chain gets
   * longer, punches in with an elastic bounce and floats away.
   */
  praise(combo: number, color: string) {
    if (!this.praiseEl.isConnected) this.root.append(this.glowEl, this.praiseEl);
    const words = ['', '', 'Nice!', 'Great!', 'Awesome!', 'Amazing!', 'Incredible!', 'Unbelievable!'];
    const word = words[Math.min(combo, words.length - 1)];
    this.praiseEl.replaceChildren(el('div', 'praise-word', word), el('div', 'praise-combo', `COMBO ×${combo}`));
    this.praiseEl.style.setProperty('--s', String(0.85 + Math.min(combo, 8) * 0.1));
    this.praiseEl.style.setProperty('--tint', color);
    this.praiseEl.dataset.level = String(Math.min(combo, 7));
    this.praiseEl.classList.remove('go');
    void this.praiseEl.offsetWidth;
    this.praiseEl.classList.add('go');
  }

  /** A coloured glow pulsing in from the screen edges on big combos. */
  glow(color: string) {
    if (!this.glowEl.isConnected) this.root.append(this.glowEl, this.praiseEl);
    this.glowEl.style.setProperty('--tint', color);
    this.glowEl.classList.remove('go');
    void this.glowEl.offsetWidth;
    this.glowEl.classList.add('go');
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
