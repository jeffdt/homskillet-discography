import { INTERLEAVED_CHANNELS } from '../../audio/constants';
import { TapRing } from '../../audio/taps/TapRing';

/**
 * GME-style interleaved output in which voice v's i-th tap sample comes out as values[v][i] / 32768
 * (each tap sample is two identical frames with left equal to right).
 */
export function heapFor(values: number[][]): Int16Array {
  const samples = values.length ? values[0].length : 0;
  const heap = new Int16Array(samples * 2 * INTERLEAVED_CHANNELS);
  for (let i = 0; i < samples; i++) {
    for (let f = 0; f < 2; f++) {
      const frame = (2 * i + f) * INTERLEAVED_CHANNELS;
      values.forEach((voice, v) => {
        heap[frame + 2 * v] = voice[i];
        heap[frame + 2 * v + 1] = voice[i];
      });
    }
  }
  return heap;
}

/** Status fields for writeTaps; anything left out gets a neutral default. */
export interface TapStatus {
  positionMs?: number;
  contextTime?: number;
  flags?: number;
  voiceCount?: number;
  sampleRate?: number;
  loadId?: number;
}

/** Writes tap samples and a status inside one sequence-locked update, as ProcessorCore.process does. */
export function writeTaps(ring: TapRing, values: number[][], status: TapStatus = {}): void {
  const heap = heapFor(values);
  ring.beginWrite();
  ring.write(heap, 0, heap.length / INTERLEAVED_CHANNELS);
  ring.setStatus(
    status.positionMs ?? 0,
    status.contextTime ?? 0,
    status.flags ?? 0,
    status.voiceCount ?? values.length,
    status.sampleRate ?? 24000,
    status.loadId ?? 1
  );
  ring.endWrite();
}

/** count int16 values start, start + 1, ... wrapping at 30000 so they stay in range. */
export function ramp(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => (start + i) % 30000);
}

/** count zeros. */
export function silence(count: number): number[] {
  return new Array(count).fill(0);
}

/** count int16 values of a sine at freq Hz, sampled at rate. */
export function sineValues(
  freq: number,
  count: number,
  amplitude = 8000,
  rate = 24000,
  start = 0
): number[] {
  return Array.from({ length: count }, (_, i) =>
    Math.round(amplitude * Math.sin((2 * Math.PI * freq * (start + i)) / rate))
  );
}
