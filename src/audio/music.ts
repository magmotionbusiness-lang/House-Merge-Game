/**
 * Background music: one looping home track for the menus and a shuffled
 * playlist of gameplay tracks.
 *
 * - Every round starts a fresh random order from the beginning.
 * - When the order runs out mid-round, a new shuffle starts (never repeating
 *   the track that just played).
 * - Tracks stream through <audio> elements routed into Web Audio gain nodes,
 *   because iOS ignores HTMLAudioElement.volume; the gains give per-channel volume.
 */

const BASE = import.meta.env.BASE_URL;
export const HOME_TRACK = `${BASE}audio/home.mp3`;
export const GAME_TRACKS = ['game-1', 'game-2', 'game-3', 'game-5'].map((n) => `${BASE}audio/${n}.mp3`);

/** Fisher-Yates shuffle; `avoidFirst` keeps a just-played track from repeating at the seam. */
export function shuffle<T>(list: T[], avoidFirst?: T, rnd: () => number = Math.random): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (avoidFirst !== undefined && a.length > 1 && a[0] === avoidFirst) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

type Channel = 'home' | 'game';

export class Music {
  private ctx: AudioContext | null = null;
  private home = new Audio();
  private game = new Audio();
  private gains: Partial<Record<Channel, GainNode>> = {};
  private volume: Record<Channel, number> = { home: 0.6, game: 0.5 };
  private order: string[] = [];
  private index = 0;
  private want: Channel | null = null;
  private duckUntil = 0;

  constructor() {
    for (const a of [this.home, this.game]) {
      a.preload = 'none';
      a.crossOrigin = 'anonymous';
      a.setAttribute('playsinline', '');
    }
    this.home.src = HOME_TRACK;
    this.home.loop = true;
    this.game.addEventListener('ended', () => this.nextTrack());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.home.pause();
        this.game.pause();
      } else this.resume();
    });
  }

  /** Connects to the shared AudioContext (called once audio is unlocked by a tap). */
  attach(ctx: AudioContext) {
    if (this.ctx) return;
    this.ctx = ctx;
    for (const ch of ['home', 'game'] as Channel[]) {
      const g = ctx.createGain();
      g.gain.value = 0;
      ctx.createMediaElementSource(ch === 'home' ? this.home : this.game).connect(g).connect(ctx.destination);
      this.gains[ch] = g;
    }
    this.resume();
    if (this.want) this.fade(this.want, this.volume[this.want], 1.2);
  }

  setVolume(ch: Channel, v: number) {
    this.volume[ch] = v;
    this.fade(ch, this.want === ch ? v : 0, 0.15);
  }

  /** Menus: fade the game playlist out and the home track in. */
  playHome() {
    this.want = 'home';
    this.fade('game', 0, 0.6, () => this.game.pause());
    this.start(this.home);
    this.fade('home', this.volume.home, 0.9);
  }

  /** A new round: a fresh shuffled order from its first track. */
  playGame() {
    this.want = 'game';
    this.order = shuffle(GAME_TRACKS, this.order[this.index]);
    this.index = 0;
    this.fade('home', 0, 0.6, () => this.home.pause());
    this.load(this.order[0]);
    this.fade('game', this.volume.game, 1.2);
  }

  /** Big moments duck the music briefly so the effect cuts through. */
  duck(amount = 0.3, seconds = 0.4) {
    if (!this.ctx || this.want !== 'game') return;
    const g = this.gains.game!.gain;
    const now = this.ctx.currentTime;
    this.duckUntil = now + seconds;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(this.volume.game * (1 - amount), now, 0.03);
    g.setTargetAtTime(this.volume.game, now + seconds, 0.15);
  }

  private nextTrack() {
    this.index++;
    if (this.index >= this.order.length) {
      this.order = shuffle(GAME_TRACKS, this.order[this.order.length - 1]);
      this.index = 0;
    }
    this.load(this.order[this.index]);
  }

  private load(src: string) {
    this.game.src = src;
    this.start(this.game);
  }

  private start(a: HTMLAudioElement) {
    if (!this.ctx || document.hidden) return;
    void a.play().catch(() => undefined);
  }

  private resume() {
    if (!this.ctx || !this.want) return;
    if (this.ctx.state !== 'running') void this.ctx.resume();
    this.start(this.want === 'home' ? this.home : this.game);
  }

  /** For tests: what each channel is doing. */
  debug() {
    return {
      want: this.want,
      home: { paused: this.home.paused, gain: this.gains.home?.gain.value },
      game: { src: this.game.src.split('/').pop(), paused: this.game.paused, gain: this.gains.game?.gain.value },
      order: this.order.map((s) => s.split('/').pop()),
    };
  }

  private fade(ch: Channel, to: number, seconds: number, done?: () => void) {
    const g = this.gains[ch];
    if (!g || !this.ctx) return;
    const now = this.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(to, now + seconds);
    if (done) window.setTimeout(done, seconds * 1000 + 50);
    void this.duckUntil;
  }
}
