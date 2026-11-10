import { store } from '../game/storage';

/**
 * Consent stub. The native build runs Google's UMP flow (shown to EU/UK
 * players as the law requires); the web build shows this simple choice once,
 * before the first ad, and it can be changed in Settings.
 */
export type Consent = 'personalized' | 'limited';

const KEY = 'bm.consent';

export function consentGiven(): Consent | null {
  const v = store.str(KEY, '');
  return v === 'personalized' || v === 'limited' ? v : null;
}

export function askConsent(review = false): Promise<Consent> {
  return new Promise((resolve) => {
    const layer = document.createElement('div');
    layer.className = 'ad-layer consent';
    const card = document.createElement('div');
    card.className = 'panel consent-card';
    card.innerHTML = `
      <h2>Ads keep it free</h2>
      <p class="note">Blueprint Merge is free to play. Ads are always optional, except a short one between rounds now and then (never in your first rounds, and never mid-game).</p>
      <p class="note">May we show ads based on your interests? Either way you see the same number of ads.</p>`;
    const menu = document.createElement('div');
    menu.className = 'menu';
    const pick = (c: Consent) => {
      store.set(KEY, c);
      layer.classList.remove('in');
      window.setTimeout(() => layer.remove(), 250);
      resolve(c);
    };
    const yes = document.createElement('button');
    yes.className = 'btn big green';
    yes.innerHTML = '<span>Allow personalised ads</span>';
    yes.onclick = () => pick('personalized');
    const no = document.createElement('button');
    no.className = 'btn big';
    no.innerHTML = '<span>Non-personalised only</span>';
    no.onclick = () => pick('limited');
    menu.append(yes, no);
    card.append(menu);
    if (review) {
      const cur = consentGiven();
      if (cur) card.append(Object.assign(document.createElement('p'), { className: 'note', textContent: `Current choice: ${cur === 'personalized' ? 'personalised' : 'non-personalised'} ads.` }));
    }
    layer.append(card);
    (document.getElementById('app') ?? document.body).append(layer);
    requestAnimationFrame(() => layer.classList.add('in'));
  });
}
