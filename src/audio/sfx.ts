import type { Era } from '../core/tiers';

type Wave = OscillatorType;

interface ToneOpts {
  type?: Wave;
  gain?: number;
  attack?: number;
  freqEnd?: number;
  when?: number;
  dest?: AudioNode;
  wet?: number; // reverb send level (0-1)
}

interface NoiseOpts {
  gain?: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
  when?: number;
  wet?: number;
}

const jitter = () => 1 + (Math.random() - 0.5) * 0.06; // ±3% pitch variation
/** Major scale steps: each combo step climbs one note, so a chain plays a rising melody. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];

/**
 * Tiny procedural sound engine on the Web Audio API. Every sound is
 * synthesised in code (no files), routed through a master limiter.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf!: AudioBuffer;
  private slideGain: GainNode | null = null;
  private impactsUntil: number[] = [];
  private dangerOn = false;
  private nextBeat = 0;
  private muted: boolean;
  private volume: number;
  private reverb!: GainNode;
  private unlockListeners: ((ctx: AudioContext) => void)[] = [];

  constructor(volume: number) {
    this.volume = volume;
    this.muted = volume <= 0.001;
  }

  /** The shared AudioContext, once unlocked (music plays through it too). */
  get context() {
    return this.ctx;
  }

  /** Runs `fn` with the AudioContext as soon as audio is unlocked by a user gesture. */
  onUnlock(fn: (ctx: AudioContext) => void) {
    if (this.ctx) fn(this.ctx);
    else this.unlockListeners.push(fn);
  }

  /** Effects volume, 0-1. */
  setVolume(v: number) {
    this.volume = v;
    this.muted = v <= 0.001;
    if (this.ctx) this.master.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.03);
  }

  /** Must run inside a user gesture (iOS requires it). Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      // Respect the iPhone silent switch where supported (Safari 17+).
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = 'ambient';
      const ctx = new AC();
      this.ctx = ctx;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      limiter.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = this.volume * 0.9;
      this.master.connect(limiter);

      // A short, bright room reverb gives chimes and sparkles a polished tail.
      const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 1.6), ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2);
      }
      const conv = ctx.createConvolver();
      conv.buffer = ir;
      this.reverb = ctx.createGain();
      this.reverb.gain.value = 0.55;
      this.reverb.connect(conv).connect(this.master);

      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      // Continuous paper-friction loop; its volume follows sliding speed.
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 650;
      this.slideGain = ctx.createGain();
      this.slideGain.gain.value = 0;
      src.connect(lp).connect(this.slideGain).connect(this.master);
      src.start();
      for (const fn of this.unlockListeners) fn(ctx);
      this.unlockListeners = [];
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }


  private get ok() {
    return this.ctx !== null && this.ctx.state === 'running' && !this.muted;
  }

  private tone(freq: number, dur: number, o: ToneOpts = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.when ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + dur);
    const g = ctx.createGain();
    const peak = o.gain ?? 0.3;
    const a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(o.dest ?? this.master);
    if (o.wet) {
      const w = ctx.createGain();
      w.gain.value = o.wet;
      g.connect(w).connect(this.reverb);
    }
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, o: NoiseOpts = {}) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + (o.when ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1000, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.gain ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    if (o.wet) {
      const w = ctx.createGain();
      w.gain.value = o.wet;
      g.connect(w).connect(this.reverb);
    }
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------- events

  /** Button press: a soft, rounded pop. */
  tap() {
    if (!this.ok) return;
    const j = jitter();
    this.tone(540 * j, 0.07, { gain: 0.16, freqEnd: 900 * j });
    this.tone(1800 * j, 0.025, { gain: 0.05, type: 'triangle' });
  }

  /** Back / close: the same pop, falling. */
  tapBack() {
    if (!this.ok) return;
    const j = jitter();
    this.tone(760 * j, 0.08, { gain: 0.15, freqEnd: 430 * j });
  }

  /** Toggle or slider: a short click whose pitch follows the value. */
  tick2(v: number) {
    if (!this.ok) return;
    this.tone(700 + v * 900, 0.03, { gain: 0.08, type: 'triangle' });
  }

  /** Ratchet tick while pulling back in sling mode. */
  tick(power: number) {
    if (!this.ok) return;
    this.tone((900 + power * 700) * jitter(), 0.02, { gain: 0.05, type: 'square' });
  }

  launch(power: number) {
    if (!this.ok) return;
    const j = jitter();
    this.noise(0.2, { gain: 0.16, freq: 500 * j, freqEnd: (1400 + power * 1200) * j, q: 1.2 });
    this.tone(950 * j, 0.05, { gain: 0.2, freqEnd: 620 * j, type: 'triangle' });
  }

  /** Volume of the sliding loop follows the fastest piece (widths/s). */
  slide(speed: number) {
    if (!this.slideGain || !this.ctx) return;
    const target = this.muted ? 0 : Math.min(0.09, (speed / 7) * 0.09);
    this.slideGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
  }

  /** Piece-on-piece impact; material depends on the era of the heavier piece. */
  impact(era: Era, speed: number) {
    if (!this.ok || !this.voice()) return;
    const v = Math.min(1, speed / 5);
    const j = jitter();
    const g = 0.06 + v * 0.22;
    if (era === 1) {
      this.noise(0.05, { gain: g, freq: 1900 * j, q: 3 });
      this.tone(190 * j, 0.06, { gain: g * 0.8 });
    } else if (era === 2) {
      this.tone(540 * j, 0.08, { gain: g, freqEnd: 420 * j, type: 'triangle' });
      this.noise(0.04, { gain: g * 0.6, freq: 900 * j, q: 2 });
    } else if (era === 3) {
      this.tone(2600 * j, 0.14, { gain: g * 0.6 });
      this.tone(3900 * j, 0.08, { gain: g * 0.35 });
    } else {
      for (const f of [620, 1031, 1480]) this.tone(f * j, 0.35, { gain: g * 0.3 });
    }
  }

  rail(speed: number) {
    if (!this.ok || !this.voice()) return;
    const v = Math.min(1, speed / 5);
    const j = jitter();
    this.tone(120 * j, 0.14, { gain: 0.1 + v * 0.25, freqEnd: 80 * j });
    this.noise(0.06, { gain: 0.05 + v * 0.1, filter: 'lowpass', freq: 500 });
  }

  /** The twins rushing together, just before impact: a quick rising whoosh. */
  mergeRise(combo: number) {
    if (!this.ok) return;
    this.noise(0.1, { gain: 0.08 + Math.min(0.08, combo * 0.02), freq: 500, freqEnd: 3200, q: 1.4 });
  }

  /**
   * The merge payoff, built in layers like the best puzzle games:
   * a punchy low thump and click (impact), a bright major chord with bell
   * overtones (reward), and a fast sparkle arpeggio with reverb (shine).
   * Each combo step raises the whole thing one note up the major scale, so
   * chains play an ascending melody; bigger tiers add weight and a boom.
   */
  merge(tierId: number, combo: number) {
    if (!this.ok) return;
    const step = MAJOR[Math.min(combo - 1, MAJOR.length - 1)];
    const root = 392 * Math.pow(2, step / 12); // G4 upward
    const weight = Math.min(1, tierId / 12);
    // Impact.
    this.tone(150, 0.13, { gain: 0.42 + weight * 0.2, freqEnd: 46 });
    this.noise(0.018, { gain: 0.22, filter: 'highpass', freq: 3000 });
    if (tierId >= 9) this.tone(62, 0.55, { gain: 0.25 + weight * 0.15, freqEnd: 38 });
    // Reward chord (root, major third, fifth, octave) with bell partials.
    [1, 1.26, 1.5, 2].forEach((m, i) => {
      const f = root * m;
      const g = (i === 0 ? 0.2 : 0.12) * (1 + weight * 0.3);
      this.tone(f, 0.9, { gain: g, attack: 0.006, wet: 0.35 });
      this.tone(f * 2.01, 0.35, { gain: g * 0.3, wet: 0.3 });
      this.tone(f * 3.98, 0.14, { gain: g * 0.12, type: 'triangle' });
    });
    // Sparkle: a quick ascending arpeggio, longer for bigger combos.
    const notes = [0, 4, 7, 12, 16, 19, 24].slice(0, 3 + Math.min(4, combo));
    notes.forEach((n, i) =>
      this.tone(root * 2 * Math.pow(2, n / 12), 0.16, { gain: 0.07, type: 'triangle', when: 0.04 + i * 0.035, wet: 0.6 }),
    );
    if (combo >= 2) this.stamp(0.02);
  }

  /** The next piece clicking into the launcher. */
  reload() {
    if (!this.ok) return;
    this.tone(320 * jitter(), 0.05, { gain: 0.08, freqEnd: 520, type: 'triangle' });
  }

  /** Streak up: a bright two-note "level up" that climbs with the streak. */
  streak(n: number) {
    if (!this.ok) return;
    const f = 660 * Math.pow(2, MAJOR[Math.min(n - 2, MAJOR.length - 1)] / 12);
    this.tone(f, 0.12, { gain: 0.1, type: 'square', wet: 0.3 });
    this.tone(f * 1.5, 0.22, { gain: 0.09, type: 'square', when: 0.07, wet: 0.4 });
  }

  /** Praise for a big combo ("Great!", "Amazing!"): a bright chord stab with a shimmering cascade. */
  praise(level: number) {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.connect(this.master);
    const root = 523 * Math.pow(2, MAJOR[Math.min(level, 6)] / 12);
    for (const m of [1, 1.26, 1.5]) {
      this.tone(root * m * 0.998, 0.5, { gain: 0.07, type: 'sawtooth', attack: 0.01, dest: lp });
      this.tone(root * m * 1.003, 0.5, { gain: 0.07, type: 'sawtooth', attack: 0.01, dest: lp });
    }
    for (let i = 0; i < 8; i++) this.tone(root * 2 * Math.pow(2, (i * 2) / 12), 0.2, { gain: 0.05, type: 'triangle', when: 0.08 + i * 0.03, wet: 0.7 });
  }

  private bell(f: number, gain: number, when = 0) {
    this.tone(f, 0.7, { gain, when, wet: 0.3 });
    this.tone(f * 2, 0.3, { gain: gain * 0.35, when, wet: 0.3 });
    this.tone(f * 3.01, 0.12, { gain: gain * 0.15, when, type: 'triangle' });
  }

  private stamp(when = 0) {
    this.tone(150, 0.1, { gain: 0.3, freqEnd: 85, when });
    this.noise(0.05, { gain: 0.15, filter: 'lowpass', freq: 900, when });
  }

  /** New tier reached for the first time: a short brass fanfare plus a construction-horn hit. */
  fanfare() {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.connect(this.master);
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone(f, i === 3 ? 0.6 : 0.16, { gain: 0.13, type: 'sawtooth', when: i * 0.09, attack: 0.02, dest: lp }),
    );
    this.tone(233, 0.4, { gain: 0.08, type: 'square', when: 0.42, attack: 0.02, dest: lp });
    this.tone(294, 0.4, { gain: 0.08, type: 'square', when: 0.42, attack: 0.02, dest: lp });
  }

  wonder() {
    if (!this.ok) return;
    this.fanfare();
    [1047, 1319, 1568, 2093].forEach((f, i) => this.bell(f, 0.2, 0.5 + i * 0.12));
  }

  /** The dust-cloud transition: a deep rumble and a rising whoosh. */
  dust() {
    if (!this.ok) return;
    this.noise(1.2, { gain: 0.22, filter: 'lowpass', freq: 220, freqEnd: 900, q: 0.8 });
    this.noise(0.9, { gain: 0.1, freq: 600, freqEnd: 2600, q: 0.7, when: 0.15 });
    this.tone(55, 0.7, { gain: 0.25, freqEnd: 38 });
    for (let i = 0; i < 6; i++) this.tone((300 + Math.random() * 500) * jitter(), 0.05, { gain: 0.06, type: 'triangle', when: 0.1 + i * 0.09 });
  }

  /** Contract done: a rubber stamp and a cascade of coins. */
  contract() {
    if (!this.ok) return;
    this.stamp();
    for (let i = 0; i < 6; i++) this.tone((1800 + i * 140) * jitter(), 0.09, { gain: 0.08, type: 'triangle', when: 0.12 + i * 0.06 });
  }

  /** Level complete: a short rising jingle. */
  levelComplete() {
    if (!this.ok) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.bell(f, 0.22, i * 0.11));
    this.tone(262, 0.6, { gain: 0.12, type: 'triangle', when: 0.44 });
  }

  setDanger(on: boolean) {
    this.dangerOn = on;
  }

  gameOver() {
    if (!this.ok) return;
    this.tone(440, 0.35, { gain: 0.16, type: 'triangle', freqEnd: 370 });
    this.tone(370, 0.6, { gain: 0.16, type: 'triangle', freqEnd: 262, when: 0.3 });
  }

  /** Called every frame: drives the danger heartbeat. */
  update() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.dangerOn && this.ok && now >= this.nextBeat) {
      this.tone(62, 0.13, { gain: 0.45, freqEnd: 40 });
      this.tone(58, 0.13, { gain: 0.35, freqEnd: 38, when: 0.18 });
      this.tone(330, 0.3, { gain: 0.03, type: 'triangle', freqEnd: 260 });
      this.nextBeat = now + 0.75;
    }
  }

  /** Limits overlapping impact sounds to 4 at once. */
  private voice() {
    const now = this.ctx!.currentTime;
    this.impactsUntil = this.impactsUntil.filter((t) => t > now);
    if (this.impactsUntil.length >= 4) return false;
    this.impactsUntil.push(now + 0.12);
    return true;
  }
}
