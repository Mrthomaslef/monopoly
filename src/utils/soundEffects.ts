// Procedural Web Audio API Synthesizer for Pirate's Plunder
// Zero external audio files (.mp3 / .wav) required

class SoundController {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // AudioContext will be lazily initialized on first user interaction
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.playGoldSound();
    }
    return this.muted;
  }

  /**
   * Short sine/triangle pitch-up on each ship hop from tile to tile
   */
  public playHopSound(stepIndex = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = 260 + (stepIndex % 8) * 28;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.09);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Dice rattle and bounce sound
   */
  public playDiceRollSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const bounces = [0, 0.07, 0.15, 0.24, 0.35, 0.48];
    bounces.forEach((offset, idx) => {
      const now = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      const startFreq = 420 + idx * 55 + Math.random() * 40;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 1.4, now + 0.05);

      const volume = Math.max(0.06, 0.24 - idx * 0.03);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.065);
    });
  }

  /**
   * Double crystalline high-frequency arpeggio for gold coins (Buy / Rent / Plunder)
   */
  public playGoldSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [987.77, 1318.51, 1567.98, 1975.53]; // B5, E6, G6, B6
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.055;

      // Primary sine bell
      const osc1 = ctx.createOscillator();
      // Shimmering square overtone
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq * 1.5, now);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.15, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.26);

      osc1.connect(gain);
      osc2.connect(osc2Gain);
      osc2Gain.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.27);
      osc2.stop(now + 0.27);
    });
  }

  /**
   * Cannon blast: White noise filtered through a low-pass BiquadFilterNode
   * coupled with a low-frequency oscillator (120Hz -> 30Hz) for deep impact
   */
  public playCannonSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.65;

    // 1. White noise burst + Low-pass filter
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.18));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(95, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);

    // 2. Sub-bass punch oscillator (120Hz -> 30Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.42);

    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 0.46);
  }

  /**
   * Fortification / Island upgrade sound
   */
  public playBuildSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [330, 440, 554.37, 659.25]; // E4, A4, C#5, E5
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    });
  }

  /**
   * Kraken Ambush / Prison sound
   */
  public playKrakenSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.65);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  /**
   * Fanfare de Victoire (Pirate shanty triumph)
   */
  public playVictoryFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const melody = [
      { freq: 440, delay: 0.0, dur: 0.14 },    // A4
      { freq: 523.25, delay: 0.15, dur: 0.14 }, // C5
      { freq: 587.33, delay: 0.30, dur: 0.14 }, // D5
      { freq: 587.33, delay: 0.46, dur: 0.22 }, // D5
      { freq: 659.25, delay: 0.70, dur: 0.14 }, // E5
      { freq: 698.46, delay: 0.85, dur: 0.18 }, // F5
      { freq: 880.0, delay: 1.05, dur: 0.45 },  // A5
    ];

    melody.forEach((note) => {
      const now = ctx.currentTime + note.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + note.dur + 0.02);
    });
  }

  /**
   * Bankrupt / Shipwreck sad melody
   */
  public playBankruptSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [
      { freq: 392.0, delay: 0.0, dur: 0.2 },   // G4
      { freq: 369.99, delay: 0.22, dur: 0.2 }, // F#4
      { freq: 349.23, delay: 0.44, dur: 0.2 }, // F4
      { freq: 329.63, delay: 0.66, dur: 0.45 } // E4
    ];

    notes.forEach((note) => {
      const now = ctx.currentTime + note.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + note.dur + 0.02);
    });
  }
}

export const soundEffects = new SoundController();
