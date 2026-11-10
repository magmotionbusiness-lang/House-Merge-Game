import { DISTRICT_GATES, districtOpen, levelOpen, totalStars, type District, type LevelDef } from '../core/levels';
import { THEMES, themeForDistrict, tierName, type ThemeId } from '../core/themes';
import { tier } from '../core/tiers';
import { thumbUrl } from './hud';
import { ICONS } from './icons';

/**
 * The campaign map, Candy Crush style: a winding road climbs through the five
 * themed districts (painted scenery changes as you scroll), past glossy level
 * buttons with their stars, the district's own 3D buildings growing along the
 * way, and star gates between districts. The builder marks where you are and
 * hops forward after each win. Tapping a level drops its card in.
 */

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const STEP = 96; // vertical distance between levels
const HEAD_H = 190; // district sign at the bottom of each district
const GATE_H = 250; // star gate at the top of each district (but the last)
const CLOUD_H = 430; // cloud bank hiding everything past the last open district
const TOP_PAD = 96;
const BOTTOM_PAD = 70;

/** The road's colours per theme: edge, surface and the dotted centre line. */
const ROAD: Record<ThemeId, [string, string, string]> = {
  site: ['#7a5634', '#f1d9a8', '#ffffff'],
  beach: ['#b98a55', '#fbe7bd', '#38c9e6'],
  alpine: ['#6d8aa8', '#ffffff', '#8fd0ff'],
  sweet: ['#d4698f', '#ffe0ee', '#ff5e8a'],
  neon: ['#3df5ff', '#20264a', '#ff3df2'],
};

export interface MapOptions {
  districts: District[];
  stars: Record<string, number>;
  onPlay(level: LevelDef, district: District): void;
  onBack(): void;
  tap(): void;
  /** Just beaten: the builder hops from this level to the next one. */
  hopFrom?: string;
  /** Open the current level's card once the map settles. */
  autoOpen?: boolean;
}

interface Node {
  level: LevelDef;
  district: District;
  di: number;
  li: number;
  x: number;
  y: number;
  btn: HTMLElement;
}

/** Smooth road through points (Catmull-Rom as cubic Béziers). */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

export class CampaignMap {
  readonly root = el('div', 'cmap');
  private bg = el('div', 'cmap-bg');
  private scroll = el('div', 'cmap-scroll');
  private world = el('div', 'cmap-world');
  private layers: HTMLElement[] = [];
  private nodes: Node[] = [];
  private current: Node | null = null;
  private avatar = el('div', 'cmap-avatar');
  private blocks: { top: number; bottom: number }[] = [];
  private active = -1;
  private card: HTMLElement | null = null;
  private visible: District[] = [];

  constructor(private o: MapOptions) {
    const top = el('div', 'cmap-top');
    const back = el('button', 'btn back-btn');
    back.innerHTML = `${ICONS.back}<span>Back</span>`;
    back.setAttribute('aria-label', 'Back to the title screen');
    back.onclick = () => {
      o.tap();
      o.onBack();
    };
    const total = el('div', 'cmap-total');
    total.innerHTML = `<span class="cmap-star">★</span><b>${totalStars(o.stars)}</b>`;
    top.append(back, el('div', 'cmap-title', 'Campaign'), total);
    // Only open districts exist on the map: what's next stays hidden in the clouds.
    this.visible = o.districts.filter((_, i) => districtOpen(o.districts, i, o.stars));
    this.visible.forEach((d) => {
      const layer = el('div', 'cmap-layer');
      const art = THEMES[themeForDistrict(d.id)].art;
      if (art) layer.style.backgroundImage = `url('${import.meta.env.BASE_URL}${art}')`;
      this.bg.append(layer);
      this.layers.push(layer);
    });
    this.scroll.append(this.world);
    this.root.append(this.bg, this.scroll, top);
    this.scroll.addEventListener('scroll', () => this.onScroll(), { passive: true });
  }

