// @vitest-environment node
import zlib from 'zlib';
import { describe, expect, it } from 'vitest';
import { encodePng } from '../../analysis/png';

describe('encodePng', () => {
  it('writes an 8-bit RGB PNG whose rows inflate back to the pixels', () => {
    const rgb = Uint8Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 16, 16, 16]);
    const png = encodePng(2, 2, rgb);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.toString('ascii', 12, 16)).toBe('IHDR');
    expect(png.readUInt32BE(16)).toBe(2);
    expect(png.readUInt32BE(20)).toBe(2);
    expect([png[24], png[25]]).toEqual([8, 2]);
    const idat = png.indexOf('IDAT');
    const length = png.readUInt32BE(idat - 4);
    const raw = zlib.inflateSync(png.subarray(idat + 4, idat + 4 + length));
    expect([...raw]).toEqual([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 16, 16, 16]);
    expect(png.toString('ascii', png.length - 8, png.length - 4)).toBe('IEND');
  });
});
