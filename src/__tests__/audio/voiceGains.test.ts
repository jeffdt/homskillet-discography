// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  computeVoiceGains,
  computeVoiceLevels,
  unityVoiceLevels,
} from '../../audio/render/voiceGains';

describe('computeVoiceGains', () => {
  it('passes every voice when nothing is muted or soloed', () => {
    expect(Array.from(computeVoiceGains([], []))).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('silences muted voices', () => {
    const muted = [false, true, false, false, false, true, false, false];
    expect(Array.from(computeVoiceGains(muted, []))).toEqual([1, 0, 1, 1, 1, 0, 1, 1]);
  });

  it('plays only soloed voices when any voice is soloed', () => {
    const soloed = [false, false, true, false, true, false, false, false];
    expect(Array.from(computeVoiceGains([], soloed))).toEqual([0, 0, 1, 0, 1, 0, 0, 0]);
  });

  it('keeps a voice silent when it is both soloed and muted', () => {
    const muted = [false, false, true, false, false, false, false, false];
    const soloed = [false, false, true, true, false, false, false, false];
    expect(Array.from(computeVoiceGains(muted, soloed))).toEqual([0, 0, 0, 1, 0, 0, 0, 0]);
  });

  it('writes into the provided array', () => {
    const out = new Float32Array(8);
    expect(computeVoiceGains([true], [], out)).toBe(out);
    expect(out[0]).toBe(0);
  });
});

describe('computeVoiceLevels', () => {
  it('folds volume into the audible gain and keeps pan and send per voice', () => {
    const levels = computeVoiceLevels({
      muted: [false, true],
      soloed: [],
      volume: [1.5, 2],
      pan: [0.5],
      reverb: [0, 0.75],
    });
    expect(levels.gains.slice(0, 3)).toEqual([1.5, 0, 1]);
    expect(levels.pans.slice(0, 2)).toEqual([0.5, 0]);
    expect(levels.sends.slice(0, 2)).toEqual([0, 0.75]);
  });

  it('clamps out-of-range and non-numeric levels, and fills gaps with defaults', () => {
    const levels = computeVoiceLevels({
      muted: [],
      soloed: [],
      volume: [-1, 5, NaN],
      pan: [3, -3],
      reverb: [2],
    });
    expect(levels.gains.slice(0, 4)).toEqual([0, 2, 1, 1]);
    expect(levels.pans.slice(0, 2)).toEqual([1, -1]);
    expect(levels.sends[0]).toBe(1);
  });

  it('is unity, centered and dry for the song as written', () => {
    expect(unityVoiceLevels()).toEqual({
      gains: [1, 1, 1, 1, 1, 1, 1, 1],
      pans: [0, 0, 0, 0, 0, 0, 0, 0],
      sends: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  });
});
