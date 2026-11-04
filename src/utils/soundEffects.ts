// High-Fidelity Symphonic & Physical Sound Design Engine for Jolly Roger's (Pirate's Plunder)
// Features:
// 1. Full 32-bar "Pirates des Caraïbes" (He's a Pirate style) 6/8 Orchestral Soundtrack Sequencer
// 2. Studio Convolution Reverb + Master Dynamics Compressor + Automatic Music Ducking
// 3. Multi-layered Physical & ASMR Sound Animations (Wood Dice, Gold Doubloons, Cannon & Splinters,
//    Cutlass Clash, Ship Wake Hop, Fortress Construction, Kraken Abyssal Roar, Parchment Cards, Tavern Trade)

type ClickVariant = 'wood' | 'brass' | 'parchment';

interface MelodyNote {
  step: number; // 0..5 within the 6/8 bar
  dur: number;  // in 8th-note steps
  midi: number; // MIDI note number (e.g., 62 = D4)
  vel?: number; // 0..1
  harmonyMidi?: number;
}

interface BarArrangement {
  bassMidi: number;       // Root note for cellos/basses/timpani (e.g. 38 = D2)
  fifthMidi: number;      // Fifth for ostinato (e.g. 45 = A2)
  chordMidis: number[];   // Pad / strings / harpsichord chord notes
  section: 'A' | 'B' | 'C' | 'D';
  cymbalCrash?: boolean;
  snareRoll?: boolean;
  melody: MelodyNote[];
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 32-Bar Symphonic Pirate Theme in D Minor (6/8 Time Signature, 138 BPM feel)
// Inspired by the driving 6/8 swashbuckling rhythm and heroic brass/string phrasing of Pirates of the Caribbean
const PIRATE_SYMPHONY_BARS: BarArrangement[] = [
  // ================= SECTION A: L'ASSAUT DU BLACK PEARL (Bars 1-8) =================
  // Bar 1: Dm (Pickup & Main Theme: A4 - C5 - D5 - D5)
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'A', cymbalCrash: true,
    melody: [
      { step: 0, dur: 2, midi: 62, vel: 0.95, harmonyMidi: 57 }, // D4
      { step: 2, dur: 1, midi: 62, vel: 0.85 },                  // D4
      { step: 3, dur: 2, midi: 62, vel: 0.95, harmonyMidi: 57 }, // D4
      { step: 5, dur: 1, midi: 64, vel: 0.90 },                  // E4
    ],
  },
  // Bar 2: Bb -> Dm (F4 - F4 - F4 - G4)
  {
    bassMidi: 34, fifthMidi: 41, chordMidis: [50, 53, 58], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 65, vel: 1.0, harmonyMidi: 58 },  // F4
      { step: 2, dur: 1, midi: 65, vel: 0.88 },                  // F4
      { step: 3, dur: 2, midi: 65, vel: 0.95, harmonyMidi: 58 }, // F4
      { step: 5, dur: 1, midi: 67, vel: 0.92 },                  // G4
    ],
  },
  // Bar 3: C (E4 - E4 - D4 - C4)
  {
    bassMidi: 36, fifthMidi: 43, chordMidis: [48, 52, 55], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 64, vel: 0.95, harmonyMidi: 60 }, // E4
      { step: 2, dur: 1, midi: 64, vel: 0.88 },                  // E4
      { step: 3, dur: 1, midi: 62, vel: 0.90 },                  // D4
      { step: 4, dur: 1, midi: 60, vel: 0.90 },                  // C4
      { step: 5, dur: 1, midi: 60, vel: 0.85 },                  // C4
    ],
  },
  // Bar 4: Dm (D4 hold + pickup A3 - C4)
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'A', snareRoll: true,
    melody: [
      { step: 0, dur: 4, midi: 62, vel: 1.0, harmonyMidi: 57 },  // D4
      { step: 4, dur: 1, midi: 57, vel: 0.85 },                  // A3
      { step: 5, dur: 1, midi: 60, vel: 0.90 },                  // C4
    ],
  },
  // Bar 5: Bb (D4 - D4 - D4 - F4)
  {
    bassMidi: 34, fifthMidi: 41, chordMidis: [50, 53, 58], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 62, vel: 0.98, harmonyMidi: 58 }, // D4
      { step: 2, dur: 1, midi: 62, vel: 0.88 },                  // D4
      { step: 3, dur: 1, midi: 62, vel: 0.92 },                  // D4
      { step: 4, dur: 1, midi: 65, vel: 0.94 },                  // F4
      { step: 5, dur: 1, midi: 67, vel: 0.96 },                  // G4
    ],
  },
  // Bar 6: Gm (G4 - G4 - G4 - A4)
  {
    bassMidi: 31, fifthMidi: 38, chordMidis: [50, 55, 58], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 67, vel: 1.0, harmonyMidi: 62 },  // G4
      { step: 2, dur: 1, midi: 67, vel: 0.90 },                  // G4
      { step: 3, dur: 1, midi: 67, vel: 0.92 },                  // G4
      { step: 4, dur: 1, midi: 69, vel: 0.96 },                  // A4
      { step: 5, dur: 1, midi: 70, vel: 0.98 },                  // Bb4
    ],
  },
  // Bar 7: A7 (A4 - G4 - E4 - D4)
  {
    bassMidi: 33, fifthMidi: 40, chordMidis: [49, 52, 57], section: 'A',
    melody: [
      { step: 0, dur: 2, midi: 69, vel: 1.0, harmonyMidi: 61 },  // A4
      { step: 2, dur: 1, midi: 67, vel: 0.92 },                  // G4
      { step: 3, dur: 2, midi: 69, vel: 0.95, harmonyMidi: 64 }, // A4
      { step: 5, dur: 1, midi: 62, vel: 0.90 },                  // D4
    ],
  },
  // Bar 8: Dm (D4 cadence + heroic pickup)
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'A', snareRoll: true,
    melody: [
      { step: 0, dur: 3, midi: 62, vel: 1.0, harmonyMidi: 57 },  // D4
      { step: 3, dur: 1, midi: 62, vel: 0.88 },                  // D4
      { step: 4, dur: 1, midi: 64, vel: 0.92 },                  // E4
      { step: 5, dur: 1, midi: 65, vel: 0.95 },                  // F4
    ],
  },

  // ================= SECTION B: TOUTES VOILES DEHORS (Bars 9-16, Octave Up + Harpsichord) =================
  // Bar 9: F Major (G4 - G4 - G4 - A4 - F4)
  {
    bassMidi: 29, fifthMidi: 36, chordMidis: [53, 57, 60], section: 'B', cymbalCrash: true,
    melody: [
      { step: 0, dur: 2, midi: 67, vel: 1.0, harmonyMidi: 60 },  // G4
      { step: 2, dur: 1, midi: 67, vel: 0.90 },                  // G4
      { step: 3, dur: 1, midi: 69, vel: 0.95 },                  // A4
      { step: 4, dur: 1, midi: 67, vel: 0.92 },                  // G4
      { step: 5, dur: 1, midi: 65, vel: 0.90 },                  // F4
    ],
  },
  // Bar 10: C Major (E4 - F4 - G4 - E4 - C4)
  {
    bassMidi: 36, fifthMidi: 43, chordMidis: [52, 55, 60], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 64, vel: 0.96, harmonyMidi: 60 }, // E4
      { step: 2, dur: 1, midi: 65, vel: 0.90 },                  // F4
      { step: 3, dur: 2, midi: 67, vel: 0.98, harmonyMidi: 60 }, // G4
      { step: 5, dur: 1, midi: 64, vel: 0.90 },                  // E4
    ],
  },
  // Bar 11: Dm (D4 - E4 - F4 - G4 - A4)
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 62, vel: 0.95, harmonyMidi: 57 }, // D4
      { step: 2, dur: 1, midi: 64, vel: 0.90 },                  // E4
      { step: 3, dur: 1, midi: 65, vel: 0.94 },                  // F4
      { step: 4, dur: 1, midi: 67, vel: 0.96 },                  // G4
      { step: 5, dur: 1, midi: 69, vel: 1.0 },                   // A4
    ],
  },
  // Bar 12: Am / C (G4 - F4 - E4)
  {
    bassMidi: 33, fifthMidi: 40, chordMidis: [52, 57, 60], section: 'B', snareRoll: true,
    melody: [
      { step: 0, dur: 3, midi: 69, vel: 1.0, harmonyMidi: 64 },  // A4
      { step: 3, dur: 2, midi: 67, vel: 0.95, harmonyMidi: 60 }, // G4
      { step: 5, dur: 1, midi: 65, vel: 0.92 },                  // F4
    ],
  },
  // Bar 13: Bb Major (Bb4 - A4 - G4 - F4)
  {
    bassMidi: 34, fifthMidi: 41, chordMidis: [53, 58, 62], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 70, vel: 1.0, harmonyMidi: 62 },  // Bb4
      { step: 2, dur: 1, midi: 69, vel: 0.94 },                  // A4
      { step: 3, dur: 2, midi: 67, vel: 0.96, harmonyMidi: 58 }, // G4
      { step: 5, dur: 1, midi: 65, vel: 0.92 },                  // F4
    ],
  },
  // Bar 14: F Major (A4 - G4 - F4 - E4)
  {
    bassMidi: 29, fifthMidi: 36, chordMidis: [53, 57, 60], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 69, vel: 0.98, harmonyMidi: 60 }, // A4
      { step: 2, dur: 1, midi: 67, vel: 0.92 },                  // G4
      { step: 3, dur: 2, midi: 65, vel: 0.95, harmonyMidi: 57 }, // F4
      { step: 5, dur: 1, midi: 64, vel: 0.90 },                  // E4
    ],
  },
  // Bar 15: Gm -> A7 (G4 - F4 - E4 - C#4)
  {
    bassMidi: 31, fifthMidi: 38, chordMidis: [50, 55, 58], section: 'B',
    melody: [
      { step: 0, dur: 2, midi: 67, vel: 0.98, harmonyMidi: 58 }, // G4
      { step: 2, dur: 1, midi: 65, vel: 0.94 },                  // F4
      { step: 3, dur: 2, midi: 64, vel: 0.96, harmonyMidi: 57 }, // E4
      { step: 5, dur: 1, midi: 61, vel: 0.92 },                  // C#4
    ],
  },
  // Bar 16: A7 -> Dm resolution
  {
    bassMidi: 33, fifthMidi: 40, chordMidis: [49, 55, 57], section: 'B', snareRoll: true,
    melody: [
      { step: 0, dur: 3, midi: 62, vel: 1.0, harmonyMidi: 57 },  // D4
      { step: 3, dur: 3, midi: 69, vel: 0.98, harmonyMidi: 61 }, // A4
    ],
  },

  // ================= SECTION C: TEMPÊTE & CANONADE (Bars 17-24, Dramatic Naval Bridge) =================
  // Bar 17: Dm Staccato Ostinato Climber
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 53, 57], section: 'C', cymbalCrash: true,
    melody: [
      { step: 0, dur: 2, midi: 62, vel: 0.96, harmonyMidi: 57 }, // D4
      { step: 2, dur: 1, midi: 65, vel: 0.92 },                  // F4
      { step: 3, dur: 2, midi: 69, vel: 1.0, harmonyMidi: 62 },  // A4
      { step: 5, dur: 1, midi: 67, vel: 0.92 },                  // G4
    ],
  },
  // Bar 18: Gm
  {
    bassMidi: 31, fifthMidi: 38, chordMidis: [50, 55, 58], section: 'C',
    melody: [
      { step: 0, dur: 2, midi: 70, vel: 1.0, harmonyMidi: 62 },  // Bb4
      { step: 2, dur: 1, midi: 69, vel: 0.92 },                  // A4
      { step: 3, dur: 2, midi: 67, vel: 0.96, harmonyMidi: 58 }, // G4
      { step: 5, dur: 1, midi: 65, vel: 0.90 },                  // F4
    ],
  },
  // Bar 19: C Major
  {
    bassMidi: 36, fifthMidi: 43, chordMidis: [48, 55, 60], section: 'C',
    melody: [
      { step: 0, dur: 2, midi: 64, vel: 0.96, harmonyMidi: 60 }, // E4
      { step: 2, dur: 1, midi: 67, vel: 0.92 },                  // G4
      { step: 3, dur: 2, midi: 72, vel: 1.0, harmonyMidi: 64 },  // C5
      { step: 5, dur: 1, midi: 70, vel: 0.94 },                  // Bb4
    ],
  },
  // Bar 20: F Major
  {
    bassMidi: 29, fifthMidi: 36, chordMidis: [53, 57, 60], section: 'C', snareRoll: true,
    melody: [
      { step: 0, dur: 3, midi: 69, vel: 1.0, harmonyMidi: 60 },  // A4
      { step: 3, dur: 2, midi: 65, vel: 0.95, harmonyMidi: 57 }, // F4
      { step: 5, dur: 1, midi: 67, vel: 0.92 },                  // G4
    ],
  },
  // Bar 21: Bb Major
  {
    bassMidi: 34, fifthMidi: 41, chordMidis: [50, 58, 62], section: 'C',
    melody: [
      { step: 0, dur: 2, midi: 70, vel: 1.0, harmonyMidi: 62 },  // Bb4
      { step: 2, dur: 1, midi: 72, vel: 0.94 },                  // C5
      { step: 3, dur: 2, midi: 74, vel: 1.0, harmonyMidi: 65 },  // D5
      { step: 5, dur: 1, midi: 70, vel: 0.94 },                  // Bb4
    ],
  },
  // Bar 22: Gm
  {
    bassMidi: 31, fifthMidi: 38, chordMidis: [50, 55, 58], section: 'C',
    melody: [
      { step: 0, dur: 2, midi: 69, vel: 0.98, harmonyMidi: 62 }, // A4
      { step: 2, dur: 1, midi: 67, vel: 0.92 },                  // G4
      { step: 3, dur: 2, midi: 65, vel: 0.96, harmonyMidi: 58 }, // F4
      { step: 5, dur: 1, midi: 67, vel: 0.92 },                  // G4
    ],
  },
  // Bar 23: Asus4 -> A7
  {
    bassMidi: 33, fifthMidi: 40, chordMidis: [49, 55, 57], section: 'C',
    melody: [
      { step: 0, dur: 3, midi: 69, vel: 1.0, harmonyMidi: 62 },  // A4
      { step: 3, dur: 3, midi: 69, vel: 1.0, harmonyMidi: 61 },  // A4 (with C#4 harmony)
    ],
  },
  // Bar 24: A7 Dramatic Timpani & Snare Pickup to Grand Finale
  {
    bassMidi: 33, fifthMidi: 40, chordMidis: [49, 55, 61], section: 'C', snareRoll: true,
    melody: [
      { step: 0, dur: 3, midi: 73, vel: 1.0, harmonyMidi: 64 },  // C#5
      { step: 3, dur: 1, midi: 69, vel: 0.95 },                  // A4
      { step: 4, dur: 1, midi: 72, vel: 0.98 },                  // C5
      { step: 5, dur: 1, midi: 73, vel: 1.0 },                   // C#5
    ],
  },

  // ================= SECTION D: TRIOMPHE DES FLIBUSTIERS (Bars 25-32, High Octave Climax) =================
  // Bar 25: Dm High Climax (D5 - D5 - D5 - E5)
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 57, 62], section: 'D', cymbalCrash: true,
    melody: [
      { step: 0, dur: 2, midi: 74, vel: 1.0, harmonyMidi: 69 },  // D5
      { step: 2, dur: 1, midi: 74, vel: 0.94 },                  // D5
      { step: 3, dur: 2, midi: 74, vel: 1.0, harmonyMidi: 69 },  // D5
      { step: 5, dur: 1, midi: 76, vel: 0.96 },                  // E5
    ],
  },
  // Bar 26: Bb Major (F5 - F5 - F5 - G5)
  {
    bassMidi: 34, fifthMidi: 41, chordMidis: [53, 58, 62], section: 'D',
    melody: [
      { step: 0, dur: 2, midi: 77, vel: 1.0, harmonyMidi: 70 },  // F5
      { step: 2, dur: 1, midi: 77, vel: 0.94 },                  // F5
      { step: 3, dur: 2, midi: 77, vel: 1.0, harmonyMidi: 70 },  // F5
      { step: 5, dur: 1, midi: 79, vel: 0.98 },                  // G5
    ],
  },
  // Bar 27: C Major (E5 - E5 - D5 - C5)
  {
    bassMidi: 36, fifthMidi: 43, chordMidis: [52, 55, 60], section: 'D',
    melody: [
      { step: 0, dur: 2, midi: 76, vel: 1.0, harmonyMidi: 67 },  // E5
      { step: 2, dur: 1, midi: 76, vel: 0.92 },                  // E5
      { step: 3, dur: 1, midi: 74, vel: 0.95 },                  // D5
      { step: 4, dur: 1, midi: 72, vel: 0.95 },                  // C5
      { step: 5, dur: 1, midi: 72, vel: 0.92 },                  // C5
    ],
  },
  // Bar 28: Dm -> F (D5 hold + A4 - C5 pickup)
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 57, 62], section: 'D', snareRoll: true,
    melody: [
      { step: 0, dur: 4, midi: 74, vel: 1.0, harmonyMidi: 65 },  // D5
      { step: 4, dur: 1, midi: 69, vel: 0.92 },                  // A4
      { step: 5, dur: 1, midi: 72, vel: 0.95 },                  // C5
    ],
  },
  // Bar 29: Gm (Bb5/G5 climax)
  {
    bassMidi: 31, fifthMidi: 38, chordMidis: [50, 55, 58], section: 'D', cymbalCrash: true,
    melody: [
      { step: 0, dur: 2, midi: 74, vel: 1.0, harmonyMidi: 67 },  // D5
      { step: 2, dur: 1, midi: 76, vel: 0.94 },                  // E5
      { step: 3, dur: 2, midi: 77, vel: 1.0, harmonyMidi: 70 },  // F5
      { step: 5, dur: 1, midi: 79, vel: 0.98 },                  // G5
    ],
  },
  // Bar 30: Dm/A (A5 - G5 - F5 - E5)
  {
    bassMidi: 33, fifthMidi: 45, chordMidis: [50, 57, 62], section: 'D',
    melody: [
      { step: 0, dur: 2, midi: 81, vel: 1.0, harmonyMidi: 74 },  // A5
      { step: 2, dur: 1, midi: 79, vel: 0.96 },                  // G5
      { step: 3, dur: 2, midi: 77, vel: 0.98, harmonyMidi: 69 }, // F5
      { step: 5, dur: 1, midi: 76, vel: 0.94 },                  // E5
    ],
  },
  // Bar 31: A7 (D5 - E5 - C#5 - A4)
  {
    bassMidi: 33, fifthMidi: 40, chordMidis: [49, 55, 61], section: 'D',
    melody: [
      { step: 0, dur: 2, midi: 74, vel: 0.98, harmonyMidi: 65 }, // D5
      { step: 2, dur: 1, midi: 76, vel: 0.95 },                  // E5
      { step: 3, dur: 2, midi: 73, vel: 1.0, harmonyMidi: 64 },  // C#5
      { step: 5, dur: 1, midi: 69, vel: 0.95 },                  // A4
    ],
  },
  // Bar 32: Dm Grand Resolution + Pickup back to Bar 1
  {
    bassMidi: 38, fifthMidi: 45, chordMidis: [50, 57, 62], section: 'D', cymbalCrash: true, snareRoll: true,
    melody: [
      { step: 0, dur: 4, midi: 74, vel: 1.0, harmonyMidi: 62 },  // D5 + D4
      { step: 4, dur: 1, midi: 57, vel: 0.90 },                  // A3 pickup
      { step: 5, dur: 1, midi: 60, vel: 0.95 },                  // C4 pickup
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
  private reverbNode: ConvolverNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private musicEnabled = true;
  private isMusicPlaying = false;
  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private currentBar = 0;
  private currentEighth = 0; // 0..5 in 6/8 bar
  private listeners: Array<() => void> = [];
  private unlockBound = false;

  // 6/8 tempo: 138 BPM dotted-quarter feel -> 1 eighth-note step = ~0.145s
  private readonly STEP_DURATION = 0.145;

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
        this.ctx = new AudioCtx();
        this.setupAudioGraph(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupAudioGraph(ctx: AudioContext): void {
    // Master Limiter / Compressor for cohesive symphonic & SFX punch
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(4.0, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.18, ctx.currentTime);

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.92, ctx.currentTime);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.95, ctx.currentTime);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.34 : 0.0001, ctx.currentTime);

    // Concert Hall / Caribbean Sea Stereo Convolution Reverb
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this.createConcertHallImpulse(ctx, 1.55, 2.6);

    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.setValueAtTime(0.26, ctx.currentTime);

    this.sfxGain.connect(this.masterGain);
    this.sfxGain.connect(this.reverbSend);

    this.musicGain.connect(this.masterGain);
    this.musicGain.connect(this.reverbSend);

    this.reverbSend.connect(this.reverbNode);
    this.reverbNode.connect(this.masterGain);

    this.masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    // Pre-generate white & pink noise buffers for physical foley (waves, cannons, splinters, sails)
    this.noiseBuffer = this.createWhiteNoiseBuffer(ctx, 2.0);
    this.pinkNoiseBuffer = this.createPinkNoiseBuffer(ctx, 2.0);
  }

  private createConcertHallImpulse(
    ctx: AudioContext,
    durationSeconds: number,
    decayRate: number
  ): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Early reflections + warm diffuse tail
        const early = i < ctx.sampleRate * 0.045 && i % 190 < 12 ? 0.45 : 0;
        const env = Math.pow(1 - t, decayRate);
        data[i] = ((Math.random() * 2 - 1) * env * 0.65 + early * (Math.random() * 2 - 1));
      }
    }
    return impulse;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private createPinkNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }
    return buf;
  }

  /**
   * Momentarily ducks the background music when an explosive SFX (cannon, fanfare, kraken) plays
   */
  private duckMusic(duckGain = 0.12, holdSeconds = 0.65): void {
    if (!this.ctx || !this.musicGain || !this.musicEnabled || this.muted) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(duckGain, now + 0.03);
    this.musicGain.gain.linearRampToValueAtTime(0.34, now + holdSeconds + 0.45);
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
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.92, now, 0.03);
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

    const ctx = this.getContext();
    if (ctx && this.musicGain) {
      const now = ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.34 : 0.0001, now, 0.06);
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

  // ============================================================================
  // SYMPHONIC "PIRATES DES CARAÏBES" (6/8, Dm) BACKGROUND MUSIC SEQUENCER
  // ============================================================================

  public startBackgroundMusic(): void {
    if (this.muted || !this.musicEnabled || this.isMusicPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isMusicPlaying = true;
    this.nextStepTime = ctx.currentTime + 0.06;
    if (this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
      this.musicGain.gain.setTargetAtTime(0.34, ctx.currentTime, 0.15);
    }

    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
    }
    this.schedulerTimer = window.setInterval(() => this.scheduleMusicSteps(), 28);
    this.notifyListeners();
  }

  public stopBackgroundMusic(): void {
    this.isMusicPlaying = false;
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.notifyListeners();
  }

  private scheduleMusicSteps(): void {
    if (!this.isMusicPlaying || this.muted || !this.musicEnabled || !this.ctx) return;
    const lookahead = 0.14;
    while (this.nextStepTime < this.ctx.currentTime + lookahead) {
      this.scheduleSingleEighthNote(this.currentBar, this.currentEighth, this.nextStepTime);
      this.nextStepTime += this.STEP_DURATION;
      this.currentEighth++;
      if (this.currentEighth >= 6) {
        this.currentEighth = 0;
        this.currentBar = (this.currentBar + 1) % PIRATE_SYMPHONY_BARS.length;
      }
    }
  }

  private scheduleSingleEighthNote(barIndex: number, step: number, time: number): void {
    const ctx = this.ctx;
    const out = this.musicGain;
    if (!ctx || !out) return;

    const bar = PIRATE_SYMPHONY_BARS[barIndex];

    // 1. Driving 6/8 Spiccato Cellos & Double Bass Ostinato (Pulses 0, 1, 2, 3, 4, 5)
    // Signature Pirates rhythm: heavy downbeats on 0 and 3, crisp pickups on 2 and 5
    const accentPattern = [1.0, 0.48, 0.78, 0.92, 0.52, 0.82];
    const bassMidi = step === 3 || step === 5 ? bar.fifthMidi : bar.bassMidi;
    this.triggerSpiccatoCello(ctx, out, midiToFreq(bassMidi), time, accentPattern[step]);

    // 2. Harpsichord / Pirate Accordion Counter-Arpeggio on 8th-note grid
    const arpMidi = bar.chordMidis[step % bar.chordMidis.length];
    const arpOctaveShift = bar.section === 'B' || bar.section === 'D' ? 12 : 0;
    if (step === 0 || step === 2 || step === 3 || step === 4 || step === 5) {
      this.triggerPirateHarpsichord(
        ctx,
        out,
        midiToFreq(arpMidi + arpOctaveShift),
        time,
        step === 0 || step === 3 ? 0.22 : 0.14
      );
    }

    // 3. Warm Sustained String Pad & Choir Swell on Beat 0 of each bar
    if (step === 0) {
      bar.chordMidis.forEach((m, idx) => {
        this.triggerStringPadVoice(
          ctx,
          out,
          midiToFreq(m),
          time,
          this.STEP_DURATION * 5.8,
          0.075,
          (idx - 1) * 0.35
        );
      });
    }

    // 4. Heroic Lead Melody (French Horns + Violins + Harmony Thirds/Sixths)
    for (const note of bar.melody) {
      if (note.step === step) {
        const durSec = note.dur * this.STEP_DURATION;
        const vel = note.vel ?? 0.9;
        this.triggerHeroicHornAndViolin(
          ctx,
          out,
          midiToFreq(note.midi),
          time,
          durSec,
          vel * 0.34,
          -0.18
        );
        if (note.harmonyMidi !== undefined) {
          this.triggerHeroicHornAndViolin(
            ctx,
            out,
            midiToFreq(note.harmonyMidi),
            time,
            durSec,
            vel * 0.22,
            0.25
          );
        }
      }
    }

    // 5. Symphonic Percussion (Timpani, Gran Cassa, Naval Snare, Crash Cymbals)
    if (step === 0) {
      // Deep Concert Bass Drum + Tuned Timpani on Beat 1
      this.triggerOrchestralTimpani(ctx, out, midiToFreq(bar.bassMidi), time, 0.42);
      if (bar.cymbalCrash) {
        this.triggerOrchestralCymbal(ctx, out, time, 0.22);
      }
    } else if (step === 3) {
      // Secondary Timpani / Bass hit on Beat 4 (middle of 6/8 bar)
      this.triggerOrchestralTimpani(ctx, out, midiToFreq(bar.fifthMidi - 12), time, 0.32);
      this.triggerNavalSnare(ctx, out, time, 0.18);
    } else if (step === 2 || step === 5) {
      // Swashbuckling off-beat snare pickup
      this.triggerNavalSnare(ctx, out, time, step === 5 ? 0.16 : 0.10);
    }

    if (bar.snareRoll && (step === 4 || step === 5)) {
      // Rapid military snare roll at end of 4-bar phrase
      this.triggerNavalSnare(ctx, out, time + this.STEP_DURATION * 0.5, 0.15);
    }
  }

  private triggerSpiccatoCello(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    velocity: number
  ): void {
    const oscSaw = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    oscSaw.type = 'sawtooth';
    oscSaw.frequency.setValueAtTime(freq, time);

    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(freq * 0.5, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(2.2, time);
    filter.frequency.setValueAtTime(freq * 6.5, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2.1, time + 0.11);

    const peak = 0.26 * velocity;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.135);

    oscSaw.connect(filter);
    oscSub.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    oscSaw.start(time);
    oscSub.start(time);
    oscSaw.stop(time + 0.14);
    oscSub.stop(time + 0.14);
  }

  private triggerHeroicHornAndViolin(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    durSec: number,
    volume: number,
    panValue = 0
  ): void {
    const oscHorn = ctx.createOscillator();
    const oscViolin = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    oscHorn.type = 'sawtooth';
    oscHorn.frequency.setValueAtTime(freq, time);
    oscHorn.detune.setValueAtTime(-5, time);

    oscViolin.type = 'sawtooth';
    oscViolin.frequency.setValueAtTime(freq, time);
    oscViolin.detune.setValueAtTime(6, time);

    // Warm brass/string body filter with expressive swell
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.8, time);
    filter.frequency.setValueAtTime(freq * 2.2, time);
    filter.frequency.exponentialRampToValueAtTime(
      Math.min(5200, freq * 5.2),
      time + Math.min(0.06, durSec * 0.35)
    );
    filter.frequency.exponentialRampToValueAtTime(freq * 2.4, time + durSec);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.018);
    gain.gain.setValueAtTime(volume * 0.88, time + Math.max(0.025, durSec * 0.65));
    gain.gain.exponentialRampToValueAtTime(0.0008, time + durSec + 0.04);

    oscHorn.connect(filter);
    oscViolin.connect(filter);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, time);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(dest);
    } else {
      filter.connect(gain);
      gain.connect(dest);
    }

    oscHorn.start(time);
    oscViolin.start(time);
    oscHorn.stop(time + durSec + 0.05);
    oscViolin.stop(time + durSec + 0.05);
  }

  private triggerPirateHarpsichord(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.5, time);
    filter.Q.setValueAtTime(1.6, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume * 0.45, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  private triggerStringPadVoice(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    durSec: number,
    volume: number,
    panValue = 0
  ): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1350, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + durSec);

    osc.connect(filter);
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panValue, time);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(dest);
    } else {
      filter.connect(gain);
      gain.connect(dest);
    }

    osc.start(time);
    osc.stop(time + durSec + 0.02);
  }

  private triggerOrchestralTimpani(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.48, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.065);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.92, time + 0.26);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.28);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.29);
  }

  private triggerNavalSnare(
    ctx: AudioContext,
    dest: AudioNode,
    time: number,
    volume: number
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1950, time);
    filter.Q.setValueAtTime(1.1, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.095);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start(time, Math.random() * 0.5, 0.11);
  }

  private triggerOrchestralCymbal(
    ctx: AudioContext,
    dest: AudioNode,
    time: number,
    volume: number
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5200, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, time + 0.85);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    src.start(time, 0, 0.9);
  }

  // ============================================================================
  // PHYSICAL & SATISFYING GAME SOUND ANIMATIONS (SFX)
  // ============================================================================

  private getSfxDestination(ctx: AudioContext): AudioNode {
    return this.sfxGain ?? ctx.destination;
  }

  /**
   * Tactile UI click: wooden plank knock, brass latch, or parchment rustle
   */
  public playButtonClickSound(variant: ClickVariant = 'wood'): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    if (variant === 'brass') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1320, now);
      osc.frequency.exponentialRampToValueAtTime(2640, now + 0.055);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.08);
      return;
    }

    if (variant === 'parchment' && this.pinkNoiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(1.8, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      src.start(now, Math.random() * 0.4, 0.1);
      return;
    }

    // Warm oak wood knock
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(135, now + 0.045);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Ship hop from island to island:
   * - Water wake splash (filtered pink noise)
   * - Ascending D-Dorian pirate marimba/pizzicato note for musical ASMR progression
   */
  public playHopSound(stepIndex = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    // 1. Ascending D-Dorian scale (D4, E4, F4, G4, A4, B4, C5, D5)
    const dorianMidis = [62, 64, 65, 67, 69, 71, 72, 74];
    const midi = dorianMidis[stepIndex % dorianMidis.length];
    const freq = midiToFreq(midi);

    // Wooden marimba + pizzicato pluck
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc1.frequency.exponentialRampToValueAtTime(freq * 1.015, now + 0.11);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.14, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain);
    osc2.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(out);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.16);
    osc2.stop(now + 0.16);

    // 2. Crisp ocean wave splash / sail ripple
    if (this.pinkNoiseBuffer) {
      const splash = ctx.createBufferSource();
      splash.buffer = this.pinkNoiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950 + (stepIndex % 6) * 140, now);
      filter.frequency.exponentialRampToValueAtTime(1850, now + 0.11);
      filter.Q.setValueAtTime(1.8, now);

      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.001, now);
      sGain.gain.linearRampToValueAtTime(0.22, now + 0.018);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      splash.connect(filter);
      filter.connect(sGain);
      sGain.connect(out);
      splash.start(now, Math.random() * 0.6, 0.14);
    }
  }

  /**
   * 3D Pirate Dice Roll:
   * Leather cup shake + 8 realistic bone/wood dice impacts across the oak deck
   */
  public playDiceRollSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);

    const hits = [0.0, 0.055, 0.115, 0.185, 0.265, 0.355, 0.455, 0.57];
    hits.forEach((offset, idx) => {
      const now = ctx.currentTime + offset;

      // Dual woody resonant impact (oak plank + bone die clack)
      const oscWood = ctx.createOscillator();
      const oscBone = ctx.createOscillator();
      const gain = ctx.createGain();

      const pitch = 520 + idx * 65 + (idx % 2) * 95;
      oscWood.type = 'triangle';
      oscWood.frequency.setValueAtTime(pitch, now);
      oscWood.frequency.exponentialRampToValueAtTime(pitch * 0.48, now + 0.042);

      oscBone.type = 'sine';
      oscBone.frequency.setValueAtTime(pitch * 2.35, now);
      oscBone.frequency.exponentialRampToValueAtTime(pitch * 1.6, now + 0.028);

      const vol = Math.max(0.09, 0.34 - idx * 0.028);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      oscWood.connect(gain);
      oscBone.connect(gain);
      gain.connect(out);

      oscWood.start(now);
      oscBone.start(now);
      oscWood.stop(now + 0.055);
      oscBone.stop(now + 0.055);
    });
  }

  /**
   * Dice settle reveal sound (with extra sparkling chord on Doubles!)
   */
  public playDiceLandSound(d1: number, d2: number): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    const isDouble = d1 === d2;
    const notes = isDouble ? [587.33, 740.0, 880.0, 1174.66] : [587.33, 880.0];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(isDouble ? 0.26 : 0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  /**
   * Satisfying Gold Doubloon Cascade:
   * Shimmering metallic coin clinks + warm harmonic treasure chime
   */
  public playGoldSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);

    // 1. Harmonic treasure arpeggio (D Major / A Major bright bells)
    const bellNotes = [1174.66, 1479.98, 1760.0, 2349.32, 2959.96]; // D6, F#6, A6, D7, F#7
    bellNotes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.048;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      // Metallic gold coin inharmonic overtone (2.76x bell partial)
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.42, now);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.22, now);
      osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);

      osc1.connect(gain);
      osc2.connect(osc2Gain);
      osc2Gain.connect(gain);
      gain.connect(out);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.29);
      osc2.stop(now + 0.29);
    });
  }

  /**
   * Island Conquest Sound:
   * Flag unfurl + anchor thud + gold coins (+ heroic brass chord when completing a color set!)
   */
  public playBuyIslandSound(completedSet = false): void {
    this.playGoldSound();
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    // Flag unfurl whoosh
    if (this.pinkNoiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.pinkNoiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.28, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      src.connect(filter);
      filter.connect(g);
      g.connect(out);
      src.start(now, 0, 0.24);
    }

    if (completedSet) {
      // Heroic D-major brass fanfare for completing the set
      const fanfare = [587.33, 739.99, 880.0, 1174.66];
      fanfare.forEach((f, idx) => {
        this.triggerHeroicHornAndViolin(ctx, out, f, now + 0.12 + idx * 0.07, 0.38, 0.26, 0);
      });
    }
  }

  /**
   * Naval Cannon & Culverin Detonation:
   * 1. Fuse sizzle
   * 2. Deep sub-bass cannon blast (150Hz -> 24Hz) + gunpowder explosion roar
   * 3. Whistling cannonball flight + splintering ship wood & splash
   */
  public playCannonSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    this.duckMusic(0.10, 0.75);

    // 1. Sub-bass chest punch (155Hz -> 24Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(155, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.48);

    subGain.gain.setValueAtTime(0.75, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(now);
    subOsc.stop(now + 0.54);

    // 2. Gunpowder blast roar (lowpass-swept noise)
    if (this.noiseBuffer) {
      const blast = ctx.createBufferSource();
      blast.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1450, now);
      filter.frequency.exponentialRampToValueAtTime(85, now + 0.72);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.78, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      blast.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(out);
      blast.start(now, 0, 0.78);
    }

    // 3. Cannonball whistle + timber splinter crunches at impact (+0.28s)
    const whistle = ctx.createOscillator();
    const wGain = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1150, now + 0.05);
    whistle.frequency.exponentialRampToValueAtTime(340, now + 0.34);

    wGain.gain.setValueAtTime(0.001, now + 0.05);
    wGain.gain.linearRampToValueAtTime(0.14, now + 0.12);
    wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    whistle.connect(wGain);
    wGain.connect(out);
    whistle.start(now + 0.05);
    whistle.stop(now + 0.36);

    // Wood splinters on impact
    [0.28, 0.33, 0.39].forEach((delay, idx) => {
      const t = now + delay;
      const crack = ctx.createOscillator();
      const cGain = ctx.createGain();
      crack.type = 'sawtooth';
      crack.frequency.setValueAtTime(480 - idx * 90, t);
      crack.frequency.exponentialRampToValueAtTime(110, t + 0.055);
      cGain.gain.setValueAtTime(0.28, t);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      crack.connect(cGain);
      cGain.connect(out);
      crack.start(t);
      crack.stop(t + 0.065);
    });
  }

  /**
   * Naval Battle Boarding Trigger:
   * Metallic cutlass blades clashing (CLING-CLANG!) + boarding brass horn
   */
  public playSwordClashSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    // Two rapid steel blade clashes
    [0.0, 0.14].forEach((offset, idx) => {
      const t = now + offset;
      const freqs = idx === 0 ? [2150, 3420, 4890] : [2480, 3860, 5320];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.16);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.18);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.19);
      });
    });

    // Dramatic D-minor boarding horn call
    this.triggerHeroicHornAndViolin(ctx, out, 293.66, now + 0.04, 0.35, 0.32, 0);
  }

  /**
   * Fortress Construction / Island Upgrade:
   * Hammer strikes on nails + stone block thud + ascending architectural fanfare
   */
  public playBuildSound(level = 1): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);

    // 1. Three crisp hammer anvil/nail strikes
    [0.0, 0.11, 0.22].forEach((offset, idx) => {
      const t = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880 + idx * 180, t);
      osc.frequency.exponentialRampToValueAtTime(240, t + 0.055);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.24, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.065);
    });

    // 2. Ascending architectural chord (grander for higher fortress levels)
    const chord = [293.66, 369.99, 440.0, 587.33, 739.99].slice(0, Math.min(5, 3 + level));
    chord.forEach((freq, idx) => {
      const now = ctx.currentTime + 0.08 + idx * 0.065;
      this.triggerHeroicHornAndViolin(ctx, out, freq, now, 0.26, 0.26, (idx - 1.5) * 0.2);
    });
  }

  /**
   * Kraken Ambush / Prison / Curse Impact:
   * Abyssal monster brass growl + whirlpool water surge + dungeon iron gate clang
   */
  public playKrakenSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    this.duckMusic(0.12, 0.75);

    // 1. Deep Leviathan growl (detuned sawtooth pair + lowpass sweep)
    [-8, 8].forEach((detune) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.detune.setValueAtTime(detune, now);
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.linearRampToValueAtTime(88, now + 0.28);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.75);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.75);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(now);
      osc.stop(now + 0.8);
    });

    // 2. Heavy iron prison gate slam at +0.25s
    const clangFreqs = [620, 1140, 1890, 2760];
    clangFreqs.forEach((f) => {
      const t = now + 0.24;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  /**
   * Card Modal Reveal (Coffre au Trésor vs Malédiction des Mers)
   */
  public playCardFlipSound(deck: 'chest' | 'curse' = 'chest'): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    this.playButtonClickSound('parchment');

    if (deck === 'chest') {
      // Magical golden chest shimmer
      const notes = [587.33, 880.0, 1174.66, 1479.98];
      notes.forEach((f, i) => {
        const t = now + 0.04 + i * 0.05;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.26);
      });
    } else {
      // Mysterious Sea Curse diminished chord
      const notes = [311.13, 369.99, 440.0, 523.25]; // Eb4, F#4, A4, C5
      notes.forEach((f, i) => {
        const t = now + 0.04 + i * 0.055;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.2, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + 0.34);
      });
    }
  }

  /**
   * Tavern Trade Agreement Sound:
   * Tankards clinking ("Tchin!") + coin pouch
   */
  public playTradeSound(): void {
    this.playGoldSound();
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    // Warm glass/pewter mug clink
    [784.0, 1046.5].forEach((f, idx) => {
      const t = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.26, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  /**
   * Ship's Bell double-chime on new Human Turn
   */
  public playTurnStartSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    [0.0, 0.16].forEach((offset) => {
      const t = now + offset;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1567.98, t); // G6 ship bell
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(3135.96, t);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);

      osc1.connect(g);
      osc2.connect(g);
      g.connect(out);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.34);
      osc2.stop(t + 0.34);
    });
  }

  /**
   * Grand Symphonic Victory Fanfare (Pirates of the Caribbean Theme Finale)
   */
  public playVictoryFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    this.duckMusic(0.08, 2.2);

    const melody = [
      { midi: 57, harm: 50, delay: 0.0, dur: 0.14 },  // A3
      { midi: 60, harm: 52, delay: 0.15, dur: 0.14 }, // C4
      { midi: 62, harm: 57, delay: 0.30, dur: 0.22 }, // D4
      { midi: 62, harm: 57, delay: 0.54, dur: 0.14 }, // D4
      { midi: 64, harm: 57, delay: 0.70, dur: 0.14 }, // E4
      { midi: 65, harm: 58, delay: 0.86, dur: 0.22 }, // F4
      { midi: 67, harm: 60, delay: 1.10, dur: 0.18 }, // G4
      { midi: 69, harm: 61, delay: 1.30, dur: 0.24 }, // A4
      { midi: 74, harm: 62, delay: 1.58, dur: 0.65 }, // D5 Grand Climax
    ];

    melody.forEach((note) => {
      const t = now + note.delay;
      this.triggerHeroicHornAndViolin(ctx, out, midiToFreq(note.midi), t, note.dur, 0.38, -0.15);
      this.triggerHeroicHornAndViolin(ctx, out, midiToFreq(note.harm), t, note.dur, 0.26, 0.2);
    });

    this.triggerOrchestralTimpani(ctx, out, midiToFreq(38), now + 0.3, 0.5);
    this.triggerOrchestralTimpani(ctx, out, midiToFreq(34), now + 0.86, 0.5);
    this.triggerOrchestralTimpani(ctx, out, midiToFreq(38), now + 1.58, 0.65);
    this.triggerOrchestralCymbal(ctx, out, now + 1.58, 0.32);
  }

  /**
   * Bankrupt / Shipwreck Dirge
   */
  public playBankruptSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const out = this.getSfxDestination(ctx);
    const now = ctx.currentTime;

    this.duckMusic(0.12, 1.4);

    const notes = [
      { freq: 392.0, delay: 0.0, dur: 0.24 },   // G4
      { freq: 369.99, delay: 0.26, dur: 0.24 }, // F#4
      { freq: 349.23, delay: 0.52, dur: 0.24 }, // F4
      { freq: 293.66, delay: 0.78, dur: 0.60 }, // D4
    ];

    notes.forEach((note) => {
      const t = now + note.delay;
      this.triggerHeroicHornAndViolin(ctx, out, note.freq, t, note.dur, 0.32, 0);
    });
  }
}

export const soundEffects = new SoundController();
