import { TAP_WINDOW, VOICE_PAIRS } from '../constants';
import {
  FLAG_PAUSED,
  FLAG_SEEKING,
  STATUS_BYTES,
  STATUS_CONTEXT_TIME,
  STATUS_FLAGS,
  STATUS_LOAD_ID,
  STATUS_POSITION_MS,
  STATUS_SAMPLE_RATE,
  STATUS_SEQUENCE,
  STATUS_SLOTS,
  STATUS_TAP_WRITE_INDEX,
  STATUS_VOICE_COUNT,
  TapRing,
} from './TapRing';

/** Bytes in one pooled transfer buffer: status followed by every voice's window. */
export const TAP_SNAPSHOT_BYTES = STATUS_BYTES + VOICE_PAIRS * TAP_WINDOW * 4;

/**
 * Latest analysis taps and playback status on the main thread. Mutable and reused: read it inside
 * a frame and never keep references to it or its arrays.
 */
export class TapSnapshot {
  readonly status: Float64Array;
  readonly voiceData: Float32Array;
  /** One view of TAP_WINDOW samples per voice pair, oldest first, -1..1, before mute/solo. */
  readonly voices: Float32Array[];
  private readonly bytes: Uint8Array;

  constructor(buffer: ArrayBuffer = new ArrayBuffer(TAP_SNAPSHOT_BYTES)) {
    this.bytes = new Uint8Array(buffer);
    this.status = new Float64Array(buffer, 0, STATUS_SLOTS);
    this.voiceData = new Float32Array(buffer, STATUS_BYTES, VOICE_PAIRS * TAP_WINDOW);
    this.voices = Array.from({ length: VOICE_PAIRS }, (_, v) =>
      this.voiceData.subarray(v * TAP_WINDOW, (v + 1) * TAP_WINDOW)
    );
  }

  get positionMs(): number {
    return this.status[STATUS_POSITION_MS];
  }
  get contextTime(): number {
    return this.status[STATUS_CONTEXT_TIME];
  }
  get seeking(): boolean {
    return (this.status[STATUS_FLAGS] & FLAG_SEEKING) !== 0;
  }
  get paused(): boolean {
    return (this.status[STATUS_FLAGS] & FLAG_PAUSED) !== 0;
  }
  get voiceCount(): number {
    return this.status[STATUS_VOICE_COUNT];
  }
  get sampleRate(): number {
    return this.status[STATUS_SAMPLE_RATE];
  }
  get loadId(): number {
    return this.status[STATUS_LOAD_ID];
  }
  get sequence(): number {
    return this.status[STATUS_SEQUENCE];
  }
  /** Absolute index one past the newest tap sample (wraps like int32). */
  get tapWriteIndex(): number {
    return this.status[STATUS_TAP_WRITE_INDEX];
  }

  /** Copies a pooled transfer buffer into this snapshot. */
  copyFrom(buffer: ArrayBuffer): void {
    this.bytes.set(new Uint8Array(buffer));
  }

  /** Copies status and the newest window straight from a ring. */
  fillFromRing(ring: TapRing): void {
    this.status.set(ring.status);
    ring.copyWindowInto(this.voiceData);
  }
}

/**
 * Fills a pooled transfer buffer from the ring (processor side). The buffer arrives transferred
 * from the main thread, so the two small views are created per post.
 */
export function writeSnapshotBuffer(buffer: ArrayBuffer, ring: TapRing): void {
  new Float64Array(buffer, 0, STATUS_SLOTS).set(ring.status);
  ring.copyWindowInto(new Float32Array(buffer, STATUS_BYTES, VOICE_PAIRS * TAP_WINDOW));
}
