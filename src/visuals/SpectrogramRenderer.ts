import { SpectrumLayout } from '../audio/data/contract';
import {
  RowBins,
  ScrollAccumulator,
  aWeightingLut,
  peakDecayFactor,
  rowBinRanges,
  valueIndex,
} from './spectrogramMath';
import { BinPainter } from './spectrumPainters';

/** The two canvases the stage draws on. */
export interface SpectrogramCanvases {
  analyzer: HTMLCanvasElement;
  spectrogram: HTMLCanvasElement;
}

/** Peak marker width in backing pixels. */
const PEAK_MARKER_PX = 2;

/** An ImageData plus a one-word-per-pixel view of its bytes. */
interface PixelImage {
  image: ImageData;
  pixels: Uint32Array;
}

function createPixelImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): PixelImage {
  const image = ctx.createImageData(Math.max(1, width), Math.max(1, height));
  return { image, pixels: new Uint32Array(image.data.buffer) };
}

function isSilent(spectrum: Float32Array): boolean {
  for (let i = 0; i < spectrum.length; i++) if (spectrum[i] !== 0) return false;
  return true;
}

/**
 * Draws the stage visualizer: analyzer bars with peak hold at the right edge, and a waterfall that
 * scrolls right to left at a fixed speed in pixels per second. The mix spectrum decides how loud
 * each row is; a BinPainter (spectrumPainters.ts) decides its color. Pixels go through
 * ImageData, so no per-bin color strings are built. Both canvases share one backing height.
 */
export class SpectrogramRenderer {
  private readonly analyzerCtx: CanvasRenderingContext2D | null;
  private readonly spectrogramCtx: CanvasRenderingContext2D | null;
  private readonly scratch: HTMLCanvasElement;
  private readonly scratchCtx: CanvasRenderingContext2D | null;
  private readonly weighting: Float32Array;
  private readonly scroll = new ScrollAccumulator();
  private readonly columnImages = new Map<number, PixelImage>();
  private analyzerImage: PixelImage | null = null;
  private rows: RowBins = rowBinRanges(0, 0);
  private rowBins = new Int32Array(0);
  private rowValues = new Float32Array(0);
  private rowPixels = new Uint32Array(0);
  private peaks = new Float32Array(0);
  private peakDecayRate = 0.98;
  private peakQuantization = 4;

  constructor(
    private readonly canvases: SpectrogramCanvases,
    private readonly layout: SpectrumLayout,
    createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')
  ) {
    this.analyzerCtx = canvases.analyzer.getContext('2d', { alpha: true });
    this.spectrogramCtx = canvases.spectrogram.getContext('2d', { alpha: true });
    this.scratch = createCanvas();
    this.scratchCtx = this.scratch.getContext('2d', { alpha: true });
    this.weighting = aWeightingLut(layout.frequencies);
    this.resize();
  }

  /** Peak hold decay per 60 fps frame (0.98 falls slowly). */
  setPeakDecayRate(rate: number): void {
    this.peakDecayRate = rate;
  }

  /** Peak marker steps in pixels, for the pixelated fall. */
  setPeakQuantization(quantization: number): void {
    this.peakQuantization = Math.max(1, quantization);
  }

  /** Call after the canvases change size: rebuilds the row map and images and clears everything. */
  resize(): void {
    const { analyzer, spectrogram } = this.canvases;
    const height = spectrogram.height;
    this.scratch.width = spectrogram.width;
    this.scratch.height = height;
    if (this.scratchCtx) this.scratchCtx.clearRect(0, 0, this.scratch.width, this.scratch.height);
    if (this.spectrogramCtx) this.spectrogramCtx.clearRect(0, 0, spectrogram.width, height);
    this.analyzerImage = null;
    if (this.analyzerCtx) {
      this.analyzerCtx.clearRect(0, 0, analyzer.width, analyzer.height);
      this.analyzerImage = createPixelImage(this.analyzerCtx, analyzer.width, height);
    }
    this.columnImages.clear();
    this.rows = rowBinRanges(height, this.layout.bins);
    this.rowBins = new Int32Array(height);
    this.rowValues = new Float32Array(height);
    this.rowPixels = new Uint32Array(height);
    this.peaks = new Float32Array(height);
    this.scroll.reset();
  }

