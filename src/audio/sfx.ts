import type { Era } from '../core/tiers';

type Wave = OscillatorType;

interface ToneOpts {
  type?: Wave;
  gain?: number;
  attack?: number;
  freqEnd?: number;
  when?: number;
  dest?: AudioNode;
}

interface NoiseOpts {
  gain?: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
  when?: number;
}

const jitter = () => 1 + (Math.random() - 0.5) * 0.06; // ±3% pitch variation
const BASE = 262; // C4: the merge ladder plays upward from here

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

  constructor(muted: boolean) {
    this.muted = muted;
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
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(limiter);

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
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
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
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------- events

  tap() {
    if (!this.ok) return;
    this.tone(1500 * jitter(), 0.035, { gain: 0.12, type: 'triangle' });
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

  /** Merge chime: one pentatonic note higher per tier; combos add a higher note and a stamp. */
  merge(pitch: number, combo: number) {
    if (!this.ok) return;
    const f = BASE * Math.pow(2, pitch / 12) * jitter();
    this.bell(f, 0.32);
    if (combo >= 2) {
      const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
      const up = steps[Math.min(combo, steps.length - 1)];
      this.bell(f * Math.pow(2, up / 12), 0.22, 0.07);
      this.stamp(0.05);
    }
  }

  private bell(f: number, gain: number, when = 0) {
    this.tone(f, 0.7, { gain, when });
    this.tone(f * 2, 0.3, { gain: gain * 0.35, when });
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
