/** Inline line icons (stroke = currentColor), drawn in the style of drafting symbols. */
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const speaker = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke-width="1.6"/>';

export const ICONS = {
  soundOn: svg(`${speaker}<path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.3 6.3a8 8 0 0 1 0 11.4"/>`),
  soundOff: svg(`${speaker}<path d="M16 9.5l5 5M21 9.5l-5 5"/>`),
  restart: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4 4.5v4.3h4.3"/>'),
};
