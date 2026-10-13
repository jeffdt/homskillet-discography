// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { floatToInt16, id3Tag, Mp3Encoder, WavEncoder } from '../../audio/export/encoders';

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

describe('floatToInt16', () => {
  it.each([
    [0, 0],
    [1, 32767],
    [-1, -32768],
    [1.5, 32767],
    [-1.5, -32768],
    [0.5, 16384],
  ])('maps %d to %d', (input, output) => {
    expect(floatToInt16(input)).toBe(output);
  });
});

describe('WavEncoder', () => {
  it('writes a 16-bit stereo 48 kHz header sized for the frame count', () => {
    const bytes = concat(new WavEncoder(3).start());
    const view = new DataView(bytes.buffer);
    expect(bytes.length).toBe(44);
    expect(ascii(bytes, 0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(36 + 12);
    expect(ascii(bytes, 8, 8)).toBe('WAVEfmt ');
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint32(28, true)).toBe(48000 * 4);
    expect(view.getUint16(32, true)).toBe(4);
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(bytes, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(12);
  });

  it('interleaves clamped samples left then right', () => {
    const encoder = new WavEncoder(3);
    const data = concat(
      encoder.encode(new Float32Array([0, 1, -2]), new Float32Array([0.5, -1, 2]))
    );
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    expect(Array.from(samples)).toEqual([0, 16384, 32767, -32768, -32768, 32767]);
    expect(encoder.finish()).toEqual([]);
  });

  it('reports its MIME type', () => {
    expect(new WavEncoder(1).mimeType).toBe('audio/wav');
  });
});

describe('id3Tag', () => {
  it('writes an ID3v2.3 header with a syncsafe size and UTF-16 text frames', () => {
    const tag = id3Tag({ title: 'Café', artist: 'homskillet', album: 'Bazaar' });
    expect(ascii(tag, 0, 3)).toBe('ID3');
    expect(Array.from(tag.subarray(3, 6))).toEqual([3, 0, 0]);
    const size = (tag[6] << 21) | (tag[7] << 14) | (tag[8] << 7) | tag[9];
    expect(size).toBe(tag.length - 10);
    expect(ascii(tag, 10, 4)).toBe('TIT2');
    // encoding byte + BOM + 4 UTF-16 code units
    expect(new DataView(tag.buffer).getUint32(14)).toBe(1 + 2 + 8);
    expect(Array.from(tag.subarray(20, 23))).toEqual([1, 0xff, 0xfe]);
    expect(new TextDecoder('utf-16le').decode(tag.subarray(23, 31))).toBe('Café');
    expect(ascii(tag, 31, 4)).toBe('TPE1');
  });

  it('omits the album frame when there is no album', () => {
    const tag = id3Tag({ title: 'A', artist: 'homskillet' });
    expect(ascii(tag, 0, tag.length).includes('TALB')).toBe(false);
  });
});

describe('Mp3Encoder', () => {
  it('starts with the ID3 tag and produces MPEG audio frames', () => {
    const encoder = new Mp3Encoder({ title: 'Tone', artist: 'homskillet' });
    const head = concat(encoder.start());
    expect(ascii(head, 0, 3)).toBe('ID3');

    const left = new Float32Array(48000);
    for (let i = 0; i < left.length; i++) left[i] = Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.5;
    const audio = concat([...encoder.encode(left, left), ...encoder.finish()]);
    expect(audio[0]).toBe(0xff);
    expect(audio[1] & 0xe0).toBe(0xe0);
    // 1 s at 320 kbps is about 40 kB
    expect(audio.length).toBeGreaterThan(35000);
    expect(audio.length).toBeLessThan(45000);
    expect(encoder.mimeType).toBe('audio/mpeg');
  });
});
