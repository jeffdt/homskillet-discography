import { VOICE_PAIRS } from '../audio/constants';
import { SpectrumLayout, VoiceFrame, VoiceInfo } from '../audio/data/contract';
import { SILENT_VOICE_RMS } from './BinColorizer';
import { Rgb, buildGradientLut, packPixel, parseHexColor } from './color';
import { SHADE_BLACK_POINT, aWeightingLut, buildShadeTable, valueIndex } from './spectrogramMath';

/** The fixed colors channel colors are shaded between: silence and the loudest peaks. */
export interface StageShades {
  background: Rgb;
  highlight: Rgb;
}

/**
 * Decides spectrum pixel colors (spec 3.2); SpectrogramRenderer decides geometry and loudness.
 * Pixels are packed with packPixel.
 */
export interface BinPainter {
  /** Called once per frame before any pixel call. */
  update(frame: VoiceFrame, dtMs: number): void;
  /** Opaque pixel for a row whose loudest bin is `bin` at value index 0..255. */
  pixel(bin: number, valueIndex: number): number;
  /** Pixel for a falling peak marker. */
  peakPixel(bin: number, valueIndex: number): number;
  /** Pixel for a silent waterfall row: 0 (transparent) or opaque. */
  readonly emptyPixel: number;
  /** Pixel behind the analyzer bars. */
  readonly analyzerBackground: number;
}

/** Anything that turns a frame into r, g, b per bin (BinColorizer). */
export interface BinColorSource {
  update(frame: VoiceFrame, dtMs: number): Float32Array;
}

/** A bin is "lit" for peak markers once a voice's value index there passes the black point. */
export const LIT_VALUE_INDEX = SHADE_BLACK_POINT;

function opaque([r, g, b]: Rgb): number {
  return packPixel(r, g, b, 255);
}

/** By channel, average: BinColorizer's power-weighted average color, shaded by loudness (today's look). */
export class AveragePainter implements BinPainter {
  readonly emptyPixel = 0;
  readonly analyzerBackground: number;
  private readonly shade = buildShadeTable();
  private colors: Float32Array;

  constructor(
    private readonly source: BinColorSource,
    private readonly shades: StageShades,
    bins: number
  ) {
    this.analyzerBackground = opaque(shades.background);
    this.colors = new Float32Array(bins * 3);
  }

  update(frame: VoiceFrame, dtMs: number): void {
    this.colors = this.source.update(frame, dtMs);
  }

  pixel(bin: number, index: number): number {
    const c = this.shade.channel[index];
    const h = this.shade.highlight[index];
    const k = 1 - c - h;
    const o = bin * 3;
    const { background, highlight } = this.shades;
    const colors = this.colors;
    return packPixel(
      (background[0] * k + colors[o] * c + highlight[0] * h + 0.5) | 0,
      (background[1] * k + colors[o + 1] * c + highlight[1] * h + 0.5) | 0,
      (background[2] * k + colors[o + 2] * c + highlight[2] * h + 0.5) | 0,
      255
    );
  }

  peakPixel(bin: number, index: number): number {
    return this.pixel(bin, index);
  }
}

/**
 * By channel, add like light: each audible voice shades its own color by its own loudness in the
 * bin, and the voices add up over the background, clamped at 255, like colored stage lights.
 */
export class AdditivePainter implements BinPainter {
  readonly emptyPixel = 0;
  readonly analyzerBackground: number;
  private readonly shade = buildShadeTable();
  private readonly weighting: Float32Array;
  private readonly channelRgb = new Float32Array(VOICE_PAIRS * 3);
  private readonly audible = new Uint8Array(VOICE_PAIRS);
  private readonly red: Float32Array;
  private readonly green: Float32Array;
  private readonly blue: Float32Array;
  private readonly loudest: Uint8Array;
  private readonly binPixels: Uint32Array;
  private readonly litPixels: Uint32Array;

