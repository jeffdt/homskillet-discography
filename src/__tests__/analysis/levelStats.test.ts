// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { VoiceLevelStats, quantile } from '../../analysis/levelStats';

describe('quantile', () => {
  it('reads the floor index of p * (n - 1) from a sorted list, 0 when empty', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4, 5], 0.99)).toBe(4);
    expect(quantile([1, 2, 3, 4, 5], 1)).toBe(5);
    expect(quantile([], 0.5)).toBe(0);
  });
});

describe('VoiceLevelStats', () => {
  it('measures peak, rms and p95 over the samples that are not resting at zero', () => {
    const stats = new VoiceLevelStats(2, 'Triangle', 24000, false);
    stats.addSample(0);
    for (let i = 1; i <= 100; i++) stats.addSample(i % 2 ? i / 100 : -i / 100);
    const profile = stats.profile();
    expect(profile.index).toBe(2);
    expect(profile.name).toBe('Triangle');
    expect(profile.peak).toBe(1);
    expect(profile.rms).toBeCloseTo(Math.sqrt(338350 / 1e4 / 100), 4);
    expect(profile.p95Abs).toBeCloseTo(0.95, 2);
  });

  it('counts silent frames and takes window percentiles over the rest only', () => {
    const stats = new VoiceLevelStats(0, 'Square 1', 24000, false);
    stats.addFrame(0, 0, 0);
    stats.addFrame(0.0005, 0.001, 0.0004);
    for (let i = 1; i <= 8; i++) stats.addFrame(0.05, i / 10, i / 100);
    const profile = stats.profile();
    expect(profile.silentPct).toBe(20);
    expect(profile.windowPeak).toEqual({ p10: 0.1, p50: 0.4, p90: 0.7, p99: 0.7 });
    expect(profile.level).toEqual({ p50: 0.04, p95: 0.07, p99: 0.07 });
  });

  it('records rms per whole second only with the timeline option', () => {
    const withTimeline = new VoiceLevelStats(0, 'Noise', 4, true);
    [0.5, -0.5, 0.5, -0.5, 0.1, 0.1, 0.1, 0.1, 0.9].forEach((x) => withTimeline.addSample(x));
    expect(withTimeline.profile().rmsBySecond).toEqual([0.5, 0.1]);
    const without = new VoiceLevelStats(0, 'Noise', 4, false);
    without.addSample(0.5);
    expect(without.profile().rmsBySecond).toBeUndefined();
  });

  it('reports zeros for a voice that never sounds', () => {
    const stats = new VoiceLevelStats(7, 'PCM', 24000, false);
    stats.addSample(0);
    stats.addFrame(0, 0, 0);
    expect(stats.profile()).toMatchObject({
      peak: 0,
      rms: 0,
      p95Abs: 0,
      silentPct: 100,
      windowPeak: { p10: 0, p50: 0, p90: 0, p99: 0 },
    });
  });
});
