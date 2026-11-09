import { MIX_INPUT_SAMPLES, MIX_SCALE } from '../audio/data/constants';
import { createMixAnalyzer } from '../audio/data/spectra';
import { createSpectrumLayout } from '../audio/data/spectrumLayout';
import { ChipCore } from '../audio/types';
import { spectrumGradientById } from '../config/spectrumGradients';
import { unpackPixel } from '../visuals/color';
import { aWeightingLut, valueIndex } from '../visuals/spectrogramMath';
import { GradientPainter } from '../visuals/spectrumPainters';
import { quantile } from './levelStats';
import { ANALYSIS_TAP_RATE, TapRender } from './renderTaps';

export interface SheetOptions {
  startSeconds: number;
  seconds: number;
  /** Gradient id. */
  gradientId: string;
}

/** Color statistics over the painted pixels; chroma is max minus min channel, value the max. */
export interface SheetStats {
  chromaP50: number;
  chromaP90: number;
  valueP50: number;
  valueP90: number;
  /** Bright and washed out: value at least 200 with chroma under 90. */
  pastelPct: number;
  /** Value under 40. */
  darkPct: number;
}

export interface SpectrumSheet {
  width: number;
  height: number;
  rgb: Uint8Array;
  stats: SheetStats;
}

/**
 * Draws a track excerpt as the stage's waterfall with the app's own analyzer and painter: one
 * column per 60 fps frame, one row per spectrum bin, low at the bottom.
 */
export function renderSpectrumSheet(
  core: ChipCore,
  bytes: Uint8Array,
  path: string,
  options: SheetOptions
): SpectrumSheet {
  const render = new TapRender(core, bytes, path);
  const layout = createSpectrumLayout();
  const bins = layout.bins;
  const weighting = aWeightingLut(layout.frequencies);
  const voiceCount = render.info.voices.length;
  const painter = new GradientPainter(spectrumGradientById(options.gradientId).stops);
  const mixAnalyzer = createMixAnalyzer(core, layout, ANALYSIS_TAP_RATE);
  const voiceInput = new Float32Array(MIX_INPUT_SAMPLES);
  const mixInput = new Float32Array(MIX_INPUT_SAMPLES);
  const mixSpectrum = new Float32Array(bins);

  const skip = render.frameCount(options.startSeconds);
  for (let f = 0; f < skip; f++) render.step();
  const width = Math.max(0, render.frameCount(options.startSeconds + options.seconds) - skip);
  const rgb = new Uint8Array(width * bins * 3);
  const chroma: number[] = [];
  const value: number[] = [];
  let pastel = 0;
  let dark = 0;

  for (let x = 0; x < width; x++) {
    render.step();
    mixInput.fill(0);
    for (let v = 0; v < voiceCount; v++) {
      render.copyNewest(v, voiceInput);
      for (let i = 0; i < MIX_INPUT_SAMPLES; i++) mixInput[i] += voiceInput[i] * MIX_SCALE;
    }
    mixAnalyzer.analyze(mixInput, mixSpectrum);
    for (let b = 0; b < bins; b++) {
      const index = valueIndex(255 * weighting[b] * mixSpectrum[b]);
      const [r, g, bl] = unpackPixel(index > 0 ? painter.pixel(b, index) : painter.emptyPixel);
      const o = ((bins - 1 - b) * width + x) * 3;
      rgb[o] = r;
      rgb[o + 1] = g;
      rgb[o + 2] = bl;
      if (index === 0) continue;
      const max = Math.max(r, g, bl);
      const c = max - Math.min(r, g, bl);
      chroma.push(c);
      value.push(max);
      if (max >= 200 && c < 90) pastel++;
      if (max < 40) dark++;
    }
  }
  mixAnalyzer.dispose();
  render.dispose();

  const percent = (count: number, total: number) =>
    total ? Math.round((1000 * count) / total) / 10 : 0;
  const c = Float64Array.from(chroma).sort();
  const v = Float64Array.from(value).sort();
  return {
    width,
    height: bins,
    rgb,
    stats: {
      chromaP50: quantile(c, 0.5),
      chromaP90: quantile(c, 0.9),
      valueP50: quantile(v, 0.5),
      valueP90: quantile(v, 0.9),
      pastelPct: percent(pastel, c.length),
      darkPct: percent(dark, c.length),
    },
  };
}