  constructor(
    layout: SpectrumLayout,
    private readonly shades: StageShades,
    private readonly fallback: Rgb
  ) {
    const bins = layout.bins;
    this.weighting = aWeightingLut(layout.frequencies);
    this.red = new Float32Array(bins);
    this.green = new Float32Array(bins);
    this.blue = new Float32Array(bins);
    this.loudest = new Uint8Array(bins);
    this.analyzerBackground = opaque(shades.background);
    this.binPixels = new Uint32Array(bins).fill(this.analyzerBackground);
    this.litPixels = new Uint32Array(bins).fill(opaque(fallback));
    for (let v = 0; v < VOICE_PAIRS; v++) this.channelRgb.set(fallback, v * 3);
  }

  /** Channel colors as '#rrggbb', indexed by voice; unparsable entries use the fallback. */
  setChannelColors(colors: readonly string[]): void {
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const rgb = (colors.length && parseHexColor(colors[v % colors.length])) || this.fallback;
      this.channelRgb.set(rgb, v * 3);
    }
  }

  /** Which voices are heard (VoiceInfo.audible); voices not listed are not. */
  setVoices(voices: readonly VoiceInfo[]): void {
    this.audible.fill(0);
    voices.forEach((voice) => {
      if (voice.index >= 0 && voice.index < VOICE_PAIRS)
        this.audible[voice.index] = voice.audible ? 1 : 0;
    });
  }

  update(frame: VoiceFrame, _dtMs?: number): void {
    const [br, bg, bb] = this.shades.background;
    const [hr, hg, hb] = this.shades.highlight;
    const { red, green, blue, loudest, weighting } = this;
    red.fill(br);
    green.fill(bg);
    blue.fill(bb);
    loudest.fill(0);
    const bins = weighting.length;
    const voiceCount = Math.min(frame.voiceCount, VOICE_PAIRS);
    for (let v = 0; v < voiceCount; v++) {
      if (!this.audible[v]) continue;
      const voice = frame.voices[v];
      if (!(voice.rms >= SILENT_VOICE_RMS)) continue;
      const spectrum = voice.spectrum;
      const o = v * 3;
      const cr = this.channelRgb[o];
      const cg = this.channelRgb[o + 1];
      const cb = this.channelRgb[o + 2];
      for (let b = 0; b < bins; b++) {
        const index = valueIndex(255 * weighting[b] * spectrum[b]);
        if (index === 0) continue;
        const c = this.shade.channel[index];
        const h = this.shade.highlight[index];
        red[b] += cr * c + hr * h;
        green[b] += cg * c + hg * h;
        blue[b] += cb * c + hb * h;
        if (index > loudest[b]) loudest[b] = index;
      }
    }
    for (let b = 0; b < bins; b++) {
      const pixel = packPixel(
        (Math.min(255, red[b]) + 0.5) | 0,
        (Math.min(255, green[b]) + 0.5) | 0,
        (Math.min(255, blue[b]) + 0.5) | 0,
        255
      );
      this.binPixels[b] = pixel;
      if (loudest[b] > LIT_VALUE_INDEX) this.litPixels[b] = pixel;
    }
  }

  pixel(bin: number, _valueIndex?: number): number {
    return this.binPixels[bin];
  }

  peakPixel(bin: number, _valueIndex?: number): number {
    return this.litPixels[bin];
  }
}

/** Unified: the old visualizer's look, one gradient indexed by loudness, channels ignored. */
export class GradientPainter implements BinPainter {
  private lut: Uint32Array;

  constructor(stops: readonly string[]) {
    this.lut = buildGradientLut(stops);
  }

  /** Switches to another gradient's stops. */
  setStops(stops: readonly string[]): void {
    this.lut = buildGradientLut(stops);
  }

  get emptyPixel(): number {
    return this.lut[0];
  }

  get analyzerBackground(): number {
    return this.lut[0];
  }

  update(_frame?: VoiceFrame, _dtMs?: number): void {}

  pixel(_bin: number, index: number): number {
    return this.lut[index];
  }

  peakPixel(_bin: number, index: number): number {
    return this.lut[index];
  }
}
