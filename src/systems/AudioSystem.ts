export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private roll: GainNode | null = null;
  private skid: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private muted = false;
  private duck = 1;

  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(ctx.destination);

      const noise = this.noise(ctx, 2);
      this.windFilter = ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 400;
      this.wind = ctx.createGain();
      this.wind.gain.value = 0;
      noise.connect(this.windFilter).connect(this.wind).connect(this.master);

      const rollSrc = this.noise(ctx, 1.4);
      const rollFilter = ctx.createBiquadFilter();
      rollFilter.type = 'lowpass';
      rollFilter.frequency.value = 900;
      this.roll = ctx.createGain();
      this.roll.gain.value = 0;
      rollSrc.connect(rollFilter).connect(this.roll).connect(this.master);

      this.skid = ctx.createGain();
      this.skid.gain.value = 0;
      const skidSrc = this.noise(ctx, 0.8);
      const skidF = ctx.createBiquadFilter();
      skidF.type = 'highpass';
      skidF.frequency.value = 1800;
      skidSrc.connect(skidF).connect(this.skid).connect(this.master);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.22 * this.duck;
  }

  setDuck(value: number): void {
    this.duck = value;
    if (this.master && !this.muted) this.master.gain.value = 0.22 * value;
  }

  setLayers(speed: number, slip: number, grounded: boolean, air: number): void {
    if (!this.wind || !this.roll || !this.skid || !this.windFilter) return;
    const airspeed = speed + air * 4;
    this.wind.gain.value = Math.min(0.55, airspeed * 0.018);
    this.windFilter.frequency.value = 280 + airspeed * 18;
    this.roll.gain.value = grounded ? Math.min(0.35, speed * 0.014) : 0.02;
    this.skid.gain.value = grounded ? Math.min(0.45, slip * 0.32) : 0;
  }

  impact(strength: number, rng: () => number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 90 + rng() * 40;
    g.gain.value = 0.25 * strength;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  ui(rng: () => number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = 520 + rng() * 40;
    g.gain.value = 0.08;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  checkpoint(rng: () => number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660 + rng() * 20;
    g.gain.value = 0.12;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
    osc.connect(g).connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
  }

  private noise(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.sin(i * 12.9898) * 2 - 1;
    // Use a hashed sine so it stays deterministic-ish without Math.random.
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return src;
  }
}
