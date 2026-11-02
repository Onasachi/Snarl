import type { SoundKind } from "~/engine";

/** C major pentatonic, two and a bit octaves. Any order of plucks sounds musical. */
const NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

interface ToneOptions {
  /** Seconds from now. */
  at?: number;
  /** Seconds. */
  duration?: number;
  gain?: number;
  attack?: number;
  type?: OscillatorType;
  /** Glides to this frequency over 60% of the duration. */
  glide?: number;
}

/**
 * The sound kit, ported from the design prototype. One lowpassed master bus, short
 * envelopes, no samples. Browsers will not start an AudioContext until the player has
 * touched something, so `init()` is called from the first pointer down and is cheap to
 * call again.
 */
class SnarlAudio {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastAt: Record<string, number> = {};

  init(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 3400;
        this.master.connect(lowpass);
        lowpass.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      // No audio on this device. Everything else still works.
    }
  }

  /** Keeps a fast drag from stacking dozens of plucks into mud. */
  private gate(key: string, ms: number): boolean {
    const now = performance.now();
    const last = this.lastAt[key];
    if (last !== undefined && now - last < ms) return false;
    this.lastAt[key] = now;
    return true;
  }

  tone(frequency: number, o: ToneOptions = {}): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime + (o.at ?? 0);
    const duration = o.duration ?? 0.8;
    const gain = o.gain ?? 0.2;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(frequency, now);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, now + duration * 0.6);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(gain, now + (o.attack ?? 0.006));
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(env);
    env.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /** One step up the pentatonic ladder. The puzzle walks `step` as crossings resolve. */
  pluck(step: number): void {
    if (!this.gate("pluck", 70)) return;
    const f = NOTES[((step % NOTES.length) + NOTES.length) % NOTES.length]!;
    this.tone(f, { type: "triangle", duration: 1.2, gain: 0.2 });
    this.tone(f * 2, { duration: 0.5, gain: 0.05 });
  }

  /** A crossing was created. Flat, low, and not a punishment. */
  muted(): void {
    if (!this.gate("muted", 120)) return;
    this.tone(146.8, { type: "triangle", duration: 0.22, gain: 0.1 });
  }

  tick(): void {
    this.tone(1500, { duration: 0.05, gain: 0.04 });
  }

  drop(): void {
    this.tone(640, { duration: 0.09, gain: 0.035 });
  }

  /** The Unfurl. */
  chord(): void {
    for (const [k, n] of [0, 2, 4, 7].entries()) {
      this.tone(NOTES[n]!, { type: "triangle", at: k * 0.09, duration: 1.8, gain: 0.13 });
    }
  }

  chime(): void {
    this.tone(NOTES[7]!, { duration: 1.4, gain: 0.08 });
    this.tone(NOTES[9]!, { at: 0.1, duration: 1.4, gain: 0.07 });
  }

  coin(): void {
    this.tone(NOTES[5]!, { duration: 0.5, gain: 0.08 });
    this.tone(NOTES[8]!, { at: 0.08, duration: 0.9, gain: 0.08 });
  }

  creature(kind: SoundKind): void {
    switch (kind) {
      case "bubble":
        this.tone(300, { glide: 900, duration: 0.24, gain: 0.16 });
        this.tone(420, { at: 0.14, glide: 1150, duration: 0.2, gain: 0.11 });
        break;
      case "chirp":
        this.tone(1800, { glide: 2600, duration: 0.12, gain: 0.07 });
        this.tone(2100, { at: 0.15, glide: 3000, duration: 0.12, gain: 0.07 });
        break;
      case "click":
        for (const at of [0, 0.07, 0.14]) {
          this.tone(2300, { type: "square", at, duration: 0.03, gain: 0.025 });
        }
        break;
      case "flutter":
        for (let k = 0; k < 6; k++) {
          this.tone(880 + k * 45, { at: k * 0.05, duration: 0.05, gain: 0.04 });
        }
        break;
      case "croak":
        this.tone(150, { type: "sawtooth", glide: 105, duration: 0.3, gain: 0.05 });
        break;
      default:
        this.tone(196, { glide: 262, duration: 0.9, gain: 0.13 });
    }
  }
}

export const audio = new SnarlAudio();

/**
 * Walks the pluck up the scale as crossings resolve, and drops back down an octave when
 * it runs off the top, so a long solve keeps rising without ever getting shrill.
 */
export class PluckLadder {
  private step = 2;

  next(): number {
    this.step = Math.min(10, Math.max(0, this.step + (Math.random() < 0.7 ? 1 : 2)));
    if (this.step >= 10) this.step = 3;
    return this.step;
  }

  reset(): void {
    this.step = 2;
  }
}
