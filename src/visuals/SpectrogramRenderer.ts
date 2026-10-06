import { SpectrumLayout } from '../audio/data/contract';
import {
  DEFAULT_COLOR_PALETTE,
  ScrollAccumulator,
  aWeightingLut,
  buildColorLut,
  peakDecayFactor,
} from './spectrogramMath';

/** The two canvases the stage draws on. */
export interface SpectrogramCanvases {
  analyzer: HTMLCanvasElement;
  spectrogram: HTMLCanvasElement;
}

function colorIndex(value: number): number {
  return value <= 0 ? 0 : value >= 255 ? 255 : value | 0;
}

function isSilent(spectrum: Float32Array): boolean {
  for (let i = 0; i < spectrum.length; i++) if (spectrum[i] !== 0) return false;
  return true;
}

/**
 * Draws the stage visualizer from a mix spectrum: analyzer bars with peak hold at the right edge,
 * and a waterfall that scrolls right to left at a fixed speed in pixels per second whatever the
 * frame rate. Port of Spectrogram.js's horizontal mode with the CQT moved out to the data source.
 */
export class SpectrogramRenderer {
  private readonly analyzerCtx: CanvasRenderingContext2D | null;
  private readonly spectrogramCtx: CanvasRenderingContext2D | null;
  private readonly scratch: HTMLCanvasElement;
  private readonly scratchCtx: CanvasRenderingContext2D | null;
  private readonly weighting: Float32Array;
  private readonly peaks: Float32Array;
  private readonly scroll = new ScrollAccumulator();
  private colors: string[] = buildColorLut(DEFAULT_COLOR_PALETTE);
  private peakDecayRate = 0.98;
  private peakQuantization = 4;

  constructor(
    private readonly canvases: SpectrogramCanvases,
    private readonly layout: SpectrumLayout,
    private readonly background: string,
    createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')
  ) {
    this.analyzerCtx = canvases.analyzer.getContext('2d', { alpha: true });
    this.spectrogramCtx = canvases.spectrogram.getContext('2d', { alpha: true });
    this.scratch = createCanvas();
    this.scratchCtx = this.scratch.getContext('2d', { alpha: true });
    this.weighting = aWeightingLut(layout.frequencies);
    this.peaks = new Float32Array(layout.bins);
    this.resize();
  }

  setColorPalette(colors: string[]): void {
    this.colors = buildColorLut(colors);
  }

  /** Peak hold decay per 60 fps frame (0.98 falls slowly). */
  setPeakDecayRate(rate: number): void {
    this.peakDecayRate = rate;
  }

  /** Peak marker steps in pixels, for the pixelated fall. */
  setPeakQuantization(quantization: number): void {
    this.peakQuantization = Math.max(1, quantization);
  }

  /** Call after the canvases change size: matches the scratch canvas and clears everything. */
  resize(): void {
    const { analyzer, spectrogram } = this.canvases;
    this.scratch.width = spectrogram.width;
    this.scratch.height = spectrogram.height;
    if (this.scratchCtx) this.scratchCtx.clearRect(0, 0, this.scratch.width, this.scratch.height);
    if (this.spectrogramCtx)
      this.spectrogramCtx.clearRect(0, 0, spectrogram.width, spectrogram.height);
    if (this.analyzerCtx) this.analyzerCtx.clearRect(0, 0, analyzer.width, analyzer.height);
    this.peaks.fill(0);
    this.scroll.reset();
  }

  /** Draws one frame; the waterfall moves pxPerSecond * dtMs / 1000 backing pixels. */
  draw(spectrum: Float32Array, dtMs: number, pxPerSecond: number): void {
    const analyzerCtx = this.analyzerCtx;
    const spectrogramCtx = this.spectrogramCtx;
    const scratchCtx = this.scratchCtx;
    if (!analyzerCtx || !spectrogramCtx || !scratchCtx) return;
    const { analyzer, spectrogram } = this.canvases;
    const step = this.scroll.step(pxPerSecond, dtMs);

    analyzerCtx.fillStyle = this.background;
    analyzerCtx.fillRect(0, 0, analyzer.width, analyzer.height);

    if (step > 0) {
      // Shift through the scratch canvas, clearing both, so transparent (silent) columns never
      // leave stale pixels behind.
      scratchCtx.clearRect(0, 0, this.scratch.width, this.scratch.height);
      scratchCtx.drawImage(spectrogram, -step, 0);
      spectrogramCtx.clearRect(0, 0, spectrogram.width, spectrogram.height);
      spectrogramCtx.drawImage(this.scratch, 0, 0);
    }

    if (!isSilent(spectrum)) this.drawBins(spectrum, dtMs, step);
  }

  private drawBins(spectrum: Float32Array, dtMs: number, step: number): void {
    const analyzerCtx = this.analyzerCtx as CanvasRenderingContext2D;
    const spectrogramCtx = this.spectrogramCtx as CanvasRenderingContext2D;
    const { analyzer, spectrogram } = this.canvases;
    const bins = this.layout.bins;
    const analyzerHeight = analyzer.height;
    const spectrogramWidth = spectrogram.width;
    const spectrogramHeight = spectrogram.height;
    const widthPerValue = analyzer.width / 256;
    // One pixel of overlap hides gaps from rounding.
    const analyzerBinHeight = Math.ceil(analyzerHeight / bins) + 1;
    const spectrogramBinHeight = Math.ceil(spectrogramHeight / bins) + 1;
    const decay = peakDecayFactor(this.peakDecayRate, dtMs);
    const quantization = this.peakQuantization;

    for (let i = 0; i < bins; i++) {
      const value = (255 * this.weighting[i] * spectrum[i]) | 0;
      const color = this.colors[colorIndex(value)];
      if (value > this.peaks[i]) this.peaks[i] = value;
      else this.peaks[i] *= decay;

      // Low frequencies at the bottom of both canvases.
      const analyzerY = analyzerHeight - Math.ceil(((i + 1) / bins) * analyzerHeight);
      analyzerCtx.fillStyle = color;
      analyzerCtx.fillRect(0, analyzerY, (value * widthPerValue) | 0, analyzerBinHeight);

      const peakWidth =
        Math.floor(((this.peaks[i] * widthPerValue) | 0) / quantization) * quantization;
      analyzerCtx.fillStyle = this.colors[colorIndex(this.peaks[i])];
      analyzerCtx.fillRect(peakWidth - 2, analyzerY, 2, analyzerBinHeight);

      if (step > 0) {
        const spectrogramY = spectrogramHeight - Math.ceil(((i + 1) / bins) * spectrogramHeight);
        spectrogramCtx.fillStyle = color;
        spectrogramCtx.fillRect(spectrogramWidth - step, spectrogramY, step, spectrogramBinHeight);
      }
    }
  }
}
