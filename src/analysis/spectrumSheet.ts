import { VOICE_PAIRS } from '../audio/constants';
import {
  MIX_INPUT_SAMPLES,
  MIX_SCALE,
  RMS_ATTACK_MS,
  RMS_RELEASE_MS,
  RMS_SAMPLES,
  VOICE_FFT_SIZE,
} from '../audio/data/constants';
import { VoiceFrame } from '../audio/data/contract';
import { rmsOfNewest, smoothToward } from '../audio/data/levels';
import { FftSpectrumAnalyzer, createMixAnalyzer } from '../audio/data/spectra';
import { createSpectrumLayout } from '../audio/data/spectrumLayout';
import { buildVoiceInfos } from '../audio/data/voiceInfos';
import { ChipCore } from '../audio/types';
import { channelPaletteById } from '../config/channelPalettes';
import { spectrumGradientById } from '../config/spectrumGradients';
import { SpectrumColoringId } from '../config/stageSettings';
import { BinColorizer, SILENT_VOICE_RMS } from '../visuals/BinColorizer';
import { Rgb, unpackPixel } from '../visuals/color';
import { aWeightingLut, valueIndex } from '../visuals/spectrogramMath';
import {
  AdditivePainter,
  AveragePainter,
  BinPainter,
  GradientPainter,
} from '../visuals/spectrumPainters';
import { quantile } from './levelStats';
import { ANALYSIS_FRAME_MS, ANALYSIS_TAP_RATE, TapRender } from './renderTaps';

/** The stage's default colors (index.css): --neutral0, --neutral4, --neutral3. */
const SHADES = { background: [16, 16, 16] as Rgb, highlight: [254, 254, 254] as Rgb };
const FALLBACK: Rgb = [195, 195, 195];
/** Black columns between panels. */
export const SHEET_GAP_PX = 6;
/** Panel order, left to right. */
export const SHEET_PANELS: readonly SpectrumColoringId[] = ['additive', 'average', 'unified'];

export interface SheetOptions {
  startSeconds: number;
  seconds: number;
  /** Channel palette id (Add light and Average). */
  paletteId: string;
  /** Gradient id (Unified). */
  gradientId: string;
}

/** Color statistics over the painted pixels of one panel; chroma is max minus min channel, value the max. */
export interface PanelStats {
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
  panels: { id: SpectrumColoringId; stats: PanelStats }[];
}