  /**
   * Draws one frame from the mix spectrum, colored by the painter (already updated for this
   * frame); the waterfall moves pxPerSecond * dtMs / 1000 backing pixels.
   */
  draw(spectrum: Float32Array, painter: BinPainter, dtMs: number, pxPerSecond: number): void {
    const analyzerCtx = this.analyzerCtx;
    const spectrogramCtx = this.spectrogramCtx;
    const scratchCtx = this.scratchCtx;
    const analyzerImage = this.analyzerImage;
    if (!analyzerCtx || !spectrogramCtx || !scratchCtx || !analyzerImage) return;
    const { spectrogram } = this.canvases;
    const step = this.scroll.step(pxPerSecond, dtMs);

    if (step > 0) {
      // Shift through the scratch canvas, clearing both, so the new column starts transparent.
      scratchCtx.clearRect(0, 0, this.scratch.width, this.scratch.height);
      scratchCtx.drawImage(spectrogram, -step, 0);
      spectrogramCtx.clearRect(0, 0, spectrogram.width, spectrogram.height);
      spectrogramCtx.drawImage(this.scratch, 0, 0);
    }

    analyzerImage.pixels.fill(painter.analyzerBackground);
    if (isSilent(spectrum)) {
      // Keep painting so peak markers fall; rowBins keeps the last bin, so a marker keeps its color.
      this.rowValues.fill(0);
      this.paintBars(analyzerImage, painter, dtMs);
      if (step > 0 && painter.emptyPixel !== 0) this.paintColumn(spectrogramCtx, step, painter);
    } else {
      this.measureRows(spectrum, painter);
      this.paintBars(analyzerImage, painter, dtMs);
      if (step > 0) this.paintColumn(spectrogramCtx, step, painter);
    }
    analyzerCtx.putImageData(analyzerImage.image, 0, 0);
  }

  /** For each row: the loudest bin it covers, that bin's value index and its shaded pixel. */
  private measureRows(spectrum: Float32Array, painter: BinPainter): void {
    const { start, end } = this.rows;
    for (let y = 0; y < this.rowValues.length; y++) {
      let best = start[y];
      let bestValue = -1;
      for (let b = start[y]; b < end[y]; b++) {
        const value = 255 * this.weighting[b] * spectrum[b];
        if (value > bestValue) {
          bestValue = value;
          best = b;
        }
      }
      const index = valueIndex(bestValue);
      this.rowBins[y] = best;
      this.rowValues[y] = index;
      this.rowPixels[y] = painter.pixel(best, index);
    }
  }

  private paintBars(target: PixelImage, painter: BinPainter, dtMs: number): void {
    const { pixels, image } = target;
    const width = image.width;
    const widthPerValue = width / 256;
    const decay = peakDecayFactor(this.peakDecayRate, dtMs);
    const quantization = this.peakQuantization;
    for (let y = 0; y < this.rowValues.length; y++) {
      const value = this.rowValues[y];
      if (value > this.peaks[y]) this.peaks[y] = value;
      else this.peaks[y] *= decay;
      const rowStart = y * width;
      const barWidth = Math.min(width, (value * widthPerValue) | 0);
      if (barWidth > 0) pixels.fill(this.rowPixels[y], rowStart, rowStart + barWidth);
      const peakWidth =
        Math.floor(((this.peaks[y] * widthPerValue) | 0) / quantization) * quantization;
      const markerStart = Math.max(0, peakWidth - PEAK_MARKER_PX);
      const markerEnd = Math.min(width, peakWidth);
      if (markerEnd > markerStart) {
        const peakPixel = painter.peakPixel(this.rowBins[y], valueIndex(this.peaks[y]));
        pixels.fill(peakPixel, rowStart + markerStart, rowStart + markerEnd);
      }
    }
  }

  private paintColumn(ctx: CanvasRenderingContext2D, step: number, painter: BinPainter): void {
    const { image, pixels } = this.columnImage(ctx, step);
    for (let y = 0; y < this.rowValues.length; y++) {
      // A silent row takes the painter's empty pixel: transparent shows the stage background.
      pixels.fill(
        this.rowValues[y] > 0 ? this.rowPixels[y] : painter.emptyPixel,
        y * step,
        y * step + step
      );
    }
    ctx.putImageData(image, this.canvases.spectrogram.width - step, 0);
  }

  private columnImage(ctx: CanvasRenderingContext2D, step: number): PixelImage {
    let entry = this.columnImages.get(step);
    if (!entry) {
      entry = createPixelImage(ctx, step, this.rowValues.length);
      this.columnImages.set(step, entry);
    }
    return entry;
  }
}
