// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { computeVoiceGains } from '../../audio/render/voiceGains';

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