/**
 * Draws a track excerpt as waterfalls side by side, one per spectrum coloring, with the app's own
 * analyzers and painters: one column per 60 fps frame, one row per spectrum bin, low at the bottom.
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
  const voiceInfos = buildVoiceInfos(
    { info: render.info, voiceChips: [] },
    { muted: [], soloed: [] }
  );
  const channels = channelPaletteById(options.paletteId).channels;
  const additive = new AdditivePainter(layout, SHADES, FALLBACK);
  additive.setChannelColors(channels);
  additive.setVoices(voiceInfos);
  const colorizer = new BinColorizer(bins, FALLBACK);
  colorizer.setChannelColors(channels);
  colorizer.setVoices(voiceInfos);
  const painters: Record<SpectrumColoringId, BinPainter> = {
    additive,
    average: new AveragePainter(colorizer, SHADES, bins),
    unified: new GradientPainter(spectrumGradientById(options.gradientId).stops),
  };
  const voiceAnalyzer = new FftSpectrumAnalyzer(layout, ANALYSIS_TAP_RATE);
  const mixAnalyzer = createMixAnalyzer(core, layout, ANALYSIS_TAP_RATE);
  const rmsWindow = new Float32Array(RMS_SAMPLES);
  const fftInput = new Float32Array(VOICE_FFT_SIZE);
  const voiceInput = new Float32Array(MIX_INPUT_SAMPLES);
  const mixInput = new Float32Array(MIX_INPUT_SAMPLES);
  const mixSpectrum = new Float32Array(bins);
  const voices = Array.from({ length: VOICE_PAIRS }, () => ({
    waveform: new Float32Array(0),
    rms: 0,
    spectrum: new Float32Array(bins),
  }));
  const frame: VoiceFrame = {
    time: 0,
    sampleRate: ANALYSIS_TAP_RATE,
    voiceCount,
    voices,
    mixSpectrum,
  };

  const skip = render.frameCount(options.startSeconds);
  for (let f = 0; f < skip; f++) render.step();
  const columns = Math.max(0, render.frameCount(options.startSeconds + options.seconds) - skip);
  const panelCount = SHEET_PANELS.length;
  const width = columns * panelCount + SHEET_GAP_PX * (panelCount - 1);
  const rgb = new Uint8Array(width * bins * 3);
  const chroma = SHEET_PANELS.map(() => [] as number[]);
  const value = SHEET_PANELS.map(() => [] as number[]);
  const pastel = SHEET_PANELS.map(() => 0);
  const dark = SHEET_PANELS.map(() => 0);

  for (let col = 0; col < columns; col++) {
    render.step();
    mixInput.fill(0);
    for (let v = 0; v < voiceCount; v++) {
      render.copyNewest(v, rmsWindow);
      voices[v].rms = smoothToward(
        voices[v].rms,
        rmsOfNewest(rmsWindow, RMS_SAMPLES),
        ANALYSIS_FRAME_MS,
        RMS_ATTACK_MS,
        RMS_RELEASE_MS
      );
      render.copyNewest(v, voiceInput);
      for (let i = 0; i < MIX_INPUT_SAMPLES; i++) mixInput[i] += voiceInput[i] * MIX_SCALE;
      if (voices[v].rms >= SILENT_VOICE_RMS) {
        fftInput.set(voiceInput.subarray(MIX_INPUT_SAMPLES - VOICE_FFT_SIZE));
        voiceAnalyzer.analyze(fftInput, voices[v].spectrum);
      } else {
        voices[v].spectrum.fill(0);
      }
    }
    mixAnalyzer.analyze(mixInput, mixSpectrum);
    SHEET_PANELS.forEach((id, p) => {
      const painter = painters[id];
      painter.update(frame, ANALYSIS_FRAME_MS);
      const silentPixel =
        painter.emptyPixel !== 0 ? painter.emptyPixel : painter.analyzerBackground;
      const x = p * (columns + SHEET_GAP_PX) + col;
      for (let b = 0; b < bins; b++) {
        const index = valueIndex(255 * weighting[b] * mixSpectrum[b]);
        const [r, g, bl] = unpackPixel(index > 0 ? painter.pixel(b, index) : silentPixel);
        const o = ((bins - 1 - b) * width + x) * 3;
        rgb[o] = r;
        rgb[o + 1] = g;
        rgb[o + 2] = bl;
        if (index === 0) continue;
        const max = Math.max(r, g, bl);
        const c = max - Math.min(r, g, bl);
        chroma[p].push(c);
        value[p].push(max);
        if (max >= 200 && c < 90) pastel[p]++;
        if (max < 40) dark[p]++;
      }
    });
  }
  mixAnalyzer.dispose();

  const percent = (count: number, total: number) =>
    total ? Math.round((1000 * count) / total) / 10 : 0;
  return {
    width,
    height: bins,
    rgb,
    panels: SHEET_PANELS.map((id, p) => {
      const c = Float64Array.from(chroma[p]).sort();
      const v = Float64Array.from(value[p]).sort();
      return {
        id,
        stats: {
          chromaP50: quantile(c, 0.5),
          chromaP90: quantile(c, 0.9),
          valueP50: quantile(v, 0.5),
          valueP90: quantile(v, 0.9),
          pastelPct: percent(pastel[p], c.length),
          darkPct: percent(dark[p], c.length),
        },
      };
    }),
  };
}
