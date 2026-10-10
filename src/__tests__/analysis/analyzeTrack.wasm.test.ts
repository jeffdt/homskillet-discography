// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { analyzeTrack } from '../../analysis/analyzeTrack';
import { loadChipCoreFromDisk, readMusicFile } from '../../analysis/nodeChipCore';
import { renderSpectrumSheet } from '../../analysis/spectrumSheet';
import { ChipCore } from '../../audio/types';

let core: ChipCore;
beforeAll(async () => {
  core = await loadChipCoreFromDisk();
});

describe('analyzeTrack on real chip-core', () => {
  it('profiles every voice of parkour from the same taps the app reads', () => {
    const path = 'SuperFORE!/parkour.nsf';
    const profile = analyzeTrack(core, readMusicFile(path), path, { maxSeconds: 20 });
    expect(profile.analyzedMs).toBe(20000);
    expect(profile.voices.map((v) => v.name)).toEqual([
      'Square 1',
      'Square 2',
      'Triangle',
      'Noise',
      'DMC',
      'Saw Wave',
      'Square 3',
      'Square 4',
    ]);
    const byName = Object.fromEntries(profile.voices.map((v) => [v.name, v]));
    expect(byName['Square 1'].silentPct).toBe(100);
    expect(byName['Square 1'].peak).toBe(0);
    expect(byName.Triangle.silentPct).toBeLessThan(0.5);
    expect(byName.Triangle.peak).toBeCloseTo(0.152, 2);
    expect(byName.DMC.peak).toBeCloseTo(0.542, 2);
    profile.voices.forEach((v) => {
      expect(v.windowPeak.p10).toBeLessThanOrEqual(v.windowPeak.p50);
      expect(v.windowPeak.p99).toBeLessThanOrEqual(v.peak);
      expect(v.rmsBySecond).toBeUndefined();
    });
  }, 30000);

  it('records a per-second timeline on request', () => {
    const path = 'SuperFORE!/parkour.nsf';
    const profile = analyzeTrack(core, readMusicFile(path), path, {
      maxSeconds: 2.5,
      timeline: true,
    });
    profile.voices.forEach((v) => expect(v.rmsBySecond).toHaveLength(2));
  });

  it('draws a sheet with one panel per coloring and their color statistics', () => {
    const path = 'SuperFORE!/parkour.nsf';
    const sheet = renderSpectrumSheet(core, readMusicFile(path), path, {
      startSeconds: 2,
      seconds: 1,
      paletteId: 'chromatic',
      gradientId: 'mw-red',
    });
    expect(sheet.height).toBe(448);
    expect(sheet.width).toBe(60 * 3 + 6 * 2);
    expect(sheet.rgb).toHaveLength(sheet.width * 448 * 3);
    expect(sheet.panels.map((p) => p.id)).toEqual(['additive', 'average', 'unified']);
    sheet.panels.forEach((p) => expect(p.stats.chromaP90).toBeGreaterThan(0));
  }, 30000);
});
