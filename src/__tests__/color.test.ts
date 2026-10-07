// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildGradientLut, packPixel, parseHexColor, unpackPixel } from '../visuals/color';

describe('parseHexColor', () => {
  it('reads six- and three-digit hex in any case, ignoring surrounding space', () => {
    expect(parseHexColor('#56B4E9')).toEqual([86, 180, 233]);
    expect(parseHexColor('#abc')).toEqual([170, 187, 204]);
    expect(parseHexColor(' #101010 ')).toEqual([16, 16, 16]);
  });

  it('returns null for anything else', () => {
    expect(parseHexColor('rgb(1, 2, 3)')).toBeNull();
    expect(parseHexColor('')).toBeNull();
    expect(parseHexColor('#12345')).toBeNull();
  });
});

describe('packPixel', () => {
  it('packs a pixel so a Uint32Array view of ImageData bytes reads r, g, b, a in order', () => {
    const pixels = new Uint32Array(1);
    pixels[0] = packPixel(1, 2, 3, 4);
    expect(Array.from(new Uint8ClampedArray(pixels.buffer))).toEqual([1, 2, 3, 4]);
  });
});

describe('unpackPixel', () => {
  it('reverses packPixel', () => {
    expect(unpackPixel(packPixel(1, 2, 3, 4))).toEqual([1, 2, 3, 4]);
    expect(unpackPixel(packPixel(255, 128, 0, 255))).toEqual([255, 128, 0, 255]);
  });
});

describe('buildGradientLut', () => {
  it('starts on the first stop and ends on the last', () => {
    const lut = buildGradientLut(['#101010', '#66cb01', '#fefefe']);
    expect(lut).toHaveLength(256);
    expect(unpackPixel(lut[0])).toEqual([16, 16, 16, 255]);
    expect(unpackPixel(lut[255])).toEqual([254, 254, 254, 255]);
  });

  it('interpolates evenly spaced stops in RGB', () => {
    const lut = buildGradientLut(['#000000', '#ff0000', '#ffffff']);
    // Index 51 is 0.4 of the way to the middle stop.
    expect(unpackPixel(lut[51])).toEqual([102, 0, 0, 255]);
    expect(unpackPixel(lut[204])).toEqual([255, 153, 153, 255]);
  });

  it('skips unparsable stops and survives too few', () => {
    expect(unpackPixel(buildGradientLut(['nope', '#ff0000', '#00ff00'])[0])).toEqual([
      255, 0, 0, 255,
    ]);
    expect(unpackPixel(buildGradientLut(['#123456'])[200])).toEqual([18, 52, 86, 255]);
    expect(unpackPixel(buildGradientLut([])[100])).toEqual([0, 0, 0, 255]);
  });
});
