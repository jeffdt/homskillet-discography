import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLOR_PALETTE,
  SHADE_HIGHLIGHT_MAX,
  SHADE_KNEE,
  ScrollAccumulator,
  aWeightingLut,
  buildColorLut,
  buildShadeTable,
  peakDecayFactor,
  readCssRgb,
  rowBinRanges,
} from '../visuals/spectrogramMath';

describe('buildColorLut', () => {
  it('spans the palette in 256 steps', () => {
    const lut = buildColorLut(['#000000', '#ffffff']);
    expect(lut).toHaveLength(256);
    expect(lut[0]).toBe('#000000');
    expect(lut[255]).toBe('#ffffff');
  });

  it('falls back to the default palette when given fewer than two colors', () => {
    expect(buildColorLut(['#ff0000'])).toEqual(buildColorLut(DEFAULT_COLOR_PALETTE));
  });
});

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

describe('buildShadeTable', () => {
  it('runs from background to the channel color at the knee, then part way to the highlight', () => {
    const { channel, highlight } = buildShadeTable();
    expect(channel).toHaveLength(256);
    expect(channel[0]).toBe(0);
    expect(highlight[0]).toBe(0);
    expect(channel[SHADE_KNEE]).toBeCloseTo(1, 6);
    expect(highlight[SHADE_KNEE]).toBe(0);
    expect(highlight[255]).toBeCloseTo(SHADE_HIGHLIGHT_MAX, 6);
    expect(channel[255]).toBeCloseTo(1 - SHADE_HIGHLIGHT_MAX, 6);
    for (let i = 1; i < 256; i++) {
      expect(channel[i] + highlight[i]).toBeLessThanOrEqual(1 + 1e-6);
      expect(highlight[i]).toBeGreaterThanOrEqual(highlight[i - 1]);
      if (i <= SHADE_KNEE) expect(channel[i]).toBeGreaterThan(channel[i - 1]);
    }
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

describe('readCssRgb', () => {
  it('falls back to the given hex when the variable is not set', () => {
    expect(readCssRgb('--not-a-variable', '#101010')).toEqual([16, 16, 16]);
  });
});
