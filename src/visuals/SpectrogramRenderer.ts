import { SpectrumLayout } from '../audio/data/contract';
import { Rgb, packPixel } from './color';
import {
  RowBins,
  ScrollAccumulator,
  ShadeTable,
  aWeightingLut,
  buildShadeTable,
  peakDecayFactor,
  rowBinRanges,
} from './spectrogramMath';

/** The two canvases the stage draws on. */
export interface SpectrogramCanvases {
  analyzer: HTMLCanvasElement;
  spectrogram: HTMLCanvasElement;
}

/** The fixed colors every channel color is shaded between: silence and the loudest peaks. */
export interface StageShades {
  background: Rgb;
  highlight: Rgb;
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

function valueIndex(value: number): number {
  return value <= 0 ? 0 : value >= 255 ? 255 : value | 0;
}

function isSilent(spectrum: Float32Array): boolean {
  for (let i = 0; i < spectrum.length; i++) if (spectrum[i] !== 0) return false;
  return true;
}

/**
 * Draws the stage visualizer: analyzer bars with peak hold at the right edge, and a waterfall that
 * scrolls right to left at a fixed speed in pixels per second. The mix spectrum decides how loud
 * each row is; the per-bin channel colors (BinColorizer) decide its color, shaded from the
 * background through the channel color toward the highlight as it gets louder. Pixels go through
 * ImageData, so no per-bin color strings are built. Both canvases share one backing height.
 */
export class SpectrogramRenderer {
  private readonly analyzerCtx: CanvasRenderingContext2D | null;
  private readonly spectrogramCtx: CanvasRenderingContext2D | null;
  private readonly scratch: HTMLCanvasElement;
  private readonly scratchCtx: CanvasRenderingContext2D | null;
  private readonly weighting: Float32Array;
  private readonly shade: ShadeTable = buildShadeTable();
  private readonly scroll = new ScrollAccumulator();
  private readonly backgroundPixel: number;
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
    private readonly shades: StageShades,
    createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')
  ) {
    this.analyzerCtx = canvases.analyzer.getContext('2d', { alpha: true });
    this.spectrogramCtx = canvases.spectrogram.getContext('2d', { alpha: true });
    this.scratch = createCanvas();
    this.scratchCtx = this.scratch.getContext('2d', { alpha: true });
    this.weighting = aWeightingLut(layout.frequencies);
    const [r, g, b] = shades.background;
    this.backgroundPixel = packPixel(r, g, b, 255);
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
   * Draws one frame from the mix spectrum and the per-bin colors (r, g, b per bin, 0..255); the
   * waterfall moves pxPerSecond * dtMs / 1000 backing pixels.
   */
  draw(spectrum: Float32Array, binColors: Float32Array, dtMs: number, pxPerSecond: number): void {
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

    analyzerImage.pixels.fill(this.backgroundPixel);
    if (isSilent(spectrum)) {
      // Keep painting so peak markers fall; rowBins keeps the last bin, so a marker keeps its color.
      this.rowValues.fill(0);
      this.paintBars(analyzerImage, binColors, dtMs);
    } else {
      this.measureRows(spectrum, binColors);
      this.paintBars(analyzerImage, binColors, dtMs);
      if (step > 0) this.paintColumn(spectrogramCtx, step);
    }
    analyzerCtx.putImageData(analyzerImage.image, 0, 0);
  }

  /** For each row: the loudest bin it covers, that bin's value index and its shaded pixel. */
  private measureRows(spectrum: Float32Array, binColors: Float32Array): void {
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
      this.rowPixels[y] = this.shadePixel(binColors, best, index);
    }
  }

  private paintBars(target: PixelImage, binColors: Float32Array, dtMs: number): void {
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
        const peakPixel = this.shadePixel(binColors, this.rowBins[y], valueIndex(this.peaks[y]));
        pixels.fill(peakPixel, rowStart + markerStart, rowStart + markerEnd);
      }
    }
  }

  private paintColumn(ctx: CanvasRenderingContext2D, step: number): void {
    const { image, pixels } = this.columnImage(ctx, step);
    for (let y = 0; y < this.rowValues.length; y++) {
      // A silent row stays transparent, so the stage background shows through.
      pixels.fill(this.rowValues[y] > 0 ? this.rowPixels[y] : 0, y * step, y * step + step);
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

  /** The opaque pixel for a bin's color at a value index. */
  private shadePixel(binColors: Float32Array, bin: number, index: number): number {
    const c = this.shade.channel[index];
    const h = this.shade.highlight[index];
    const k = 1 - c - h;
    const o = bin * 3;
    const background = this.shades.background;
    const highlight = this.shades.highlight;
    return packPixel(
      (background[0] * k + binColors[o] * c + highlight[0] * h + 0.5) | 0,
      (background[1] * k + binColors[o + 1] * c + highlight[1] * h + 0.5) | 0,
      (background[2] * k + binColors[o + 2] * c + highlight[2] * h + 0.5) | 0,
      255
    );
  }
}
