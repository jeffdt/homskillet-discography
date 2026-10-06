import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLOR_PALETTE,
  ScrollAccumulator,
  aWeightingLut,
  buildColorLut,
  peakDecayFactor,
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
