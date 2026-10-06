import { SpectrumLayout } from './contract';
import { PULSE_GAIN, PULSE_MAX_HZ, PULSE_MIN_HZ, PULSE_SMOOTHING_MS } from './constants';
import { smoothToward } from './levels';

/**
 * The audio-reactive pulse (dock glow, level indicator): RMS of the mix spectrum's mid band
 * (leads and snares), boosted, clipped at 1 and squared so loud hits stand out, then smoothed over
 * time. Replaces useAudioAnalysis, which did the same on an AnalyserNode once per frame.
 */
export class PulseMeter {
  /** First layout bin inside the band. */
  readonly fromBin: number;
  /** One past the last layout bin inside the band. */
  readonly toBin: number;
  private smoothed = 0;

  constructor(layout: SpectrumLayout, minHz = PULSE_MIN_HZ, maxHz = PULSE_MAX_HZ) {
    const f = layout.frequencies;
    let from = 0;
    while (from < f.length && f[from] < minHz) from++;
    let to = from;
    while (to < f.length && f[to] <= maxHz) to++;
    this.fromBin = from;
    this.toBin = to;
  }

  /** The current smoothed pulse, 0..1. */
  get value(): number {
    return this.smoothed;
  }

  /** This spectrum's unsmoothed pulse, 0..1. */
  target(spectrum: Float32Array): number {
    const n = this.toBin - this.fromBin;
    if (n <= 0) return 0;
    let sum = 0;
    for (let b = this.fromBin; b < this.toBin; b++) sum += spectrum[b] * spectrum[b];
    const boosted = Math.min(Math.sqrt(sum / n) * PULSE_GAIN, 1);
    return boosted * boosted;
  }

  /** Smooths toward this spectrum's target over dtMs and returns the new value. */
  update(spectrum: Float32Array, dtMs: number): number {
    this.smoothed = smoothToward(
      this.smoothed,
      this.target(spectrum),
      dtMs,
      PULSE_SMOOTHING_MS,
      PULSE_SMOOTHING_MS
    );
    return this.smoothed;
  }

  /** Back to 0, for example when the pulse restarts after a pause. */
  reset(): void {
    this.smoothed = 0;
  }
}
