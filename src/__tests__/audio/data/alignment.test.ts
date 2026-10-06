// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { alignmentDelay, audibleTime } from '../../../audio/data/alignment';
import { rmsOfNewest, smoothToward } from '../../../audio/data/levels';

describe('audibleTime', () => {
  it('extrapolates the output timestamp to now', () => {
    const clock = {
      currentTime: 10.2,
      getOutputTimestamp: () => ({ contextTime: 10, performanceTime: 1000 }),
    };
    expect(audibleTime(clock, 1100)).toBeCloseTo(10.1, 9);
  });

  it('falls back to currentTime minus latency without a usable timestamp', () => {
    const stale = {
      currentTime: 10,
      baseLatency: 0.01,
      outputLatency: 0.03,
      getOutputTimestamp: () => ({ contextTime: 9, performanceTime: 1000 }),
    };
    expect(audibleTime(stale, 5000)).toBeCloseTo(9.96, 9);
    expect(audibleTime({ currentTime: 10 }, 0)).toBe(10);
    const unstarted = {
      currentTime: 1,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
    };
    expect(audibleTime(unstarted, 0)).toBe(1);
  });
});

describe('alignmentDelay', () => {
  it('counts the samples between the newest one and the audible one', () => {
    expect(alignmentDelay(10.05, 10, 24000, 12288)).toBe(1200);
  });

  it('never reads ahead of the newest sample or further back than allowed', () => {
    expect(alignmentDelay(10, 10.02, 24000, 12288)).toBe(0);
    expect(alignmentDelay(11, 10, 24000, 12288)).toBe(12288);
    expect(alignmentDelay(11, 10, 0, 12288)).toBe(0);
  });
});

describe('rmsOfNewest', () => {
  it('measures only the newest samples', () => {
    const samples = Float32Array.from([1, 1, 0.5, -0.5]);
    expect(rmsOfNewest(samples, 2)).toBeCloseTo(0.5, 9);
    expect(rmsOfNewest(samples, 100)).toBeCloseTo(Math.sqrt(2.5 / 4), 9);
    expect(rmsOfNewest(samples, 0)).toBe(0);
  });
});

describe('smoothToward', () => {
  it('reaches 63% of a step after one time constant', () => {
    expect(smoothToward(0, 1, 10, 10, 150)).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(smoothToward(1, 0, 150, 10, 150)).toBeCloseTo(Math.exp(-1), 9);
  });

  it('does not depend on the frame rate', () => {
    const at120 = smoothToward(smoothToward(0, 1, 1000 / 120, 75, 75), 1, 1000 / 120, 75, 75);
    const at60 = smoothToward(0, 1, 1000 / 60, 75, 75);
    expect(at120).toBeCloseTo(at60, 9);
  });

  it('holds still when no time passes', () => {
    expect(smoothToward(0.3, 1, 0, 10, 150)).toBe(0.3);
  });
});
