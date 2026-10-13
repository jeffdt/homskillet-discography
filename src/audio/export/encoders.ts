import { Mp3Encoder as LameEncoder } from '@breezystack/lamejs';
import { EXPORT_SAMPLE_RATE, MP3_KBPS } from './exportPlan';

/** Turns stereo float chunks into file bytes: start() once, encode() per chunk, finish() once. */
export interface Encoder {
  readonly mimeType: string;
  start(): Uint8Array[];
  encode(left: Float32Array, right: Float32Array): Uint8Array[];
  finish(): Uint8Array[];
}

/** Clamps a float sample to [-1, 1] and scales it to 16-bit PCM. */
export function floatToInt16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  return Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
}

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = floatToInt16(samples[i]);
  return out;
}

/** 16-bit stereo PCM WAV. The total frame count is known up front, so the header is final. */
export class WavEncoder implements Encoder {
  readonly mimeType = 'audio/wav';

  constructor(
    private readonly totalFrames: number,
    private readonly sampleRate = EXPORT_SAMPLE_RATE
  ) {}

  start(): Uint8Array[] {
    const dataBytes = this.totalFrames * 4;
    const header = new Uint8Array(44);
    const view = new DataView(header.buffer);
    const writeAscii = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i++) header[offset + i] = text.charCodeAt(i);
    };
    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeAscii(36, 'data');
    view.setUint32(40, dataBytes, true);
    return [header];
  }

  encode(left: Float32Array, right: Float32Array): Uint8Array[] {
    const samples = new Int16Array(left.length * 2);
    for (let i = 0; i < left.length; i++) {
      samples[2 * i] = floatToInt16(left[i]);
      samples[2 * i + 1] = floatToInt16(right[i]);
    }
    return [new Uint8Array(samples.buffer)];
  }

  finish(): Uint8Array[] {
    return [];
  }
}

/** Tags written into an MP3. */
export interface Id3Tags {
  title: string;
  artist: string;
  album?: string;
}

function textFrame(id: string, text: string): Uint8Array {
  const body = new Uint8Array(3 + text.length * 2);
  body[0] = 1; // UTF-16 with BOM
  body[1] = 0xff;
  body[2] = 0xfe;
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    body[3 + 2 * i] = unit & 0xff;
    body[4 + 2 * i] = unit >> 8;
  }
  const frame = new Uint8Array(10 + body.length);
  for (let i = 0; i < 4; i++) frame[i] = id.charCodeAt(i);
  new DataView(frame.buffer).setUint32(4, body.length);
  frame.set(body, 10);
  return frame;
}

/** An ID3v2.3 tag with title, artist and (when given) album. */
export function id3Tag(tags: Id3Tags): Uint8Array {
  const frames = [textFrame('TIT2', tags.title), textFrame('TPE1', tags.artist)];
  if (tags.album) frames.push(textFrame('TALB', tags.album));
  const size = frames.reduce((sum, frame) => sum + frame.length, 0);
  const tag = new Uint8Array(10 + size);
  tag.set([0x49, 0x44, 0x33, 3, 0, 0], 0);
  // The tag size is syncsafe: 7 bits per byte.
  tag[6] = (size >> 21) & 0x7f;
  tag[7] = (size >> 14) & 0x7f;
  tag[8] = (size >> 7) & 0x7f;
  tag[9] = size & 0x7f;
  let offset = 10;
  for (const frame of frames) {
    tag.set(frame, offset);
    offset += frame.length;
  }
  return tag;
}

function copyBytes(bytes: Uint8Array): Uint8Array[] {
  return bytes.length === 0 ? [] : [bytes.slice()];
}

/** 320 kbps CBR stereo MP3 through LAME, preceded by an ID3v2.3 tag. */
export class Mp3Encoder implements Encoder {
  readonly mimeType = 'audio/mpeg';
  private readonly lame: LameEncoder;

  constructor(
    private readonly tags: Id3Tags,
    sampleRate = EXPORT_SAMPLE_RATE
  ) {
    this.lame = new LameEncoder(2, sampleRate, MP3_KBPS);
  }

  start(): Uint8Array[] {
    return [id3Tag(this.tags)];
  }

  encode(left: Float32Array, right: Float32Array): Uint8Array[] {
    // LAME reuses its output buffer, so each chunk is copied out.
    return copyBytes(this.lame.encodeBuffer(toInt16(left), toInt16(right)));
  }

  finish(): Uint8Array[] {
    return copyBytes(this.lame.flush());
  }
}
