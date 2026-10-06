import chroma from 'chroma-js';

/** The visualizer's default palette (moved from Spectrogram.js). */
export const DEFAULT_COLOR_PALETTE = [
  '#000000',
  '#0000a0',
  '#6000a0',
  '#962761',
  '#dd1440',
  '#f0b000',
  '#ffffa0',
  '#ffffff',
];

/** Waterfall speed in CSS pixels per second (the old 2 px per frame at 60 fps). */
export const SPECTROGRAM_SCROLL_PX_PER_S = 120;

/** Peak decay rates are given per frame at 60 fps. */
export const PEAK_DECAY_REFERENCE_MS = 1000 / 60;

/** 256 hex colors spanning a palette, so drawing never calls chroma per bin. */
export function buildColorLut(colors: string[]): string[] {
  const palette = Array.isArray(colors) && colors.length >= 2 ? colors : DEFAULT_COLOR_PALETTE;
  const scale = chroma.scale(palette).domain([0, 255]);
  return Array.from({ length: 256 }, (_, i) => scale(i).hex());
}

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
