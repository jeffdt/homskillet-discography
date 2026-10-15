// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  GAIN_RAMP_FRAMES,
  INTERLEAVED_CHANNELS,
  OUTPUT_SCALE,
  VOICE_PAIRS,
} from '../../audio/constants';
import {
  applyStereoCrossfeed,
  mixVoicePairs,
  VoiceRouting,
} from '../../audio/render/mixVoicePairs';
import { computeVoiceLevels } from '../../audio/render/voiceGains';
import { VoiceMix } from '../../audio/types';

function heapOf(frames: number, fill: (frame: number, channel: number) => number): Int16Array {
  const heap = new Int16Array(frames * INTERLEAVED_CHANNELS);
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < INTERLEAVED_CHANNELS; c++) heap[f * INTERLEAVED_CHANNELS + c] = fill(f, c);
  }
  return heap;
}

const ones = () => new VoiceRouting();

function routing(mix: Partial<VoiceMix>): VoiceRouting {
  const result = new VoiceRouting();
  result.setLevels(computeVoiceLevels({ muted: [], soloed: [], ...mix }));
  return result;
}

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
    const target = routing({ muted: [true] });
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
    expect(current.ll[0]).toBe(0);
  });
});

describe('mixVoicePairs routing', () => {
  // voice 1: L 1000, R 400
  const heap = () => heapOf(1, (_, c) => ({ 2: 1000, 3: 400 })[c] ?? 0);
  const voice1 = (value: number, rest: number) => {
    const values = new Array(VOICE_PAIRS).fill(rest);
    values[1] = value;
    return values;
  };

  /** Mixes one frame with routing already settled (no ramp); returns [L, R, send] in int16 units. */
  function mixSettled(mix: Partial<VoiceMix>): number[] {
    const target = routing(mix);
    const current = new VoiceRouting();
    current.copyFrom(target);
    const left = new Float32Array(1);
    const right = new Float32Array(1);
    const send = new Float32Array(1);
    mixVoicePairs(heap(), 0, 1, current, target, left, right, 0, send);
    return [left[0], right[0], send[0]].map((x) => Math.round(x * 65536));
  }

  it('scales a voice by its volume', () => {
    expect(mixSettled({ volume: voice1(0.5, 1) }).slice(0, 2)).toEqual([500, 200]);
    expect(mixSettled({ volume: voice1(2, 1) }).slice(0, 2)).toEqual([2000, 800]);
  });

  it('moves the left side across when panned hard right, keeping the total', () => {
    expect(mixSettled({ pan: voice1(1, 0) }).slice(0, 2)).toEqual([0, 1400]);
  });

  it('moves half the right side to the left at pan -0.5', () => {
    expect(mixSettled({ pan: voice1(-0.5, 0) }).slice(0, 2)).toEqual([1200, 200]);
  });

  it('sends (L + R) times volume times send, scaled like the output', () => {
    expect(mixSettled({ reverb: voice1(0.5, 0), volume: voice1(0.5, 1) })[2]).toBe(350);
    expect(mixSettled({})[2]).toBe(0);
  });

  it('sends nothing from a muted voice', () => {
    const settled = routing({ reverb: voice1(1, 1), muted: [false, true] });
    expect(settled.send[1]).toBe(0);
    expect(settled.hasSend()).toBe(true);
    expect(routing({}).hasSend()).toBe(false);
  });

  it('ramps a pan change instead of jumping', () => {
    const frames = GAIN_RAMP_FRAMES;
    const longHeap = heapOf(frames, (_, c) => ({ 2: 1000, 3: 400 })[c] ?? 0);
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    mixVoicePairs(longHeap, 0, frames, routing({}), routing({ pan: voice1(1, 0) }), left, right, 0);
    expect(left[0] * 65536).toBeCloseTo(1000 * (1 - 1 / frames), 3);
    expect(Math.round(left[frames - 1] * 65536)).toBe(0);
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
