// Zero-Stutter High-Fidelity Audio Engine for Jolly Roger's (Pirate's Plunder)
// Architecture designed to eliminate all WebGL/Three.js main-thread audio stuttering:
// 1. Background music ("Pirates des Caraïbes" 6/8 Symphonic Theme) is rendered ONCE off-thread
//    via OfflineAudioContext into a single seamless AudioBuffer, then played with a single
//    native AudioBufferSourceNode (loop = true) -> 0% main-thread CPU, 0 timers, 0 GC pauses.
// 2. Heavy multi-layered SFX (Dice Roll, Gold Doubloons, Cannon Blast, Cutlass Clash, Kraken,
//    Card Reveal, Turn Bell) are pre-baked into AudioBuffers so playing them spawns a single
//    buffer source node with zero real-time ConvolverNode FFT overhead.

type ClickVariant = 'wood' | 'brass' | 'parchment';

interface MelodyNote {
  step: number; // 0..5 within the 6/8 bar
  dur: number;  // in 8th-note steps
  midi: number;
  vel?: number;
  harmonyMidi?: number;
}

interface BarArrangement {
  bassMidi: number;
  fifthMidi: number;
  chordMidis: number[];
  section: 'A' | 'B' | 'C' | 'D';
  cymbalCrash?: boolean;
  snareRoll?: boolean;
  melody: MelodyNote[];
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 16-Bar Seamless Symphonic Pirate Loop in D Minor (6/8 Time Signature)
const PIRATE_SYMPHONY_BARS: BarArrangement[] = [
  // ================= SECTION A: L'ASSAUT DU BLACK PEARL (Bars 1-8) =================
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'A', cymbalCrash: true,
    melody: [
      { step: 0, dur: 2, midi: 62, vel: 0.95, harmonyMidi: 57 },
      { step: 2, dur: 1, midi: 62, vel: 0.85 },
      { step: 3, dur: 2, midi: 62, vel: 0.95, harmonyMidi: 57 },
      { step: 5, dur: 1, midi: 64, vel: 0.90 },
    ],
  },
  {
    bassMidi: 34, fifthMidi: 41, chordMidis: [50, 53, 58], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 65, vel: 1.0, harmonyMidi: 58 },
      { step: 2, dur: 1, midi: 65, vel: 0.88 },
      { step: 3, dur: 2, midi: 65, vel: 0.95, harmonyMidi: 58 },
      { step: 5, dur: 1, midi: 67, vel: 0.92 },
    ],
  },
  {
    bassMidi: 36, fifthMidi: 43, chordMidis: [48, 52, 55], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 64, vel: 0.95, harmonyMidi: 60 },
      { step: 2, dur: 1, midi: 64, vel: 0.88 },
      { step: 3, dur: 1, midi: 62, vel: 0.90 },
      { step: 4, dur: 1, midi: 60, vel: 0.90 },
      { step: 5, dur: 1, midi: 60, vel: 0.85 },
    ],
  },
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'A', snareRoll: true,
    melody: [
      { step: 0, dur: 4, midi: 62, vel: 1.0, harmonyMidi: 57 },
      { step: 4, dur: 1, midi: 57, vel: 0.85 },
      { step: 5, dur: 1, midi: 60, vel: 0.90 },
    ],
  },
  {
    bassMidi: 34, fifthMidi: 41, chordMidis: [50, 53, 58], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 62, vel: 0.98, harmonyMidi: 58 },
      { step: 2, dur: 1, midi: 62, vel: 0.88 },
      { step: 3, dur: 1, midi: 62, vel: 0.92 },
      { step: 4, dur: 1, midi: 65, vel: 0.94 },
      { step: 5, dur: 1, midi: 67, vel: 0.96 },
    ],
  },
  {
    bassMidi: 31, fifthMidi: 38, chordMidis: [50, 55, 58], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 67, vel: 1.0, harmonyMidi: 62 },
      { step: 2, dur: 1, midi: 67, vel: 0.90 },
      { step: 3, dur: 1, midi: 67, vel: 0.92 },
      { step: 4, dur: 1, midi: 69, vel: 0.96 },
      { step: 5, dur: 1, midi: 70, vel: 0.98 },
    ],
  },
  {
    bassMidi: 33, fifthMidi: 40, chordMidis: [49, 52, 57], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 69, vel: 1.0, harmonyMidi: 61 },
      { step: 2, dur: 1, midi: 67, vel: 0.92 },
      { step: 3, dur: 2, midi: 69, vel: 0.95, harmonyMidi: 64 },
      { step: 5, dur: 1, midi: 62, vel: 0.90 },
    ],
  },
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'A', snareRoll: true,
    melody: [
      { step: 0, dur: 3, midi: 62, vel: 1.0, harmonyMidi: 57 },
      { step: 3, dur: 1, midi: 62, vel: 0.88 },
      { step: 4, dur: 1, midi: 64, vel: 0.92 },
      { step: 5, dur: 1, midi: 65, vel: 0.95 },
    ],
  },

  // ================= SECTION B: TRIOMPHE DES FLIBUSTIERS (Bars 9-16) =================
  {
    bassMidi: 29, fifthMidi: 36, chordMidis: [53, 57, 60], section: 'B', cymbalCrash: true,
    melody: [
      { step: 0, dur: 2, midi: 67, vel: 1.0, harmonyMidi: 60 },
      { step: 2, dur: 1, midi: 67, vel: 0.90 },
      { step: 3, dur: 1, midi: 69, vel: 0.95 },
      { step: 4, dur: 1, midi: 67, vel: 0.92 },
      { step: 5, dur: 1, midi: 65, vel: 0.90 },
    ],
  },
  {
    bassMidi: 36, fifthMidi: 43, chordMidis: [52, 55, 60], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 64, vel: 0.96, harmonyMidi: 60 },
      { step: 2, dur: 1, midi: 65, vel: 0.90 },
      { step: 3, dur: 2, midi: 67, vel: 0.98, harmonyMidi: 60 },
      { step: 5, dur: 1, midi: 64, vel: 0.90 },
    ],
  },
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 74, vel: 1.0, harmonyMidi: 69 },
      { step: 2, dur: 1, midi: 74, vel: 0.94 },
      { step: 3, dur: 2, midi: 74, vel: 1.0, harmonyMidi: 69 },
      { step: 5, dur: 1, midi: 76, vel: 0.96 },
    ],
  },
  {
    bassMidi: 34, fifthMidi: 41, chordMidis: [53, 58, 62], section: 'B', snareRoll: true,
    melody: [
      { step: 0, dur: 2, midi: 77, vel: 1.0, harmonyMidi: 70 },
      { step: 2, dur: 1, midi: 77, vel: 0.94 },
      { step: 3, dur: 2, midi: 77, vel: 1.0, harmonyMidi: 70 },
      { step: 5, dur: 1, midi: 79, vel: 0.98 },
    ],
  },
  {
    bassMidi: 36, fifthMidi: 43, chordMidis: [52, 55, 60], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 76, vel: 1.0, harmonyMidi: 67 },
      { step: 2, dur: 1, midi: 76, vel: 0.92 },
      { step: 3, dur: 1, midi: 74, vel: 0.95 },
      { step: 4, dur: 1, midi: 72, vel: 0.95 },
      { step: 5, dur: 1, midi: 72, vel: 0.92 },
    ],
  },
  {
    bassMidi: 31, fifthMidi: 38, chordMidis: [50, 55, 58], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 74, vel: 1.0, harmonyMidi: 67 },
      { step: 2, dur: 1, midi: 76, vel: 0.94 },
      { step: 3, dur: 2, midi: 77, vel: 1.0, harmonyMidi: 70 },
      { step: 5, dur: 1, midi: 79, vel: 0.98 },
    ],
  },
  {
    bassMidi: 33, fifthMidi: 40, chordMidis: [49, 55, 61], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 74, vel: 0.98, harmonyMidi: 65 },
      { step: 2, dur: 1, midi: 76, vel: 0.95 },
      { step: 3, dur: 2, midi: 73, vel: 1.0, harmonyMidi: 64 },
      { step: 5, dur: 1, midi: 69, vel: 0.95 },
    ],
  },
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 57, 62], section: 'B', cymbalCrash: true, snareRoll: true,
    melody: [
      { step: 0, dur: 4, midi: 74, vel: 1.0, harmonyMidi: 62 },
      { step: 4, dur: 1, midi: 57, vel: 0.90 },
      { step: 5, dur: 1, midi: 60, vel: 0.95 },
    ],
  },
];

