// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { unpackPixel } from '../visuals/color';
import { GradientPainter } from '../visuals/spectrumPainters';

const rgb = (pixel: number) => unpackPixel(pixel).slice(0, 3);

describe('GradientPainter', () => {
  it('colors by value index alone and paints silence with the first stop', () => {
    const painter = new GradientPainter(['#e0e0e0', '#000000']);
    expect(rgb(painter.pixel(10, 0))).toEqual([224, 224, 224]);
    expect(rgb(painter.pixel(300, 255))).toEqual([0, 0, 0]);
    expect(painter.peakPixel(3, 255)).toBe(painter.pixel(9, 255));
    expect(rgb(painter.emptyPixel)).toEqual([224, 224, 224]);
    expect(rgb(painter.analyzerBackground)).toEqual([224, 224, 224]);
  });

  it('switches gradients', () => {
    const painter = new GradientPainter(['#000000', '#ffffff']);
    painter.setStops(['#101010', '#9bfe38']);
    expect(rgb(painter.pixel(0, 255))).toEqual([155, 254, 56]);
  });
});
