// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  GAIN_RAMP_FRAMES,
  INTERLEAVED_CHANNELS,
  OUTPUT_SCALE,
  VOICE_PAIRS,
} from '../../audio/constants';
import { applyStereoCrossfeed, mixVoicePairs } from '../../audio/render/mixVoicePairs';

function heapOf(frames: number, fill: (frame: number, channel: number) => number): Int16Array {
  const heap = new Int16Array(frames * INTERLEAVED_CHANNELS);
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < INTERLEAVED_CHANNELS; c++) heap[f * INTERLEAVED_CHANNELS + c] = fill(f, c);
  }
  return heap;
}

const ones = () => new Float32Array(VOICE_PAIRS).fill(1);

describe('mixVoicePairs', () => {
  it('sums every pair and scales like the old player (1/65536)', () => {
    // voice 0: L 1000, R -1000; voice 3: L 500, R 500
    const heap = heapOf(1, (_, c) => ({ 0: 1000, 1: -1000, 6: 500, 7: 500 })[c] ?? 0);
    const left = new Float32Array(1);
    const right = new Float32Array(1);
    mixVoicePairs(heap, 0, 1, ones(), ones(), left, right, 0);
    expect(OUTPUT_SCALE).toBe(1 / 65536);
    expect(left[0]).toBeCloseTo(1500 / 65536, 9);
    expect(right[0]).toBeCloseTo(-500 / 65536, 9);
  });

  it('writes at the offset and reads from the base', () => {
    const heap = heapOf(3, (f, c) => (c === 0 ? (f + 1) * 100 : 0));
    const left = new Float32Array(5);
    const right = new Float32Array(5);
    mixVoicePairs(heap, INTERLEAVED_CHANNELS, 2, ones(), ones(), left, right, 3);
    expect(Array.from(left).map((x) => Math.round(x * 65536))).toEqual([0, 0, 0, 200, 300]);
  });

  it('ramps a newly muted voice to silence over GAIN_RAMP_FRAMES without a jump', () => {
    const frames = 256;
    const heap = heapOf(frames, (_, c) => (c < 2 ? 32767 : 0));
    const current = ones();
    const target = ones();
    target[0] = 0;
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    mixVoicePairs(heap, 0, frames, current, target, left, right, 0);
    const full = 32767 * OUTPUT_SCALE;
    expect(left[0]).toBeCloseTo(full * (1 - 1 / GAIN_RAMP_FRAMES), 6);
    expect(left[GAIN_RAMP_FRAMES - 1]).toBeCloseTo(0, 9);
    expect(left[frames - 1]).toBe(0);
    for (let i = 1; i < frames; i++) {
      expect(Math.abs(left[i] - left[i - 1])).toBeLessThanOrEqual(full / GAIN_RAMP_FRAMES + 1e-6);
    }
    expect(current[0]).toBe(0);
  });
});

describe('applyStereoCrossfeed', () => {
  it('leaves full width untouched', () => {
    const left = Float32Array.of(1);
    const right = Float32Array.of(0);
    applyStereoCrossfeed(left, right, 0, 1, 1);
    expect([left[0], right[0]]).toEqual([1, 0]);
  });

  it('collapses to mono at width 0', () => {
    const left = Float32Array.of(1);
    const right = Float32Array.of(0);
    applyStereoCrossfeed(left, right, 0, 1, 0);
    expect([left[0], right[0]]).toEqual([0.5, 0.5]);
  });

  it('blends 75/25 at width 0.5, matching the old GMEPlayer', () => {
    const left = Float32Array.of(1);
    const right = Float32Array.of(0);
    applyStereoCrossfeed(left, right, 0, 1, 0.5);
    expect(left[0]).toBeCloseTo(0.75, 6);
    expect(right[0]).toBeCloseTo(0.25, 6);
  });
});
