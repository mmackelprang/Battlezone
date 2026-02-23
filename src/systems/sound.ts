/**
 * Battlezone sound system — procedural Web Audio API synthesis.
 * Recreates the arcade's engine drone, cannon, explosions, and radar pings.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterGain: GainNode | null = null;

  // Looping sounds
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getMaster(): GainNode {
    this.ensureContext();
    return this.masterGain!;
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.muted) this.stopAllLoops();
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ── Engine drone ──────────────────────────────────────────

  startEngine(moving: boolean): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    if (!this.engineOsc) {
      this.engineOsc = ctx.createOscillator();
      this.engineGain = ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = moving ? 65 : 40;
      this.engineGain.gain.value = 0.03;
      this.engineOsc.connect(this.engineGain).connect(master);
      this.engineOsc.start();
    } else {
      this.engineOsc.frequency.setTargetAtTime(moving ? 65 : 40, ctx.currentTime, 0.1);
    }
  }

  stopEngine(): void {
    if (this.engineOsc) {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
      this.engineOsc = null;
      this.engineGain = null;
    }
  }

  // ── One-shot sounds ───────────────────────────────────────

  playCannon(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    // Sharp bang
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);

    // Noise burst
    const bufSize = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.1, ctx.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    noise.connect(nGain).connect(master);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.15);
  }

  playExplosion(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    // Long rumbling explosion
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);

    // Noise layer
    const bufSize = ctx.sampleRate * 0.6;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.08, ctx.currentTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    noise.connect(filter).connect(nGain).connect(master);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.6);
  }

  playEnemyCannon(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  playDeath(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    for (const detune of [-5, 5]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.5);
      osc.detune.value = detune;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain).connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    }
  }

  playExtraLife(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const notes = [330, 440, 550, 660];
    for (let i = 0; i < notes.length; i++) {
      const t = ctx.currentTime + i * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  stopAllLoops(): void {
    this.stopEngine();
  }
}