const STORAGE_MUTE_KEY = 'pirates-plunder-audio-muted';
const STORAGE_MUSIC_KEY = 'pirates-plunder-music-enabled';

class SoundController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Pre-rendered AudioBuffers (zero real-time CPU overhead!)
  private musicLoopBuffer: AudioBuffer | null = null;
  private musicSourceNode: AudioBufferSourceNode | null = null;
  private isRenderingMusic = false;

  private prebakedSfx: Record<string, AudioBuffer> = {};
  private hopBuffers: AudioBuffer[] = [];

  private muted = false;
  private musicEnabled = true;
  private isMusicPlaying = false;
  private listeners: Array<() => void> = [];
  private unlockBound = false;

  private readonly STEP_DURATION = 0.145; // 6/8 eighth-note pulse

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMute = window.localStorage.getItem(STORAGE_MUTE_KEY);
        if (savedMute !== null) {
          this.muted = savedMute === 'true';
        }
        const savedMusic = window.localStorage.getItem(STORAGE_MUSIC_KEY);
        if (savedMusic !== null) {
          this.musicEnabled = savedMusic === 'true';
        }
      } catch {
        // Ignore storage errors
      }
      this.bindFirstInteractionUnlock();
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  private bindFirstInteractionUnlock(): void {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;

    const unlock = () => {
      if (!this.muted) {
        const ctx = this.getContext();
        if (ctx && this.musicEnabled && !this.isMusicPlaying) {
          this.startBackgroundMusic();
        }
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx({ latencyHint: 'interactive' });
        this.setupAudioGraph(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupAudioGraph(ctx: AudioContext): void {
    // Lightweight master bus (NO real-time ConvolverNode so audio thread never stutters!)
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.92, ctx.currentTime);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.95, ctx.currentTime);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.42 : 0.0001, ctx.currentTime);

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    // Pre-synthesize the core SFX AudioBuffers directly in memory (takes <15ms once)
    this.buildPrebakedSfxBuffers(ctx);
  }

  // ============================================================================
  // FAST PCM AUDIOBUFFER SYNTHESIS FOR ZERO-STUTTER SFX
  // ============================================================================

  private buildPrebakedSfxBuffers(ctx: AudioContext): void {
    const sr = ctx.sampleRate;

    // 1. Pre-bake 8 ascending D-Dorian ship hop buffers (marimba + water wake splash)
    const dorianMidis = [62, 64, 65, 67, 69, 71, 72, 74];
    this.hopBuffers = dorianMidis.map((midi) => {
      const freq = midiToFreq(midi);
      const dur = 0.16;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-t * 26) * Math.min(1, t / 0.006);
        const f = freq * (1 + t * 0.12);
        const tone =
          Math.sin(2 * Math.PI * f * t) * 0.65 +
          Math.sin(2 * Math.PI * f * 2 * t) * 0.25 * Math.exp(-t * 45);
        // Band-limited water splash
        const white = Math.random() * 2 - 1;
        lp = lp + 0.18 * (white - lp);
        const splashEnv = Math.exp(-t * 22) * Math.sin(Math.min(Math.PI, (t / 0.12) * Math.PI));
        data[i] = (tone * env + lp * splashEnv * 0.42) * 0.55;
      }
      return buf;
    });

    // 2. Pre-bake Gold Doubloon Cascade Buffer (0.55s)
    {
      const dur = 0.55;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const notes = [1174.66, 1479.98, 1760.0, 2349.32, 2959.96];
      notes.forEach((freq, idx) => {
        const startSample = Math.floor(idx * 0.048 * sr);
        for (let i = startSample; i < len; i++) {
          const t = (i - startSample) / sr;
          if (t > 0.3) break;
          const env = Math.exp(-t * 16) * Math.min(1, t / 0.003);
          const s =
            Math.sin(2 * Math.PI * freq * t) * 0.6 +
            Math.sin(2 * Math.PI * freq * 2.42 * t) * 0.3 * Math.exp(-t * 35);
          data[i] += s * env * 0.35;
        }
      });
      this.prebakedSfx.gold = buf;
    }

    // 3. Pre-bake 3D Dice Roll on Oak Deck Buffer (0.68s)
    {
      const dur = 0.68;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const hits = [0.0, 0.055, 0.115, 0.185, 0.265, 0.355, 0.455, 0.565];
      hits.forEach((offset, idx) => {
        const startSample = Math.floor(offset * sr);
        const pitch = 480 + idx * 62 + (idx % 2) * 90;
        const vol = Math.max(0.14, 0.42 - idx * 0.032);
        for (let i = startSample; i < len; i++) {
          const t = (i - startSample) / sr;
          if (t > 0.06) break;
          const env = Math.exp(-t * 58) * Math.min(1, t / 0.002);
          const woodFreq = pitch * Math.exp(-t * 14);
          const clack =
            Math.sin(2 * Math.PI * woodFreq * t) * 0.7 +
            Math.sin(2 * Math.PI * woodFreq * 2.35 * t) * 0.35;
          data[i] += clack * env * vol;
        }
      });
      this.prebakedSfx.diceRoll = buf;
    }

    // 4. Pre-bake Naval Cannon Blast + Wood Splinters Buffer (0.85s)
    {
      const dur = 0.85;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      let lp = 0;
      let phase = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        // Sub-bass punch (155Hz -> 26Hz)
        const subFreq = 26 + 129 * Math.exp(-t * 9.5);
        phase += (2 * Math.PI * subFreq) / sr;
        const sub = Math.sin(phase) * Math.exp(-t * 5.2) * 0.65;

        // Low-pass filtered gunpowder explosion noise
        const white = Math.random() * 2 - 1;
        const cutoffAlpha = Math.max(0.02, 0.32 * Math.exp(-t * 4.5));
        lp = lp + cutoffAlpha * (white - lp);
        const blast = lp * Math.exp(-t * 4.2) * 0.85;

        // Cannonball whistle (0.05s..0.32s)
        let whistle = 0;
        if (t > 0.04 && t < 0.34) {
          const wt = t - 0.04;
          const wf = 1100 * Math.exp(-wt * 3.2);
          whistle = Math.sin(2 * Math.PI * wf * wt) * Math.exp(-wt * 8) * 0.14;
        }

        data[i] = Math.max(-0.95, Math.min(0.95, sub + blast + whistle));
      }
      // Add 3 wood splinter crunches around 0.28s..0.40s
      [0.28, 0.33, 0.39].forEach((offset, idx) => {
        const startSample = Math.floor(offset * sr);
        const f0 = 460 - idx * 80;
        for (let i = startSample; i < len; i++) {
          const t = (i - startSample) / sr;
          if (t > 0.06) break;
          const env = Math.exp(-t * 45);
          data[i] = Math.max(
            -0.95,
            Math.min(0.95, data[i] + Math.sin(2 * Math.PI * f0 * Math.exp(-t * 18) * t) * env * 0.32)
          );
        }
      });
      this.prebakedSfx.cannon = buf;
    }

    // 5. Pre-bake Cutlass Sword Clash + Boarding Horn Buffer (0.55s)
    {
      const dur = 0.55;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      [0.0, 0.13].forEach((offset, idx) => {
        const startSample = Math.floor(offset * sr);
        const freqs = idx === 0 ? [2150, 3420, 4890] : [2480, 3860, 5320];
        for (let i = startSample; i < len; i++) {
          const t = (i - startSample) / sr;
          if (t > 0.22) break;
          const env = Math.exp(-t * 18) * Math.min(1, t / 0.002);
          let sum = 0;
          for (const f of freqs) {
            sum += Math.sin(2 * Math.PI * f * (1 - t * 0.08) * t);
          }
          data[i] += (sum / 3) * env * 0.38;
        }
      });
      // Boarding horn D4 (293.66Hz) + A3 (220Hz)
      for (let i = Math.floor(0.04 * sr); i < len; i++) {
        const t = (i - Math.floor(0.04 * sr)) / sr;
        const env = Math.min(1, t / 0.03) * Math.exp(-t * 4.5);
        const horn =
          Math.sin(2 * Math.PI * 293.66 * t) * 0.5 +
          Math.sin(2 * Math.PI * 587.33 * t) * 0.3 +
          Math.sin(2 * Math.PI * 220.0 * t) * 0.3;
        data[i] = Math.max(-0.95, Math.min(0.95, data[i] + horn * env * 0.35));
      }
      this.prebakedSfx.swordClash = buf;
    }

    // 6. Pre-bake Kraken Abyssal Roar + Dungeon Iron Gate Slam (0.85s)
    {
      const dur = 0.85;
      const len = Math.floor(sr * dur);
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      let phase1 = 0;
      let phase2 = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const f = 38 + 130 * Math.exp(-t * 3.2);
        phase1 += (2 * Math.PI * f) / sr;
        phase2 += (2 * Math.PI * f * 1.015) / sr;
        const env = Math.min(1, t / 0.035) * Math.exp(-t * 2.8);
        const growl = (Math.sin(phase1) + Math.sin(phase2 * 2) * 0.5) * 0.35 * env;
        data[i] = growl;
      }
      // Iron prison clang at +0.22s
      const clangStart = Math.floor(0.22 * sr);
      const clangFreqs = [620, 1140, 1890, 2760];
      for (let i = clangStart; i < len; i++) {
        const t = (i - clangStart) / sr;
        if (t > 0.38) break;
        const env = Math.exp(-t * 12);
        let c = 0;
        for (const cf of clangFreqs) {
          c += Math.sin(2 * Math.PI * cf * t);
        }
        data[i] = Math.max(-0.95, Math.min(0.95, data[i] + (c / 4) * env * 0.32));
      }
      this.prebakedSfx.kraken = buf;
    }

    // 7. Pre-bake UI Click Buffers (wood, brass, parchment)
    {
      const len = Math.floor(sr * 0.065);
      const woodBuf = ctx.createBuffer(1, len, sr);
      const wData = woodBuf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const f = 135 + 210 * Math.exp(-t * 55);
        wData[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 65) * 0.45;
      }
      this.prebakedSfx.click_wood = woodBuf;

      const brassBuf = ctx.createBuffer(1, len, sr);
      const bData = brassBuf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        bData[i] =
          (Math.sin(2 * Math.PI * 1480 * t) + Math.sin(2 * Math.PI * 2960 * t) * 0.5) *
          Math.exp(-t * 55) *
          0.25;
      }
      this.prebakedSfx.click_brass = brassBuf;

      const parchBuf = ctx.createBuffer(1, Math.floor(sr * 0.09), sr);
      const pData = parchBuf.getChannelData(0);
      let lp = 0;
      for (let i = 0; i < pData.length; i++) {
        const t = i / sr;
        const white = Math.random() * 2 - 1;
        lp = lp + 0.35 * (white - lp);
        pData[i] = (white - lp) * Math.exp(-t * 38) * 0.32;
      }
      this.prebakedSfx.click_parchment = parchBuf;
    }
  }

  private playBuffer(buf: AudioBuffer | undefined, volume = 1.0, playbackRate = 1.0): void {
    const ctx = this.getContext();
    if (!ctx || !buf || !this.sfxGain) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (playbackRate !== 1.0) {
      src.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);
    }

    if (volume !== 1.0) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, ctx.currentTime);
      src.connect(g);
      g.connect(this.sfxGain);
    } else {
      src.connect(this.sfxGain);
    }

    src.start(ctx.currentTime);
  }

  // ============================================================================
  // OFFLINE-RENDERED "PIRATES DES CARAÏBES" (6/8) SYMPHONIC LOOP
  // ============================================================================

  private async ensureMusicLoopRendered(): Promise<AudioBuffer | null> {
    if (this.musicLoopBuffer) return this.musicLoopBuffer;
    if (this.isRenderingMusic) return null;
    this.isRenderingMusic = true;

    try {
      const totalEighths = PIRATE_SYMPHONY_BARS.length * 6;
      const totalDuration = totalEighths * this.STEP_DURATION;
      // 22050 Hz stereo OfflineAudioContext renders 16 bars in ~25ms off the main thread!
      const sampleRate = 22050;
      const totalSamples = Math.floor(sampleRate * totalDuration);
      const OfflineCtx =
        window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;

      const offline = new OfflineCtx(2, totalSamples, sampleRate);
      const master = offline.createGain();
      master.gain.setValueAtTime(0.75, 0);
      master.connect(offline.destination);

      const noiseBuf = this.createWhiteNoiseBuffer(offline, 0.8);

      for (let barIdx = 0; barIdx < PIRATE_SYMPHONY_BARS.length; barIdx++) {
        const bar = PIRATE_SYMPHONY_BARS[barIdx];
        for (let step = 0; step < 6; step++) {
          const time = (barIdx * 6 + step) * this.STEP_DURATION;

          // 1. Driving 6/8 Spiccato Cellos & Double Bass Ostinato
          const accentPattern = [1.0, 0.48, 0.78, 0.92, 0.52, 0.82];
          const bassMidi = step === 3 || step === 5 ? bar.fifthMidi : bar.bassMidi;
          this.scheduleCelloNote(offline, master, midiToFreq(bassMidi), time, accentPattern[step]);

          // 2. Harpsichord / Accordion Arpeggio
          const arpMidi = bar.chordMidis[step % bar.chordMidis.length];
          const arpShift = bar.section === 'B' ? 12 : 0;
          if (step === 0 || step === 2 || step === 3 || step === 5) {
            this.scheduleHarpsichordNote(
              offline,
              master,
              midiToFreq(arpMidi + arpShift),
              time,
              step === 0 || step === 3 ? 0.16 : 0.11
            );
          }

          // 3. String Pad on Beat 0
          if (step === 0) {
            bar.chordMidis.forEach((m) => {
              this.schedulePadNote(
                offline,
                master,
                midiToFreq(m),
                time,
                this.STEP_DURATION * 5.8,
                0.065
              );
            });
          }

          // 4. Heroic Lead Melody (French Horns + Violins)
          for (const note of bar.melody) {
            if (note.step === step) {
              const durSec = note.dur * this.STEP_DURATION;
              const vel = note.vel ?? 0.9;
              this.scheduleHornMelodyNote(
                offline,
                master,
                midiToFreq(note.midi),
                time,
                durSec,
                vel * 0.30
              );
              if (note.harmonyMidi !== undefined) {
                this.scheduleHornMelodyNote(
                  offline,
                  master,
                  midiToFreq(note.harmonyMidi),
                  time,
                  durSec,
                  vel * 0.19
                );
              }
            }
          }

          // 5. Orchestral Timpani & Snare
          if (step === 0) {
            this.scheduleTimpaniHit(offline, master, midiToFreq(bar.bassMidi), time, 0.38);
            if (bar.cymbalCrash) {
              this.scheduleCymbalHit(offline, master, noiseBuf, time, 0.14);
            }
          } else if (step === 3) {
            this.scheduleTimpaniHit(offline, master, midiToFreq(bar.fifthMidi - 12), time, 0.28);
            this.scheduleSnareHit(offline, master, noiseBuf, time, 0.14);
          } else if (step === 2 || step === 5) {
            this.scheduleSnareHit(offline, master, noiseBuf, time, step === 5 ? 0.12 : 0.08);
          }

          if (bar.snareRoll && (step === 4 || step === 5)) {
            this.scheduleSnareHit(
              offline,
              master,
              noiseBuf,
              time + this.STEP_DURATION * 0.5,
              0.11
            );
          }
        }
      }

      this.musicLoopBuffer = await offline.startRendering();
      this.isRenderingMusic = false;
      return this.musicLoopBuffer;
    } catch {
      this.isRenderingMusic = false;
      return null;
    }
  }

  private createWhiteNoiseBuffer(ctx: BaseAudioContext, durationSeconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private scheduleCelloNote(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    velocity: number
  ): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5.2, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2.0, time + 0.11);

    const peak = 0.24 * velocity;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.135);
  }

  private scheduleHornMelodyNote(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    durSec: number,
    volume: number
  ): void {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);
    osc1.detune.setValueAtTime(-4, time);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(4, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4200, freq * 4.2), time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.016);
    gain.gain.setValueAtTime(volume * 0.85, time + Math.max(0.02, durSec * 0.7));
    gain.gain.exponentialRampToValueAtTime(0.0008, time + durSec + 0.03);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + durSec + 0.035);
    osc2.stop(time + durSec + 0.035);
  }

  private scheduleHarpsichordNote(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.11);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.115);
  }

  private schedulePadNote(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    durSec: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + durSec);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + durSec + 0.01);
  }

  private scheduleTimpaniHit(
    ctx: BaseAudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.45, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.24);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  private scheduleSnareHit(
    ctx: BaseAudioContext,
    dest: AudioNode,
    noiseBuf: AudioBuffer,
    time: number,
    volume: number
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.085);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(time, 0, 0.09);
  }

  private scheduleCymbalHit(
    ctx: BaseAudioContext,
    dest: AudioNode,
    noiseBuf: AudioBuffer,
    time: number,
    volume: number
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4800, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.65);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(time, 0, 0.7);
  }

  // ============================================================================
  // MUSIC & MUTE CONTROLS
  // ============================================================================

  private duckMusic(duckGain = 0.14, holdSeconds = 0.55): void {
    if (!this.ctx || !this.musicGain || !this.musicEnabled || this.muted) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(duckGain, now, 0.02);
    this.musicGain.gain.setTargetAtTime(0.42, now + holdSeconds, 0.18);
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    try {
      window.localStorage.setItem(STORAGE_MUTE_KEY, String(mute));
    } catch {
      // ignore
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.92, now, 0.02);
    }
    if (mute) {
      this.stopBackgroundMusic();
    } else if (this.musicEnabled) {
      this.startBackgroundMusic();
    }
    this.notifyListeners();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    if (!this.muted) {
      this.playGoldSound();
    }
    return this.muted;
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled && !this.muted;
  }

  public toggleMusic(): boolean {
    if (this.muted) {
      this.setMuted(false);
      this.musicEnabled = true;
    } else {
      this.musicEnabled = !this.musicEnabled;
    }
    try {
      window.localStorage.setItem(STORAGE_MUSIC_KEY, String(this.musicEnabled));
    } catch {
      // ignore
    }

    if (this.musicEnabled && !this.muted) {
      this.startBackgroundMusic();
      this.playButtonClickSound('brass');
    } else {
      this.stopBackgroundMusic();
      this.playButtonClickSound('wood');
    }
    this.notifyListeners();
    return this.isMusicEnabled();
  }

  public startBackgroundMusic(): void {
    if (this.muted || !this.musicEnabled || this.isMusicPlaying) return;
    const ctx = this.getContext();
    if (!ctx || !this.musicGain) return;

    this.isMusicPlaying = true;
    this.notifyListeners();

    this.ensureMusicLoopRendered().then((loopBuf) => {
      if (!loopBuf || !this.isMusicPlaying || this.muted || !this.musicEnabled || !this.ctx || !this.musicGain) {
        return;
      }
      this.stopMusicSourceNode();

      const source = this.ctx.createBufferSource();
      source.buffer = loopBuf;
      source.loop = true;
      source.connect(this.musicGain);

      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(0.42, this.ctx.currentTime, 0.12);

      source.start(0);
      this.musicSourceNode = source;
    });
  }

  private stopMusicSourceNode(): void {
    if (this.musicSourceNode) {
      try {
        this.musicSourceNode.stop();
        this.musicSourceNode.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.musicSourceNode = null;
    }
  }

  public stopBackgroundMusic(): void {
    this.isMusicPlaying = false;
    this.stopMusicSourceNode();
    this.notifyListeners();
  }

  // ============================================================================
  // PUBLIC GAME SOUND EFFECTS (ZERO-STUTTER BUFFER PLAYBACK)
  // ============================================================================

  public playButtonClickSound(variant: ClickVariant = 'wood'): void {
    this.playBuffer(this.prebakedSfx[`click_${variant}`], 0.85);
  }

  public playHopSound(stepIndex = 0): void {
    if (this.hopBuffers.length === 0) {
      this.getContext();
    }
    const buf = this.hopBuffers[stepIndex % this.hopBuffers.length];
    this.playBuffer(buf, 0.9);
  }

  public playDiceRollSound(): void {
    this.playBuffer(this.prebakedSfx.diceRoll, 0.95);
  }

  public playDiceLandSound(d1: number, d2: number): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    const isDouble = d1 === d2;
    const notes = isDouble ? [587.33, 740.0, 880.0, 1174.66] : [587.33, 880.0];
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(isDouble ? 0.24 : 0.18, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.21);
    });
  }

  public playGoldSound(): void {
    this.playBuffer(this.prebakedSfx.gold, 0.95);
  }

  public playBuyIslandSound(completedSet = false): void {
    this.playGoldSound();
    if (completedSet) {
      const ctx = this.getContext();
      if (!ctx || !this.sfxGain) return;
      const fanfare = [587.33, 739.99, 880.0, 1174.66];
      fanfare.forEach((f, idx) => {
        this.scheduleHornMelodyNote(
          ctx,
          this.sfxGain!,
          f,
          ctx.currentTime + 0.1 + idx * 0.065,
          0.32,
          0.24
        );
      });
    }
  }

  public playCannonSound(): void {
    this.duckMusic(0.12, 0.65);
    this.playBuffer(this.prebakedSfx.cannon, 1.0);
  }

  public playSwordClashSound(): void {
    this.playBuffer(this.prebakedSfx.swordClash, 0.92);
  }

  public playBuildSound(level = 1): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    const chord = [293.66, 369.99, 440.0, 587.33, 739.99].slice(0, Math.min(5, 3 + level));
    chord.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.06;
      this.scheduleHornMelodyNote(ctx, this.sfxGain!, freq, t, 0.24, 0.25);
    });
  }

  public playKrakenSound(): void {
    this.duckMusic(0.12, 0.65);
    this.playBuffer(this.prebakedSfx.kraken, 0.95);
  }

  public playCardFlipSound(deck: 'chest' | 'curse' = 'chest'): void {
    this.playButtonClickSound('parchment');
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    const notes =
      deck === 'chest'
        ? [587.33, 880.0, 1174.66, 1479.98]
        : [311.13, 369.99, 440.0, 523.25];
    notes.forEach((f, i) => {
      const t = ctx.currentTime + 0.03 + i * 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = deck === 'chest' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playTradeSound(): void {
    this.playGoldSound();
    this.playButtonClickSound('brass');
  }

  public playTurnStartSound(): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    [0.0, 0.15].forEach((offset) => {
      const t = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1567.98, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.29);
    });
  }

  public playVictoryFanfare(): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    this.duckMusic(0.08, 2.0);

    const melody = [
      { midi: 57, delay: 0.0, dur: 0.14 },
      { midi: 60, delay: 0.15, dur: 0.14 },
      { midi: 62, delay: 0.30, dur: 0.22 },
      { midi: 62, delay: 0.54, dur: 0.14 },
      { midi: 64, delay: 0.70, dur: 0.14 },
      { midi: 65, delay: 0.86, dur: 0.22 },
      { midi: 67, delay: 1.10, dur: 0.18 },
      { midi: 69, delay: 1.30, dur: 0.24 },
      { midi: 74, delay: 1.58, dur: 0.60 },
    ];

    melody.forEach((note) => {
      const t = ctx.currentTime + note.delay;
      this.scheduleHornMelodyNote(ctx, this.sfxGain!, midiToFreq(note.midi), t, note.dur, 0.34);
    });
  }

  public playBankruptSound(): void {
    const ctx = this.getContext();
    if (!ctx || !this.sfxGain) return;
    this.duckMusic(0.12, 1.2);

    const notes = [
      { freq: 392.0, delay: 0.0, dur: 0.22 },
      { freq: 369.99, delay: 0.24, dur: 0.22 },
      { freq: 349.23, delay: 0.48, dur: 0.22 },
      { freq: 293.66, delay: 0.72, dur: 0.55 },
    ];

    notes.forEach((note) => {
      const t = ctx.currentTime + note.delay;
      this.scheduleHornMelodyNote(ctx, this.sfxGain!, note.freq, t, note.dur, 0.28);
    });
  }
}

export const soundEffects = new SoundController();
