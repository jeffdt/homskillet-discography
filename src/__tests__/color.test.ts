// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { packPixel, parseHexColor } from '../visuals/color';

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
