import type { AimMode } from '../core/config';
import { MAX_TIER, tier } from '../core/tiers';
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
  }
  return c;
}

export interface HudHandlers {
  onRestart(): void;
  onToggleMode(): void;
  onToggleSound(): void;
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
  private overlay = el('div', 'overlay hidden');
  private toast = el('div', 'toast');
  private modeBtn = el('button', 'pill', 'Aim: Slide');
  private soundBtn = el('button', 'pill icon-btn');
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
    const restart = el('button', 'pill');
    restart.innerHTML = `${ICONS.restart}<span>Restart</span>`;
    restart.onclick = () => h.onRestart();
    this.modeBtn.onclick = () => h.onToggleMode();
    this.soundBtn.onclick = () => h.onToggleSound();
    btns.append(restart, this.modeBtn, this.soundBtn);
    const left = el('div', 'top-left');
    left.append(scoreBox, btns);

    const next = el('div', 'next-card');
    next.append(this.nextSlot, el('div', 'next-label', 'NEXT'));
    this.top.append(left, next);

    this.bottom = el('div', 'hud-bottom');
    const arrow = el('div', 'evo-arrow');
    arrow.append(this.evo);
    this.bottom.append(arrow);
    for (let i = 1; i <= MAX_TIER; i++) {
      const c = chip(null);
      this.chips.push(c);
      this.evo.append(c);
    }

    root.append(this.flashEl, this.top, this.combo, this.labels, this.toast, this.bottom, this.overlay, this.debugEl);
  }

  setScore(score: number, best: number) {
    this.score.textContent = score.toLocaleString('en-US');
    this.best.textContent = `BEST ${best.toLocaleString('en-US')}`;
  }

  setSound(on: boolean) {
    this.soundBtn.innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
    this.soundBtn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    this.soundBtn.classList.toggle('off', !on);
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

  setMode(m: AimMode) {
    this.modeBtn.textContent = m === 'slide' ? 'Aim: Slide' : 'Aim: Sling';
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

  showCombo(n: number) {
    if (n < 2) return;
    this.combo.textContent = `APPROVED ×${n}`;
    this.combo.style.setProperty('--s', String(1 + Math.min(n, 8) * 0.08));
    this.combo.classList.remove('stamp');
    void this.combo.offsetWidth;
    this.combo.classList.add('stamp');
  }

  floatText(x: number, y: number, text: string, big = false) {
    const l = el('div', big ? 'float big' : 'float', text);
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

  showGameOver(score: number, best: number, highest: number, onRestart: () => void) {
    this.overlay.replaceChildren();
    const card = el('div', 'over-card');
    card.append(
      el('div', 'over-title', 'Site Overflow!'),
      el('div', 'over-sub', 'The pile crossed the site boundary'),
      el('div', 'over-score', score.toLocaleString('en-US')),
      el('div', 'over-best', score >= best && score > 0 ? 'NEW BEST!' : `Best ${best.toLocaleString('en-US')}`),
    );
    if (highest > 0) {
      const row = el('div', 'over-tier');
      row.append(chip(highest, 'lg'), el('div', '', `Top build: ${tier(highest).name}`));
      card.append(row);
    }
    const btn = el('button', 'big-btn', 'Build Again');
    btn.onclick = () => {
      this.overlay.classList.add('hidden');
      onRestart();
    };
    card.append(btn);
    this.overlay.append(card);
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }
}

