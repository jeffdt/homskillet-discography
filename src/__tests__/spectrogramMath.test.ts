import { describe, expect, it } from 'vitest';
import {
  ScrollAccumulator,
  aWeightingLut,
  peakDecayFactor,
  rowBinRanges,
} from '../visuals/spectrogramMath';

describe('ScrollAccumulator', () => {
  const total = (fps: number, seconds: number) => {
    const scroll = new ScrollAccumulator();
    let px = 0;
    for (let i = 0; i < fps * seconds; i++) px += scroll.step(120, 1000 / fps);
    return px;
  };

  it('scrolls the same distance per second at any frame rate', () => {
    expect(total(30, 1)).toBe(120);
    expect(total(60, 1)).toBe(120);
    expect(total(120, 1)).toBe(120);
    expect(Math.abs(total(144, 1) - 120)).toBeLessThanOrEqual(1);
  });

  it('carries fractions of a pixel to later frames', () => {
    const scroll = new ScrollAccumulator();
    expect(scroll.step(60, 1000 / 120)).toBe(0);
    expect(scroll.step(60, 1000 / 120)).toBe(1);
  });
});

describe('peakDecayFactor', () => {
  it('decays by the rate once per 60 fps frame of elapsed time', () => {
    expect(peakDecayFactor(0.98, 1000 / 60)).toBeCloseTo(0.98, 9);
    expect(peakDecayFactor(0.98, 2000 / 60)).toBeCloseTo(0.98 * 0.98, 9);
    expect(peakDecayFactor(0.98, 0)).toBe(1);
  });
});

describe('aWeightingLut', () => {
  it('matches the old weights: 1.25 at 1 kHz, about half in deep bass', () => {
    const lut = aWeightingLut(Float32Array.from([30, 1000]));
    expect(lut[1]).toBeCloseTo(1.25, 2);
    expect(lut[0]).toBeLessThan(0.55);
  });
});

describe('rowBinRanges', () => {
  it('gives each row one bin, low frequencies at the bottom, when rows equal bins', () => {
    const { start, end } = rowBinRanges(448, 448);
    expect(start[447]).toBe(0);
    expect(end[447]).toBe(1);
    expect(start[0]).toBe(447);
    expect(end[0]).toBe(448);
  });

  it.each([224, 300, 97])('covers every bin exactly once with %d rows for 448 bins', (height) => {
    const { start, end } = rowBinRanges(height, 448);
    const seen = new Array(448).fill(0);
    for (let y = 0; y < height; y++) {
      expect(end[y]).toBeGreaterThan(start[y]);
      for (let b = start[y]; b < end[y]; b++) seen[b]++;
    }
    expect(seen.every((count) => count === 1)).toBe(true);
  });

  it('repeats bins over taller canvases', () => {
    const { start, end } = rowBinRanges(896, 448);
    for (let y = 0; y < 896; y++) expect(end[y] - start[y]).toBe(1);
    expect(start[895]).toBe(0);
    expect(start[894]).toBe(0);
    expect(start[0]).toBe(447);
  });
});
