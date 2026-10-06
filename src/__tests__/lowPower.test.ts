import { describe, it, expect } from 'vitest';
import { decideLowPower, median } from '../shell/lowPower';

describe('decideLowPower', () => {
  it('flags devices with two or fewer cores', () => {
    expect(decideLowPower({ hardwareConcurrency: 2, frameTimesMs: [] })).toBe(true);
  });

  it('flags slow frame times', () => {
    expect(decideLowPower({ hardwareConcurrency: 8, frameTimesMs: [33, 34, 33, 35, 33] })).toBe(
      true
    );
  });

  it('accepts fast devices and ignores too few samples or unknown cores', () => {
    expect(decideLowPower({ hardwareConcurrency: 8, frameTimesMs: [16, 17, 16, 17, 16] })).toBe(
      false
    );
    expect(decideLowPower({ frameTimesMs: [40, 40] })).toBe(false);
    expect(decideLowPower({ hardwareConcurrency: 0, frameTimesMs: [] })).toBe(false);
  });
});

describe('median', () => {
  it('handles odd, even and empty input', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});
