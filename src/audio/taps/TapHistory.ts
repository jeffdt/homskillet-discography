import { TAP_HISTORY, TAP_RING, TAP_WINDOW, VOICE_PAIRS } from '../constants';
import { TapRing } from './TapRing';
import { TapSnapshot } from './TapSnapshot';

const HISTORY_MASK = TAP_HISTORY - 1;
const RING_MASK = TAP_RING - 1;

/** Ring reads stay this far behind the writer so a concurrent SharedArrayBuffer write never reaches them. */
export const RING_INGEST_LIMIT = TAP_RING - TAP_WINDOW;

/**
 * A continuous per-voice history of tap samples on the main thread, longer than one snapshot, so
 * analysis can look back far enough for the constant-Q transform and for latency alignment. Each
 * ingest appends only the samples that are new since the last one; samples that were never
 * delivered read as silence. A new loadId clears it.
 */
export class TapHistory {
  /** Voice-major rings of TAP_HISTORY samples, -1..1. */
  readonly samples = new Float32Array(VOICE_PAIRS * TAP_HISTORY);
  /** Absolute index one past the newest sample (wraps like int32). */
  writeIndex = 0;
  /** AudioContext time at which the newest sample is heard. */
  newestContextTime = 0;
  /** Tap sample rate in Hz; 0 before the first status. */
  sampleRate = 0;
  voiceCount = 0;
  loadId = -1;

  /** Appends the new samples carried in a pooled snapshot's window. */
  ingestSnapshot(snapshot: TapSnapshot): void {
    const count = this.advance(snapshot, TAP_WINDOW);
    if (count === 0) return;
    const start = (this.writeIndex - count) | 0;
    const window = snapshot.voiceData;
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const out = v * TAP_HISTORY;
      const from = v * TAP_WINDOW + TAP_WINDOW - count;
      for (let i = 0; i < count; i++) {
        this.samples[out + ((start + i) & HISTORY_MASK)] = window[from + i];
      }
    }
  }

  /**
   * Appends new samples straight from a ring. snapshot must hold that ring's status from the same
   * consistent read (see RingTapReader.read). limit caps how many new samples one ingest reads.
   */
  ingestRing(snapshot: TapSnapshot, ring: TapRing, limit = RING_INGEST_LIMIT): void {
    const count = this.advance(snapshot, limit);
    if (count === 0) return;
    const start = (this.writeIndex - count) | 0;
    const source = ring.samples;
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const out = v * TAP_HISTORY;
      const from = v * TAP_RING;
      for (let i = 0; i < count; i++) {
        const index = (start + i) | 0;
        this.samples[out + (index & HISTORY_MASK)] = source[from + (index & RING_MASK)];
      }
    }
  }

  /** Copies dest.length samples of one voice that end just before endIndex, oldest first. */
  copyRange(voice: number, endIndex: number, dest: Float32Array): void {
    const base = voice * TAP_HISTORY;
    const start = (endIndex - dest.length) | 0;
    for (let i = 0; i < dest.length; i++) {
      dest[i] = this.samples[base + ((start + i) & HISTORY_MASK)];
    }
  }

  /** Writes the gain-weighted sum of the track's voices, times scale, ending just before endIndex. */
  mixRange(endIndex: number, gains: ArrayLike<number>, scale: number, dest: Float32Array): void {
    dest.fill(0);
    const start = (endIndex - dest.length) | 0;
    for (let v = 0; v < this.voiceCount; v++) {
      const gain = gains[v] * scale;
      if (gain === 0) continue;
      const base = v * TAP_HISTORY;
      for (let i = 0; i < dest.length; i++) {
        dest[i] += this.samples[base + ((start + i) & HISTORY_MASK)] * gain;
      }
    }
  }

  /** Takes the snapshot's status, zeroes any gap and moves writeIndex; returns how many newest samples to copy. */
  private advance(snapshot: TapSnapshot, available: number): number {
    const end = snapshot.tapWriteIndex | 0;
    if (snapshot.loadId !== this.loadId) {
      this.samples.fill(0);
      this.loadId = snapshot.loadId;
      this.writeIndex = (end - available) | 0;
    }
    this.sampleRate = snapshot.sampleRate;
    this.voiceCount = snapshot.voiceCount;
    const delta = (end - this.writeIndex) | 0;
    if (delta <= 0) return 0;
    const count = Math.min(delta, available);
    this.zero(this.writeIndex, delta - count);
    this.writeIndex = end;
    this.newestContextTime = snapshot.contextTime;
    return count;
  }

  /** Zeroes `length` samples of every voice starting at absolute index `from`. */
  private zero(from: number, length: number): void {
    if (length <= 0) return;
    if (length >= TAP_HISTORY) {
      this.samples.fill(0);
      return;
    }
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const base = v * TAP_HISTORY;
      for (let i = 0; i < length; i++) this.samples[base + (((from + i) | 0) & HISTORY_MASK)] = 0;
    }
  }
}
