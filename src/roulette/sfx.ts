type CueName = 'tick' | 'clunk' | 'whoosh' | 'pop' | 'flip' | 'win';

class Sfx {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private muted = false;

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.out && this.ctx) this.out.gain.value = m ? 0 : 0.45;
  }

  isMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = this.muted ? 0 : 0.45;
      this.out.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; slideTo?: number; delay?: number } = {},
  ): void {
    if (!this.ctx || !this.out) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.slideTo), t0 + dur);
    g.gain.setValueAtTime(opts.gain ?? 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, opts: { gain?: number; cutoff?: number; delay?: number; sweepTo?: number } = {}): void {
    if (!this.ctx || !this.out) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opts.cutoff ?? 1200, t0);
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.gain ?? 0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(g).connect(this.out);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(cue: CueName): void {
    if (!this.ctx || this.muted) return;
    switch (cue) {
      case 'tick':
        this.tone(1250, 0.03, { gain: 0.1, type: 'square' });
        break;
      case 'clunk':
        this.noise(0.12, { gain: 0.35, cutoff: 340 });
        this.tone(95, 0.1, { gain: 0.3, type: 'triangle' });
        break;
      case 'whoosh':
        this.noise(0.35, { gain: 0.16, cutoff: 300, sweepTo: 2400 });
        break;
      case 'pop':
        this.tone(920, 0.09, { gain: 0.2, type: 'sine', slideTo: 320 });
        break;
      case 'flip':
        this.noise(0.05, { gain: 0.14, cutoff: 3000 });
        this.tone(840, 0.04, { gain: 0.08, type: 'square', delay: 0.03 });
        break;
      case 'win':
        [523, 659, 784, 1046, 1319].forEach((f, i) =>
          this.tone(f, 0.22, { gain: 0.16, type: 'square', delay: i * 0.09 }),
        );
        this.noise(0.5, { gain: 0.08, cutoff: 5000, sweepTo: 800, delay: 0.45 });
        break;
    }
  }
}

export const sfx = new Sfx();
