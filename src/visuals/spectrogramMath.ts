/** Waterfall speed in CSS pixels per second (the old 2 px per frame at 60 fps). */
export const SPECTROGRAM_SCROLL_PX_PER_S = 120;

/** Peak decay rates are given per frame at 60 fps. */
export const PEAK_DECAY_REFERENCE_MS = 1000 / 60;

/** Turns a speed and elapsed time into whole pixels per frame, carrying the fraction forward. */
export class ScrollAccumulator {
  private remainder = 0;

  /** Whole pixels to scroll for this frame. */
  step(pxPerSecond: number, dtMs: number): number {
    this.remainder += (pxPerSecond * dtMs) / 1000;
    const whole = Math.floor(this.remainder + 1e-9);
    this.remainder -= whole;
    return whole;
  }

  reset(): void {
    this.remainder = 0;
  }
}

/** Factor that decays a peak over dtMs, given a decay rate per 60 fps frame. */
export function peakDecayFactor(ratePerFrame: number, dtMs: number): number {
  return Math.pow(ratePerFrame, dtMs / PEAK_DECAY_REFERENCE_MS);
}

/** A-weighting gain (1 at 1 kHz) times 1.5, exactly as Spectrogram.js computed it. */
function aWeighting(f: number): number {
  const f2 = f * f;
  return (
    (1.5 * 1.2588966 * 148840000 * f2 * f2) /
    ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000))
  );
}

/** Per-bin weights 0.5 + 0.5 * A(f), as Spectrogram.js applied them. */
export function aWeightingLut(frequencies: Float32Array): Float32Array {
  return Float32Array.from(frequencies, (f) => 0.5 + 0.5 * aWeighting(f));
}

/** A palette CSS variable's value, for canvas code that cannot use var(); fallback outside a browser. */
export function readCssColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** The bins each canvas row shows: rows [start, end), low frequencies at the bottom. */
export interface RowBins {
  readonly start: Int32Array;
  readonly end: Int32Array;
}

/** Splits bins over rows: a row taller than a bin repeats it; a shorter one covers several. */
export function rowBinRanges(height: number, bins: number): RowBins {
  const start = new Int32Array(height);
  const end = new Int32Array(height);
  for (let y = 0; y < height; y++) {
    const fromBottom = height - 1 - y;
    const first = Math.floor((fromBottom * bins) / height);
    start[y] = first;
    end[y] = Math.min(bins, Math.max(first + 1, Math.floor(((fromBottom + 1) * bins) / height)));
  }
  return { start, end };
}

/** A spectrum value (0..255 scale) as an integer value index 0..255. */
export function valueIndex(value: number): number {
  return value <= 0 ? 0 : value >= 255 ? 255 : value | 0;
}
