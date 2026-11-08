/** Inline line icons (stroke = currentColor), drawn in the style of drafting symbols. */
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const speaker = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke-width="1.6"/>';

export const ICONS = {
  soundOn: svg(`${speaker}<path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.3 6.3a8 8 0 0 1 0 11.4"/>`),
  soundOff: svg(`${speaker}<path d="M16 9.5l5 5M21 9.5l-5 5"/>`),
  pause: svg('<path d="M8.5 5v14M15.5 5v14" stroke-width="3"/>'),
  play: svg('<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>'),
  home: svg('<path d="M3.5 11.5L12 4l8.5 7.5"/><path d="M6 10v9.5h4.5v-5h3v5H18V10"/>'),
  gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/>'),
  wreck: svg('<circle cx="9" cy="15" r="5.5" fill="currentColor"/><path d="M12.5 11L19 4.5M19 4.5h-4M19 4.5v4"/>'),
  swap: svg('<path d="M5 8h13l-3.5-3.5M19 16H6l3.5 3.5"/>'),
  upgrade: svg('<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/><path d="M5 21h14"/>'),
  crane: svg('<path d="M6 21V4h12M6 4l12 0M14 4v5"/><path d="M12 9h4v3.5a2 2 0 0 1-4 0"/><path d="M3 21h7"/>'),
  back: svg('<path d="M19 12H5.5M11 5.5L4.5 12l6.5 6.5" stroke-width="2.8"/>'),
  music: svg('<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/>'),
  calendar: svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  city: svg('<path d="M3 20h18M5 20V10h5v10M10 20V5h6v15M16 20v-8h3v8"/>'),
  book: svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>'),
  share: svg('<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12v7.5h14V12"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  restart: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4 4.5v4.3h4.3"/>'),
};
