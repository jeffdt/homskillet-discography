import { SpectrumLayout } from './contract';
import { SPECTRUM_BINS, SPECTRUM_MAX_HZ, SPECTRUM_MIN_HZ } from './constants';

/** Log-spaced bin centers, the same formula as showcqtbar's cqt_bin_to_freq. */
export function createSpectrumLayout(
  bins = SPECTRUM_BINS,
  minHz = SPECTRUM_MIN_HZ,
  maxHz = SPECTRUM_MAX_HZ
): SpectrumLayout {
  const frequencies = new Float32Array(bins);
  const logMin = Math.log(minHz);
  const logMax = Math.log(maxHz);
  for (let b = 0; b < bins; b++) {
    frequencies[b] = Math.exp(logMin + ((b + 0.5) * (logMax - logMin)) / bins);
  }
  return { bins, minHz, maxHz, frequencies };
}

/**
 * Maps an FFT magnitude spectrum onto a SpectrumLayout. A layout bin wider than one FFT bin takes
 * the loudest FFT bin inside its edges; a narrower one interpolates linearly at its center.
 */
export class FftBinMap {
  private readonly from: Int32Array;
  private readonly to: Int32Array;
  private readonly fraction: Float32Array;
  private readonly interpolate: Uint8Array;

  constructor(layout: SpectrumLayout, fftSize: number, sampleRate: number) {
    const hz = sampleRate / fftSize;
    const lastBin = fftSize / 2 - 1;
    const halfStep = Math.exp(
      (Math.log(layout.maxHz) - Math.log(layout.minHz)) / (2 * layout.bins)
    );
    this.from = new Int32Array(layout.bins);
    this.to = new Int32Array(layout.bins);
    this.fraction = new Float32Array(layout.bins);
    this.interpolate = new Uint8Array(layout.bins);
    for (let b = 0; b < layout.bins; b++) {
      const center = layout.frequencies[b];
      const low = center / halfStep;
      const high = center * halfStep;
      if (high - low < hz) {
        const k = Math.min(center / hz, lastBin - 1e-6);
        this.from[b] = Math.floor(k);
        this.to[b] = this.from[b] + 1;
        this.fraction[b] = k - this.from[b];
        this.interpolate[b] = 1;
      } else {
        this.from[b] = Math.min(Math.ceil(low / hz), lastBin);
        this.to[b] = Math.max(this.from[b], Math.min(Math.floor(high / hz), lastBin));
      }
    }
  }

  /** Writes one value per layout bin into out from magnitudes (fftSize / 2 long). */
  map(magnitudes: Float32Array, out: Float32Array): void {
    for (let b = 0; b < out.length; b++) {
      const from = this.from[b];
      if (this.interpolate[b]) {
        const t = this.fraction[b];
        out[b] = magnitudes[from] * (1 - t) + magnitudes[from + 1] * t;
      } else {
        let max = 0;
        for (let k = from; k <= this.to[b]; k++) if (magnitudes[k] > max) max = magnitudes[k];
        out[b] = max;
      }
    }
  }
}
