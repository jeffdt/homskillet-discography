import { SpectrumCore } from '../types';
import { SpectrumLayout } from './contract';
import { CQT_VOLUME, FFT_SPECTRUM_GAIN, VOICE_FFT_SIZE } from './constants';
import { Fft } from './fft';
import { FftBinMap } from './spectrumLayout';

/** Hann-windowed FFT spectrum on a SpectrumLayout, reported as sqrt(FFT_SPECTRUM_GAIN * amplitude). */
export class FftSpectrumAnalyzer {
  private readonly fft = new Fft(VOICE_FFT_SIZE);
  private readonly re = new Float32Array(VOICE_FFT_SIZE);
  private readonly im = new Float32Array(VOICE_FFT_SIZE);
  private readonly window = new Float32Array(VOICE_FFT_SIZE);
  private readonly amplitudes = new Float32Array(VOICE_FFT_SIZE / 2);
  private readonly map: FftBinMap;
  private readonly amplitudeScale: number;

  constructor(
    layout: SpectrumLayout,
    readonly sampleRate: number
  ) {
    let sum = 0;
    for (let i = 0; i < VOICE_FFT_SIZE; i++) {
      this.window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (VOICE_FFT_SIZE - 1));
      sum += this.window[i];
    }
    // A full-scale sine then reads as amplitude 1 at its peak.
    this.amplitudeScale = 2 / sum;
    this.map = new FftBinMap(layout, VOICE_FFT_SIZE, sampleRate);
  }

  /** Analyzes the newest VOICE_FFT_SIZE samples of input (oldest first) into out (layout.bins long). */
  analyze(input: Float32Array, out: Float32Array): void {
    const offset = input.length - VOICE_FFT_SIZE;
    for (let i = 0; i < VOICE_FFT_SIZE; i++) this.re[i] = input[offset + i] * this.window[i];
    this.im.fill(0);
    this.fft.transform(this.re, this.im);
    for (let k = 0; k < this.amplitudes.length; k++) {
      this.amplitudes[k] =
        Math.sqrt(this.re[k] * this.re[k] + this.im[k] * this.im[k]) * this.amplitudeScale;
    }
    this.map.map(this.amplitudes, out);
    for (let b = 0; b < out.length; b++) out[b] = Math.sqrt(FFT_SPECTRUM_GAIN * out[b]);
  }
}

/** Computes the mix spectrum from MIX_INPUT_SAMPLES of mixed taps (oldest first). */
export interface MixAnalyzer {
  readonly sampleRate: number;
  analyze(mix: Float32Array, out: Float32Array): void;
  dispose(): void;
}

/** The constant-Q transform (src/showcqtbar.c in chip-core), fed from taps. */
export class CqtMixAnalyzer implements MixAnalyzer {
  private constructor(
    private readonly core: SpectrumCore,
    readonly sampleRate: number,
    private readonly fftSize: number,
    private readonly inputPtr: number,
    private readonly outputPtr: number,
    private readonly bins: number
  ) {}

  /** Initializes the CQT for this rate and layout; null when the core has none (stub mode). */
  static create(
    core: SpectrumCore,
    layout: SpectrumLayout,
    sampleRate: number
  ): CqtMixAnalyzer | null {
    const fftSize = core._cqt_init(
      sampleRate,
      layout.bins,
      CQT_VOLUME,
      layout.minHz,
      layout.maxHz,
      0
    );
    if (!fftSize) return null;
    const inputPtr = core._malloc(fftSize * 4);
    const outputPtr = core._malloc(layout.bins * 4);
    new Float32Array(core.HEAPF32.buffer, inputPtr, fftSize).fill(0);
    return new CqtMixAnalyzer(core, sampleRate, fftSize, inputPtr, outputPtr, layout.bins);
  }

  analyze(mix: Float32Array, out: Float32Array): void {
    const core = this.core;
    // Re-read HEAPF32 every call: memory growth replaces the buffer. The input's older part
    // stays zero; the transform only reaches back about MIX_INPUT_SAMPLES.
    new Float32Array(core.HEAPF32.buffer, this.inputPtr, this.fftSize).set(
      mix,
      this.fftSize - mix.length
    );
    core._cqt_calc(this.inputPtr, this.inputPtr);
    core._cqt_render_line(this.outputPtr);
    out.set(new Float32Array(core.HEAPF32.buffer, this.outputPtr, this.bins));
  }

  dispose(): void {
    this.core._free(this.inputPtr);
    this.core._free(this.outputPtr);
  }
}

/** Stand-in when the core has no CQT (stub mode): an FFT spectrum of the newest mix samples. */
export class FftMixAnalyzer implements MixAnalyzer {
  private readonly analyzer: FftSpectrumAnalyzer;

  constructor(
    layout: SpectrumLayout,
    readonly sampleRate: number
  ) {
    this.analyzer = new FftSpectrumAnalyzer(layout, sampleRate);
  }

  analyze(mix: Float32Array, out: Float32Array): void {
    this.analyzer.analyze(mix, out);
  }

  dispose(): void {}
}

/** The CQT when the core has one, otherwise the FFT fallback. */
export function createMixAnalyzer(
  core: SpectrumCore | null,
  layout: SpectrumLayout,
  sampleRate: number
): MixAnalyzer {
  return (
    (core && CqtMixAnalyzer.create(core, layout, sampleRate)) ||
    new FftMixAnalyzer(layout, sampleRate)
  );
}