  /** Builds the map once the container has its size (call right after it is on screen). */
  layout() {
    const W = this.scroll.clientWidth || 390;
    const { stars } = this.o;
    const all = this.o.districts;
    const districts = this.visible;
    const heights = districts.map((d, i) => HEAD_H + d.levels.length * STEP + (i < districts.length - 1 ? GATE_H : CLOUD_H));
    const H = TOP_PAD + BOTTOM_PAD + heights.reduce((a, b) => a + b, 0);
    this.world.style.height = `${H}px`;
    let bottom = H - BOTTOM_PAD;
    const A = Math.min(W * 0.27, 120);
    districts.forEach((d, di) => {
      const theme = themeForDistrict(d.id);
      const t = THEMES[theme];
      const top = bottom - heights[di];
      this.blocks.push({ top, bottom });
      const open = true;
      const xs = (i: number) => W / 2 + A * Math.sin(i * 0.62 + di * 1.7);
      const ys = (i: number) => bottom - HEAD_H - i * STEP - STEP / 2;
      // Road: from the district sign up through every level to the gate.
      const pts: [number, number][] = [[W / 2, bottom - 40], [xs(0), ys(0) + STEP * 0.6]];
      d.levels.forEach((_, i) => pts.push([xs(i), ys(i)]));
      const lastY = ys(d.levels.length - 1);
      pts.push([W / 2, Math.max(top + 30, lastY - STEP * 0.8)]);
      const [edge, surf, dots] = ROAD[theme];
      const svg = svgEl('svg', { class: 'cmap-road', width: W, height: heights[di], viewBox: `0 ${top} ${W} ${heights[di]}` }) as SVGSVGElement;
      (svg as unknown as HTMLElement).style.top = `${top}px`;
      const path = smoothPath(pts);
      svg.append(
        svgEl('path', { d: path, fill: 'none', stroke: 'rgba(30,20,10,0.28)', 'stroke-width': 40, 'stroke-linecap': 'round', transform: 'translate(0,6)' }),
        svgEl('path', { d: path, fill: 'none', stroke: edge, 'stroke-width': 38, 'stroke-linecap': 'round' }),
        svgEl('path', { d: path, fill: 'none', stroke: surf, 'stroke-width': 28, 'stroke-linecap': 'round' }),
        svgEl('path', { d: path, fill: 'none', stroke: dots, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': '0.1 17', opacity: 0.9 }),
      );
      // The beaten part of the road shines gold.
      const doneCount = d.levels.findIndex((l) => !(stars[l.id] > 0));
      const done = doneCount < 0 ? d.levels.length : doneCount;
      if (open && done > 0) {
        const dpts = pts.slice(0, Math.min(pts.length, done + 2));
        svg.append(svgEl('path', { d: smoothPath(dpts), fill: 'none', stroke: '#ffd84d', 'stroke-width': 9, 'stroke-linecap': 'round', class: 'cmap-done', opacity: 0.95 }));
      }
      this.world.append(svg as unknown as HTMLElement);

      // The district's own buildings grow along the road, on the open side of each bend.
      for (let k = 0; k < 16; k++) {
        const i = 1 + k * 2;
        if (i >= d.levels.length) break;
        const tierId = Math.min(18, 2 + k);
        const side = xs(i) > W / 2 ? -1 : 1;
        const size = 62 + tierId * 3.4;
        const px = W / 2 + side * (A * 0.45 + W * 0.2) + Math.sin(k * 2.3) * 8;
        const prop = el('div', 'cmap-prop');
        prop.style.left = `${px - size / 2}px`;
        prop.style.top = `${ys(i) - size * 0.82}px`;
        prop.style.width = `${size}px`;
        prop.style.height = `${size}px`;
        const img = el('img') as HTMLImageElement;
        img.src = thumbUrl(tierId, theme);
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        prop.append(el('div', 'cmap-shadow'), img);
        if (!open) prop.classList.add('dim');
        this.world.append(prop);
      }

      // District sign at the start of the district.
      const sign = el('div', 'cmap-sign');
      sign.style.top = `${bottom - HEAD_H + 30}px`;
      sign.style.setProperty('--accent', t.accent);
      const got = d.levels.reduce((a, l) => a + (stars[l.id] ?? 0), 0);
      sign.append(el('div', 'cs-kicker', `District ${d.id}`), el('div', 'cs-name', t.name), el('div', 'cs-stars', `★ ${got} / ${d.levels.length * 3}`));
      this.world.append(sign);

      // Levels.
      d.levels.forEach((l, li) => {
        const s = stars[l.id] ?? 0;
        const playable = levelOpen(all, di, li, stars);
        const big = (li + 1) % 11 === 0;
        const b = el('button', `cmap-lv ${s > 0 ? 'done' : playable ? 'open' : 'locked'} ${big ? 'big' : ''}`);
        b.style.left = `${xs(li)}px`;
        b.style.top = `${ys(li)}px`;
        b.style.setProperty('--accent', t.accent);
        b.setAttribute('aria-label', `Level ${li + 1}${playable ? '' : ', locked'}`);
        if (big) {
          const landmark = el('img', 'cmap-landmark') as HTMLImageElement;
          landmark.src = thumbUrl(l.contracts[0].tier, theme);
          landmark.alt = '';
          b.append(landmark);
        }
        b.append(el('span', 'cmap-num', String(li + 1)));
        if (s > 0) {
          const st = el('div', 'cmap-stars');
          for (let k = 0; k < 3; k++) st.append(el('span', k < s ? 'on' : '', '★'));
          b.append(st);
        }
        if (!playable) b.append(el('span', 'cmap-lock'));
        const node: Node = { level: l, district: d, di, li, x: xs(li), y: ys(li), btn: b };
        b.onclick = () => {
          this.o.tap();
          if (playable) this.openCard(node);
          else this.nudge(b);
        };
        this.nodes.push(node);
        if (playable && s === 0 && !this.current) this.current = node;
        this.world.append(b);
      });

      // Star gate to the next district.
      if (di < districts.length - 1) {
        const next = districts[di + 1];
        const nt = THEMES[themeForDistrict(next.id)];
        const nextOpen = districtOpen(all, di + 1, stars);
        const gate = el('div', `cmap-gate ${nextOpen ? 'open' : ''}`);
        gate.style.top = `${top + 40}px`;
        gate.style.setProperty('--accent', nt.accent);
        const need = DISTRICT_GATES[di + 1] ?? 0;
        const have = totalStars(stars);
        const lastDone = (stars[d.levels[d.levels.length - 1].id] ?? 0) > 0;
        gate.append(el('div', 'cg-lock', nextOpen ? '✓' : ''), el('div', 'cg-name', nt.name), el('div', 'cg-tag', nt.tagline));
        if (!nextOpen) {
          const bar = el('div', 'cg-bar');
          const fill = el('div', 'cg-fill');
          fill.style.width = `${Math.min(100, (have / Math.max(1, need)) * 100)}%`;
          bar.append(fill, el('span', '', `★ ${Math.min(have, need)} / ${need}`));
          gate.append(bar, el('div', 'cg-note', lastDone ? `Collect ${need - have} more stars to open` : `Finish level ${d.levels.length} and collect ${need} stars`));
        } else gate.append(el('div', 'cg-note', 'Open!'));
        this.world.append(gate);
      }
      bottom = top;
    });

    this.clouds(W, bottom);

    // The builder marks the current level.
    this.world.append(this.avatar);
    const img = el('img') as HTMLImageElement;
    img.src = `${import.meta.env.BASE_URL}logo.webp`;
    img.alt = 'You are here';
    this.avatar.append(img);
    const hop = this.o.hopFrom ? this.nodes.find((n) => n.level.id === this.o.hopFrom) : null;
    const target = this.current ?? this.nodes[this.nodes.length - 1];
    this.placeAvatar(hop ?? target);
    this.current?.btn.classList.add('current');
    this.scroll.scrollTop = Math.max(0, (hop ?? target).y - this.scroll.clientHeight * 0.58);
    this.onScroll();
    if (hop && this.current && hop !== this.current) window.setTimeout(() => this.hop(hop, this.current!), 450);
    else if (this.o.autoOpen && this.current) window.setTimeout(() => this.openCard(this.current!), 350);
  }

  /**
   * A thick bank of drifting clouds over the top of the map. Whatever comes
   * after the last open district stays hidden: no names, no buildings, only
   * what it takes to clear the clouds.
   */
  private clouds(W: number, top: number) {
    const { stars } = this.o;
    const all = this.o.districts;
    const next = this.visible.length;
    const bank = el('div', 'cmap-clouds');
    bank.style.top = `${top - 40}px`;
    bank.style.height = `${CLOUD_H + 80}px`;
    // Puffs in three rows; the lower edge is ragged so the road vanishes into them.
    for (let i = 0; i < 22; i++) {
      const row = i % 3;
      const size = 170 + ((i * 53) % 130) - row * 20;
      const puff = el('i');
      puff.style.width = puff.style.height = `${size}px`;
      puff.style.left = `${((i * 37) % 100) / 100 * (W + 120) - 60 - size / 2}px`;
      puff.style.top = `${CLOUD_H - 60 - row * 90 - ((i * 29) % 60) - size / 2}px`;
      puff.style.animationDuration = `${9 + (i % 5) * 2}s`;
      puff.style.animationDelay = `${-(i % 7)}s`;
      bank.append(puff);
    }
    const card = el('div', 'cmap-mystery');
    if (next < all.length) {
      const last = this.visible[next - 1];
      const lastId = last.levels[last.levels.length - 1].id;
      const need = DISTRICT_GATES[next] ?? 0;
      const have = totalStars(stars);
      const lastDone = (stars[lastId] ?? 0) > 0;
      card.append(el('div', 'cm-q', '?'), el('div', 'cm-title', 'A new district'), el('div', 'cm-sub', 'is hiding in the clouds'));
      const bar = el('div', 'cg-bar');
      const fill = el('div', 'cg-fill');
      fill.style.width = `${Math.min(100, (have / Math.max(1, need)) * 100)}%`;
      bar.append(fill, el('span', '', `★ ${Math.min(have, need)} / ${need}`));
      const todo: string[] = [];
      if (!lastDone) todo.push(`beat level ${last.levels.length}`);
      if (have < need) todo.push(`collect ${need - have} more ★`);
      card.append(bar, el('div', 'cg-note', `To clear the clouds: ${todo.join(' and ')}`));
    } else {
      card.append(el('div', 'cm-q', '🏗'), el('div', 'cm-title', 'More districts'), el('div', 'cm-sub', 'are under construction. Stay tuned!'));
    }
    bank.append(card);
    this.world.append(bank);
  }

  private placeAvatar(n: Node) {
    this.avatar.style.left = `${n.x}px`;
    this.avatar.style.top = `${n.y}px`;
  }

  /** The builder hops along the road from one level to the next, which pops open. */
  private hop(from: Node, to: Node) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const a = this.avatar.animate(
      [
        { transform: 'translate(-50%, -100%) translate(0, 0) scale(1)' },
        { transform: `translate(-50%, -100%) translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(1.15)`, offset: 0.5 },
        { transform: `translate(-50%, -100%) translate(${dx}px, ${dy}px) scale(1)` },
      ],
      { duration: 650, easing: 'cubic-bezier(0.3, 0.1, 0.4, 1)' },
    );
    this.scroll.scrollTo({ top: Math.max(0, to.y - this.scroll.clientHeight * 0.58), behavior: 'smooth' });
    a.onfinish = () => {
      this.placeAvatar(to);
      to.btn.classList.add('unlock');
      this.burst(to);
      if (this.o.autoOpen) window.setTimeout(() => this.openCard(to), 450);
    };
  }

  private burst(n: Node) {
    const b = el('div', 'cmap-burst');
    b.style.left = `${n.x}px`;
    b.style.top = `${n.y}px`;
    for (let i = 0; i < 12; i++) {
      const s = el('i');
      s.style.setProperty('--a', `${(i / 12) * 360}deg`);
      b.append(s);
    }
    this.world.append(b);
    window.setTimeout(() => b.remove(), 900);
  }

  private nudge(b: HTMLElement) {
    b.classList.remove('nope');
    void b.offsetWidth;
    b.classList.add('nope');
  }

  private onScroll() {
    const mid = this.scroll.scrollTop + this.scroll.clientHeight / 2;
    let idx = 0;
    this.blocks.forEach((b, i) => {
      if (mid >= b.top && mid <= b.bottom) idx = i;
    });
    if (idx === this.active) return;
    this.active = idx;
    this.layers.forEach((l, i) => l.classList.toggle('on', i === idx));
  }

  /** The level card drops in on two ribbons: goal, best stars, shots and a big Play button. */
  private openCard(n: Node) {
    this.card?.remove();
    const t = THEMES[themeForDistrict(n.district.id)];
    const theme = t.id;
    const wrap = el('div', 'lvcard-wrap');
    const card = el('div', 'lvcard');
    card.style.setProperty('--accent', t.accent);
    const close = el('button', 'lvcard-x');
    close.innerHTML = ICONS.close;
    close.setAttribute('aria-label', 'Close');
    const best = this.o.stars[n.level.id] ?? 0;
    const st = el('div', 'lvcard-stars');
    for (let k = 0; k < 3; k++) st.append(el('span', k < best ? 'on' : '', '★'));
    const goal = el('div', 'lvcard-goal');
    goal.append(el('div', 'lvg-title', 'Build'));
    const row = el('div', 'lvg-row');
    for (const c of n.level.contracts) {
      const g = el('div', 'lvg-item');
      g.style.setProperty('--c', tier(c.tier).color);
      const img = el('img') as HTMLImageElement;
      img.src = thumbUrl(c.tier, theme);
      img.alt = '';
      g.append(img, el('span', 'lvg-count', `×${c.count}`), el('span', 'lvg-name', tierName(c.tier, theme)));
      row.append(g);
    }
    goal.append(row);
    const shots = el('div', 'lvcard-shots', n.level.shots === null ? 'Unlimited shots' : `${n.level.shots} shots`);
    const play = el('button', 'btn big green hero lvcard-play');
    play.innerHTML = `${ICONS.play}<span>Play!</span>`;
    play.onclick = () => {
      this.o.tap();
      this.o.onPlay(n.level, n.district);
    };
    const done = () => {
      wrap.classList.add('out');
      window.setTimeout(() => wrap.remove(), 260);
      if (this.card === wrap) this.card = null;
    };
    close.onclick = () => {
      this.o.tap();
      done();
    };
    wrap.onclick = (e) => {
      if (e.target === wrap) done();
    };
    card.append(
      el('div', 'lvcard-rope l'),
      el('div', 'lvcard-rope r'),
      close,
      el('div', 'lvcard-kicker', `${t.name}`),
      el('div', 'lvcard-title', `Level ${n.li + 1}`),
      el('div', 'lvcard-name', n.level.name),
      st,
      goal,
      shots,
      play,
    );
    wrap.append(card);
    this.root.append(wrap);
    this.card = wrap;
  }
}
