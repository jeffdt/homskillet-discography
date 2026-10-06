import {
  INTERLEAVED_CHANNELS,
  TAP_DECIMATION,
  TAP_RING,
  TAP_WINDOW,
  VOICE_PAIRS,
} from '../constants';

const CONTROL_WRITE_INDEX = 0;
const CONTROL_SEQUENCE = 1;
const CONTROL_BYTES = 64;

export const STATUS_SLOTS = 8;
export const STATUS_BYTES = STATUS_SLOTS * 8;
export const STATUS_POSITION_MS = 0;
export const STATUS_CONTEXT_TIME = 1;
export const STATUS_FLAGS = 2;
export const STATUS_VOICE_COUNT = 3;
export const STATUS_SAMPLE_RATE = 4;
export const STATUS_LOAD_ID = 5;
export const STATUS_SEQUENCE = 6;
export const STATUS_TAP_WRITE_INDEX = 7;

export const FLAG_SEEKING = 1;
export const FLAG_PAUSED = 2;

/** Bytes needed to back a TapRing (also the SharedArrayBuffer size). */
export const TAP_RING_BYTES = CONTROL_BYTES + STATUS_BYTES + VOICE_PAIRS * TAP_RING * 4;

// (left + right) summed over TAP_DECIMATION frames, mapped to -1..1 per voice
const TAP_SCALE = 1 / (65536 * TAP_DECIMATION);
const RING_MASK = TAP_RING - 1;

/**
 * Per-voice ring of decimated mono samples taken before mute/solo gains, so muted voices stay
 * visible, plus playback status. Backed by an ArrayBuffer or a SharedArrayBuffer. Writers bracket
 * updates with beginWrite/endWrite (a sequence lock) so a reader on another thread can detect a
 * torn read and retry.
 */
export class TapRing {
  readonly control: Int32Array;
  readonly status: Float64Array;
  readonly samples: Float32Array;
  private readonly accumulators = new Float64Array(VOICE_PAIRS);
  private accumulated = 0;

  constructor(storage: ArrayBuffer | SharedArrayBuffer = new ArrayBuffer(TAP_RING_BYTES)) {
    this.control = new Int32Array(storage, 0, CONTROL_BYTES / 4);
    this.status = new Float64Array(storage, CONTROL_BYTES, STATUS_SLOTS);
    this.samples = new Float32Array(storage, CONTROL_BYTES + STATUS_BYTES, VOICE_PAIRS * TAP_RING);
  }

  get sequence(): number {
    return Atomics.load(this.control, CONTROL_SEQUENCE);
  }

  /** Marks the start of an update (sequence becomes odd). */
  beginWrite(): void {
    Atomics.add(this.control, CONTROL_SEQUENCE, 1);
  }

  /** Marks the end of an update (sequence becomes even). */
  endWrite(): void {
    Atomics.add(this.control, CONTROL_SEQUENCE, 1);
  }

  /** Appends frames of GME's interleaved per-voice output (heap from base) to the ring. */
  write(heap: Int16Array, base: number, frames: number): void {
    const acc = this.accumulators;
    let writeIndex = this.control[CONTROL_WRITE_INDEX];
    for (let i = 0; i < frames; i++) {
      const frame = base + i * INTERLEAVED_CHANNELS;
      for (let v = 0; v < VOICE_PAIRS; v++) acc[v] += heap[frame + 2 * v] + heap[frame + 2 * v + 1];
      if (++this.accumulated === TAP_DECIMATION) {
        const slot = writeIndex & RING_MASK;
        for (let v = 0; v < VOICE_PAIRS; v++) {
          this.samples[v * TAP_RING + slot] = acc[v] * TAP_SCALE;
          acc[v] = 0;
        }
        writeIndex = (writeIndex + 1) | 0;
        this.accumulated = 0;
      }
    }
    Atomics.store(this.control, CONTROL_WRITE_INDEX, writeIndex);
  }

  /** Copies the newest TAP_WINDOW samples of every voice into dest (voice-major, oldest first). */
  copyWindowInto(dest: Float32Array): void {
    const end = Atomics.load(this.control, CONTROL_WRITE_INDEX);
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const source = v * TAP_RING;
      const out = v * TAP_WINDOW;
      for (let i = 0; i < TAP_WINDOW; i++) {
        dest[out + i] = this.samples[source + ((end - TAP_WINDOW + i) & RING_MASK)];
      }
    }
  }

  /** Zeroes the samples, for example when a new track loads. */
  clear(): void {
    this.samples.fill(0);
    this.accumulators.fill(0);
    this.accumulated = 0;
  }

  /** Records playback status alongside the samples. */
  setStatus(
    positionMs: number,
    contextTime: number,
    flags: number,
    voiceCount: number,
    tapSampleRate: number,
    loadId: number
  ): void {
    const s = this.status;
    s[STATUS_POSITION_MS] = positionMs;
    s[STATUS_CONTEXT_TIME] = contextTime;
    s[STATUS_FLAGS] = flags;
    s[STATUS_VOICE_COUNT] = voiceCount;
    s[STATUS_SAMPLE_RATE] = tapSampleRate;
    s[STATUS_LOAD_ID] = loadId;
    s[STATUS_TAP_WRITE_INDEX] = this.control[CONTROL_WRITE_INDEX];
    s[STATUS_SEQUENCE] += 1;
  }
}
