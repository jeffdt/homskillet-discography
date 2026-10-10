// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { VOICE_PAIRS } from '../audio/constants';
import { VoiceFrame, VoiceInfo } from '../audio/data/contract';
import { createSpectrumLayout } from '../audio/data/spectrumLayout';
import { Rgb, unpackPixel } from '../visuals/color';
import {
  SHADE_BLACK_POINT,
  SHADE_HIGHLIGHT_MAX,
  SHADE_KNEE,
  aWeightingLut,
} from '../visuals/spectrogramMath';
import {
  ADDITIVE_DOMINANCE,
  ADDITIVE_GAIN,
  AdditivePainter,
  AveragePainter,
  GradientPainter,
  StageShades,
} from '../visuals/spectrumPainters';

const SHADES: StageShades = { background: [16, 16, 16], highlight: [254, 254, 254] };
const FALLBACK: Rgb = [195, 195, 195];
const BLUE = '#56b4e9'; // 86, 180, 233
const YELLOW = '#f0e442'; // 240, 228, 66
const layout = createSpectrumLayout();
const weighting = aWeightingLut(layout.frequencies);
const rgb = (pixel: number) => unpackPixel(pixel).slice(0, 3);

/** A spectrum value that lands bin b on value index `index` after A-weighting. */
const valueFor = (index: number, b: number) => (index + 0.5) / 255 / weighting[b];

function frame(voiceCount = 2): VoiceFrame {
  return {
    time: 0,
    sampleRate: 24000,
    voiceCount,
    voices: Array.from({ length: VOICE_PAIRS }, () => ({
      waveform: new Float32Array(1024),
      rms: 0,
      spectrum: new Float32Array(layout.bins),
    })),
    mixSpectrum: new Float32Array(layout.bins),
  };
}

const voice = (index: number, audible = true): VoiceInfo => ({
  index,
  name: `Voice ${index}`,
  chip: '2A03',
  muted: !audible,
  soloed: false,
  audible,
});

function additive() {
  const painter = new AdditivePainter(layout, SHADES, FALLBACK);
  painter.setChannelColors([BLUE, YELLOW]);
  painter.setVoices([voice(0), voice(1)]);
  return painter;
}

function sound(f: VoiceFrame, v: number, b: number, index: number) {
  (f.voices[v] as { rms: number }).rms = 0.5;
  f.voices[v].spectrum[b] = valueFor(index, b);
}

