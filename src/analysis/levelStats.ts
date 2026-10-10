import { SILENT_VOICE_RMS } from '../visuals/BinColorizer';

/** Buckets of the |sample| histogram behind p95Abs: a resolution of 0.0005 of full scale. */
export const ABS_HISTOGRAM_BINS = 2000;
/** Samples at or under this |value| are a voice resting at zero and do not count toward rms and p95Abs. */
export const ACTIVE_SAMPLE_ABS = 1e-4;

/** One voice's level profile. Samples are taps: 1 is the voice at int16 full scale on both stereo outputs. */
export interface VoiceLevelProfile {
  index: number;
  name: string;
  /** Largest |sample|. */
  peak: number;
  /** RMS of the samples above ACTIVE_SAMPLE_ABS. */
  rms: number;
  /** 95th percentile of |sample| over the same samples. */
  p95Abs: number;
  /** Share of frames, 0..100, whose window RMS is under SILENT_VOICE_RMS. */
  silentPct: number;
  /** Largest |sample| of each frame's window, over the non-silent frames: what a scope's auto gain sees. */
  windowPeak: { p10: number; p50: number; p90: number; p99: number };
  /** VoiceData.rms, smoothed as the app does, over the non-silent frames: what scope reactivity sees. */
  level: { p50: number; p95: number; p99: number };
  /** RMS of each whole second of samples (silence included); only with the timeline option. */
  rmsBySecond?: number[];
}

/** Value at the floor of p * (n - 1) in an ascending list; 0 for an empty list. */
export function quantile(sorted: ArrayLike<number>, p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor(p * (sorted.length - 1))];
}

/** Rounds to 4 decimals, enough for levels and small in JSON. */
export function round4(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

function sortedCopy(values: number[]): Float64Array {
  return Float64Array.from(values).sort();
}

/** Accumulates one voice's samples and per-frame window measurements into a VoiceLevelProfile. */
export class VoiceLevelStats {
  private readonly histogram = new Float64Array(ABS_HISTOGRAM_BINS);
  private peak = 0;
  private sumSquares = 0;
  private active = 0;
  private frames = 0;
  private readonly windowPeaks: number[] = [];
  private readonly levels: number[] = [];
  private secondSquares = 0;
  private secondCount = 0;
  private readonly seconds: number[] = [];

  constructor(
    readonly index: number,
    readonly name: string,
    private readonly samplesPerSecond: number,
    private readonly timeline: boolean
  ) {}

  /** Feeds the next tap sample. */
  addSample(sample: number): void {
    const magnitude = Math.abs(sample);
    if (magnitude > this.peak) this.peak = magnitude;
    if (magnitude > ACTIVE_SAMPLE_ABS) {
      this.active++;
      this.sumSquares += sample * sample;
      this.histogram[Math.min(ABS_HISTOGRAM_BINS - 1, (magnitude * ABS_HISTOGRAM_BINS) | 0)]++;
    }
    if (!this.timeline) return;
    this.secondSquares += sample * sample;
    if (++this.secondCount === this.samplesPerSecond) {
      this.seconds.push(round4(Math.sqrt(this.secondSquares / this.secondCount)));
      this.secondSquares = 0;
      this.secondCount = 0;
    }
  }

  /** Feeds one frame: the RMS and peak of its window and the smoothed level. */
  addFrame(windowRms: number, windowPeak: number, level: number): void {
    this.frames++;
    if (windowRms < SILENT_VOICE_RMS) return;
    this.windowPeaks.push(windowPeak);
    this.levels.push(level);
  }

  /** The profile so far, rounded to 4 decimals. */
  profile(): VoiceLevelProfile {
    const peaks = sortedCopy(this.windowPeaks);
    const levels = sortedCopy(this.levels);
    const profile: VoiceLevelProfile = {
      index: this.index,
      name: this.name,
      peak: round4(this.peak),
      rms: round4(this.active ? Math.sqrt(this.sumSquares / this.active) : 0),
      p95Abs: round4(this.histogramQuantile(0.95)),
      silentPct: this.frames
        ? Math.round(1000 * (1 - this.windowPeaks.length / this.frames)) / 10
        : 100,
      windowPeak: {
        p10: round4(quantile(peaks, 0.1)),
        p50: round4(quantile(peaks, 0.5)),
        p90: round4(quantile(peaks, 0.9)),
        p99: round4(quantile(peaks, 0.99)),
      },
      level: {
        p50: round4(quantile(levels, 0.5)),
        p95: round4(quantile(levels, 0.95)),
        p99: round4(quantile(levels, 0.99)),
      },
    };
    if (this.timeline) profile.rmsBySecond = [...this.seconds];
    return profile;
  }

  /** Lower edge of the histogram bucket where the running count reaches p of the active samples. */
  private histogramQuantile(p: number): number {
    if (this.active === 0) return 0;
    let count = 0;
    for (let i = 0; i < ABS_HISTOGRAM_BINS; i++) {
      count += this.histogram[i];
      if (count >= p * this.active) return i / ABS_HISTOGRAM_BINS;
    }
    return 1;
  }
}
