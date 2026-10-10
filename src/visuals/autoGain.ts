import { smoothToward } from '../audio/data/levels';

/** How an oscilloscope auto gain behaves. */
export interface AutoGainTuning {
  /** Window peaks below this count as this loud, so near-silence is not blown up into a full trace. */
  floorPeak: number;
  /** Where the window's peak lands after gain: 1 fills the height. */
  targetPeak: number;
  /** Time constant of the gain climbing back when the wave gets quieter. */
  releaseMs: number;
}

/** The largest |sample| in span samples of waveform from start (clamped to the data). */
export function windowPeak(waveform: ArrayLike<number>, start: number, span: number): number {
  let peak = 0;
  const end = Math.min(waveform.length, start + span);
  for (let i = Math.max(0, start); i < end; i++) {
    const magnitude = Math.abs(waveform[i]);
    if (magnitude > peak) peak = magnitude;
  }
  return peak;
}

/** The gain that puts this window peak at the target (capped by the floor for near-silence). */
export function targetGain(peak: number, tuning: AutoGainTuning): number {
  return tuning.targetPeak / Math.max(peak, tuning.floorPeak);
}

/**
 * The auto gain after dtMs: it drops at once when the wave gets louder, so a trace never clips, and
 * climbs back slowly when it gets quieter, so the trace does not pump.
 */
export function nextGain(
  current: number,
  peak: number,
  dtMs: number,
  tuning: AutoGainTuning
): number {
  const target = targetGain(peak, tuning);
  if (target <= current) return target;
  return smoothToward(current, target, dtMs, tuning.releaseMs, tuning.releaseMs);
}