describe('AdditivePainter', () => {
  it('lights a bin with one voice at its own loudness', () => {
    const painter = additive();
    const f = frame();
    sound(f, 0, 50, SHADE_KNEE);
    painter.update(f, 16);
    // 16 + 0.85 * (86, 180, 233), rounded.
    expect(rgb(painter.pixel(50, 0))).toEqual([89, 169, 214]);
    expect(rgb(painter.pixel(51, 0))).toEqual([16, 16, 16]);
  });

  it('keeps a bin dark until a voice passes the black point', () => {
    const painter = additive();
    const f = frame();
    sound(f, 0, 50, SHADE_BLACK_POINT);
    painter.update(f, 16);
    expect(rgb(painter.pixel(50, 0))).toEqual([16, 16, 16]);
  });

  it('adds equal overlapping voices and scales the sum down together instead of clipping to white', () => {
    const painter = additive();
    const f = frame();
    sound(f, 0, 50, SHADE_KNEE);
    sound(f, 1, 50, SHADE_KNEE);
    painter.update(f, 16);
    // 0.85 * (326, 408, 299) = (277.1, 346.8, 254.15), scaled by 255 / 346.8, plus 16, clamped.
    expect(rgb(painter.pixel(50, 0))).toEqual([220, 255, 203]);
  });

  it('lets a much quieter voice add only a trace of its light', () => {
    const painter = additive();
    const f = frame();
    sound(f, 0, 50, SHADE_KNEE);
    sound(f, 1, 50, 90);
    painter.update(f, 16);
    const quiet =
      ADDITIVE_GAIN *
      ((90 - SHADE_BLACK_POINT) / (SHADE_KNEE - SHADE_BLACK_POINT)) *
      Math.pow(90 / SHADE_KNEE, ADDITIVE_DOMINANCE);
    const expected = [86, 180, 233].map((c, i) =>
      Math.round(16 + ADDITIVE_GAIN * c + quiet * [240, 228, 66][i])
    );
    expect(rgb(painter.pixel(50, 0))).toEqual(expected);
  });

  it('mixes toward the highlight once, by the loudest voice', () => {
    const painter = additive();
    const f = frame();
    sound(f, 0, 50, 255);
    painter.update(f, 16);
    const h = SHADE_HIGHLIGHT_MAX;
    const expected = [86, 180, 233].map((c) =>
      Math.round((16 + ADDITIVE_GAIN * c) * (1 - h) + 254 * h)
    );
    expect(rgb(painter.pixel(50, 0))).toEqual(expected);
  });

  it('does not let an inaudible loud voice dim the audible one', () => {
    const painter = additive();
    painter.setVoices([voice(0), voice(1, false)]);
    const f = frame();
    sound(f, 0, 50, SHADE_KNEE);
    sound(f, 1, 50, 255);
    painter.update(f, 16);
    expect(rgb(painter.pixel(50, 0))).toEqual([89, 169, 214]);
  });

  it('leaves out muted voices', () => {
    const painter = additive();
    painter.setVoices([voice(0, false), voice(1)]);
    const f = frame();
    sound(f, 0, 50, SHADE_KNEE);
    sound(f, 1, 50, SHADE_KNEE);
    painter.update(f, 16);
    expect(rgb(painter.pixel(50, 0))).toEqual([220, 210, 72]);
  });

  it('never reads the spectrum of a silent voice', () => {
    const painter = additive();
    const f = frame();
    Object.defineProperty(f.voices[0], 'spectrum', {
      get: () => {
        throw new Error('read a silent spectrum');
      },
    });
    expect(() => painter.update(f, 16)).not.toThrow();
  });

  it('keeps the last lit color for peak markers through silence', () => {
    const painter = additive();
    const loud = frame();
    sound(loud, 0, 50, SHADE_KNEE);
    painter.update(loud, 16);
    const lit = painter.pixel(50, 0);
    painter.update(frame(), 16);
    expect(rgb(painter.pixel(50, 0))).toEqual([16, 16, 16]);
    expect(painter.peakPixel(50, 100)).toBe(lit);
  });

  it('paints silent rows transparent and the analyzer with the background', () => {
    const painter = additive();
    expect(painter.emptyPixel).toBe(0);
    expect(rgb(painter.analyzerBackground)).toEqual([16, 16, 16]);
  });
});

describe('AveragePainter', () => {
  it('shades the source color by the value index, as the renderer did', () => {
    const colors = new Float32Array(layout.bins * 3).fill(195);
    colors.set([86, 180, 233], 50 * 3);
    const painter = new AveragePainter({ update: () => colors }, SHADES, layout.bins);
    painter.update(frame(), 16);
    expect(rgb(painter.pixel(50, SHADE_KNEE))).toEqual([86, 180, 233]);
    expect(rgb(painter.pixel(50, 0))).toEqual([16, 16, 16]);
    expect(rgb(painter.pixel(50, SHADE_BLACK_POINT))).toEqual([16, 16, 16]);
    expect(painter.peakPixel(50, SHADE_KNEE)).toBe(painter.pixel(50, SHADE_KNEE));
    expect(painter.emptyPixel).toBe(0);
  });
});

describe('GradientPainter', () => {
  it('colors by value index alone and paints silence with the first stop', () => {
    const painter = new GradientPainter(['#e0e0e0', '#000000']);
    painter.update(frame(), 16);
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
