// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { nextGain, targetGain, windowPeak } from '../visuals/autoGain';

const TUNING = { floorPeak: 0.05, targetPeak: 0.9, releaseMs: 500 };

describe('auto gain', () => {
  it('finds the window peak, reading from 0 when the window starts before the data', () => {
    expect(windowPeak([0.1, -0.4, 0.2, 0.3], 1, 2)).toBeCloseTo(0.4);
    expect(windowPeak([0.1, -0.4, 0.2, 0.3], -2, 4)).toBeCloseTo(0.4);
    expect(windowPeak([], 0, 512)).toBe(0);
  });

  it('puts the peak at the target and stops at the floor', () => {
    expect(targetGain(0.1, TUNING)).toBeCloseTo(9);
    expect(targetGain(0.001, TUNING)).toBeCloseTo(18);
    expect(targetGain(0, TUNING)).toBeCloseTo(18);
  });

  it('drops at once for a louder window and climbs back with the release time constant', () => {
    expect(nextGain(18, 0.3, 16, TUNING)).toBeCloseTo(3);
    const after = nextGain(3, 0.1, 500, TUNING);
    expect(after).toBeCloseTo(9 + (3 - 9) * Math.exp(-1), 6);
  });
});
