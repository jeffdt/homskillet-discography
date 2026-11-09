import { buildGradientLut } from './color';

/**
 * Decides spectrum pixel colors (spec 3.2); SpectrogramRenderer decides geometry and loudness.
 * Pixels are packed with packPixel.
 */
export interface BinPainter {
  /** Opaque pixel for a row whose loudest bin is `bin` at value index 0..255. */
  pixel(bin: number, valueIndex: number): number;
  /** Pixel for a falling peak marker. */
  peakPixel(bin: number, valueIndex: number): number;
  /** Pixel for a silent waterfall row: 0 (transparent) or opaque. */
  readonly emptyPixel: number;
  /** Pixel behind the analyzer bars. */
  readonly analyzerBackground: number;
}

/** The old visualizer's look: one gradient indexed by loudness, channels ignored. */
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

  pixel(_bin: number, index: number): number {
    return this.lut[index];
  }

  peakPixel(_bin: number, index: number): number {
    return this.lut[index];
  }
}
