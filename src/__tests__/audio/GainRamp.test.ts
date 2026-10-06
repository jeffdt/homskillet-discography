// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { GainRamp } from '../../audio/render/GainRamp';

const ones = (n: number) => new Float32Array(n).fill(1);

describe('GainRamp', () => {
  it('starts at unity and leaves audio untouched', () => {
    const ramp = new GainRamp();
    const left = ones(4);
    const right = ones(4);
    ramp.apply(left, right, 0, 4);
    expect(Array.from(left)).toEqual([1, 1, 1, 1]);
  });

  it('ramps linearly to the target and holds it', () => {
    const ramp = new GainRamp();
    ramp.rampTo(0, 4);
    const left = ones(6);
    const right = ones(6);
    ramp.apply(left, right, 0, 6);
    expect(Array.from(left)).toEqual([0.75, 0.5, 0.25, 0, 0, 0]);
    expect(ramp.isSilent()).toBe(true);
  });

  it('is not silent while still ramping down', () => {
    const ramp = new GainRamp();
    ramp.rampTo(0, 4);
    ramp.apply(ones(2), ones(2), 0, 2);
    expect(ramp.isSilent()).toBe(false);
    expect(ramp.value).toBeCloseTo(0.5, 9);
  });

  it('jumps when the ramp length is zero and resets on demand', () => {
    const ramp = new GainRamp();
    ramp.rampTo(0, 0);
    expect(ramp.value).toBe(0);
    ramp.reset(1);
    expect(ramp.value).toBe(1);
    expect(ramp.isSilent()).toBe(false);
  });

  it('applies only within the offset window', () => {
    const ramp = new GainRamp();
    ramp.reset(0);
    const left = ones(4);
    const right = ones(4);
    ramp.apply(left, right, 2, 2);
    expect(Array.from(left)).toEqual([1, 1, 0, 0]);
  });
});
