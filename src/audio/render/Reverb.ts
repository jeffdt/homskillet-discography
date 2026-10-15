/*
 * Freeverb (Jezar at Dreampoint, public domain): eight parallel lowpass-feedback comb filters
 * per side make the dense, decaying echo pattern of a room, then four series allpass filters
 * smear it so it sounds like a wash instead of repeats. The right side's delays are a little
 * longer (STEREO_SPREAD), which makes the two sides differ and the tail sound wide.
 */

const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS_TUNING = [556, 441, 341, 225];
const STEREO_SPREAD = 23;
/** Freeverb's tunings are in samples at this rate; other rates scale them. */
const TUNING_RATE = 44100;
const INPUT_GAIN = 0.015;
const ALLPASS_FEEDBACK = 0.5;

/** How long the room rings: Freeverb's room size 0..1, mapped to comb feedback 0.7..0.98. */
export const REVERB_ROOM_SIZE = 0.82;
/** How quickly the highs die in the tail: Freeverb's damping 0..1. */
export const REVERB_DAMPING = 0.35;
/** Wet output per unit of send (Freeverb's wet scale of 3 at a wet of 1/3). */
export const REVERB_WET_GAIN = 1;
/** How long the tail keeps rendering after every send goes to zero, then the reverb rests. */
export const REVERB_TAIL_MS = 6000;

class Comb {
  private readonly buffer: Float32Array;
  private index = 0;
  private filterStore = 0;

  constructor(
    size: number,
    private readonly feedback: number,
    private readonly damp: number
  ) {
    this.buffer = new Float32Array(size);
  }

  process(input: number): number {
    const output = this.buffer[this.index];
    this.filterStore = output * (1 - this.damp) + this.filterStore * this.damp;
    this.buffer[this.index] = input + this.filterStore * this.feedback;
    if (++this.index >= this.buffer.length) this.index = 0;
    return output;
  }

  clear(): void {
    this.buffer.fill(0);
    this.filterStore = 0;
  }
}

class Allpass {
  private readonly buffer: Float32Array;
  private index = 0;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  process(input: number): number {
    const buffered = this.buffer[this.index];
    this.buffer[this.index] = input + buffered * ALLPASS_FEEDBACK;
    if (++this.index >= this.buffer.length) this.index = 0;
    return buffered - input;
  }

  clear(): void {
    this.buffer.fill(0);
  }
}

/** A stereo Freeverb room fed by a mono send, added on top of a dry stereo signal. */
export class Reverb {
  private readonly combsL: Comb[];
  private readonly combsR: Comb[];
  private readonly allpassesL: Allpass[];
  private readonly allpassesR: Allpass[];

  constructor(sampleRate: number, roomSize = REVERB_ROOM_SIZE, damping = REVERB_DAMPING) {
    const scale = sampleRate / TUNING_RATE;
    const samples = (tuning: number) => Math.max(1, Math.round(tuning * scale));
    const feedback = 0.7 + 0.28 * roomSize;
    const damp = 0.4 * damping;
    this.combsL = COMB_TUNING.map((t) => new Comb(samples(t), feedback, damp));
    this.combsR = COMB_TUNING.map((t) => new Comb(samples(t + STEREO_SPREAD), feedback, damp));
    this.allpassesL = ALLPASS_TUNING.map((t) => new Allpass(samples(t)));
    this.allpassesR = ALLPASS_TUNING.map((t) => new Allpass(samples(t + STEREO_SPREAD)));
  }

  /** Feeds send[0 .. frames) into the room and adds the wet output to left/right[offset ..). */
  process(
    send: Float32Array,
    left: Float32Array,
    right: Float32Array,
    offset: number,
    frames: number
  ): void {
    for (let i = 0; i < frames; i++) {
      const input = send[i] * INPUT_GAIN;
      let wetL = 0;
      let wetR = 0;
      for (let c = 0; c < this.combsL.length; c++) {
        wetL += this.combsL[c].process(input);
        wetR += this.combsR[c].process(input);
      }
      for (let a = 0; a < this.allpassesL.length; a++) {
        wetL = this.allpassesL[a].process(wetL);
        wetR = this.allpassesR[a].process(wetR);
      }
      left[offset + i] += wetL * REVERB_WET_GAIN;
      right[offset + i] += wetR * REVERB_WET_GAIN;
    }
  }

  /** Silences the tail at once, as after a seek or a new track. */
  clear(): void {
    this.combsL.forEach((comb) => comb.clear());
    this.combsR.forEach((comb) => comb.clear());
    this.allpassesL.forEach((allpass) => allpass.clear());
    this.allpassesR.forEach((allpass) => allpass.clear());
  }
}
