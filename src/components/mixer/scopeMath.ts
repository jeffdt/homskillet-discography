/** The quietest level the meter shows; anything below reads as empty. */
export const METER_FLOOR_DB = -48;
/** Samples per scope trace: about 21 ms at the 24 kHz tap rate. */
export const SCOPE_SAMPLES = 512;
/** Points per scope trace. */
export const SCOPE_POINTS = 128;
/** The scope's SVG viewBox width; the SVG stretches it to the strip. */
export const SCOPE_WIDTH = 128;
/** The scope's SVG viewBox height; the SVG stretches it to the strip. */
export const SCOPE_HEIGHT = 32;

const MID = SCOPE_HEIGHT / 2;
const X_STEP = SCOPE_WIDTH / (SCOPE_POINTS - 1);

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Meter position 0..1 for an RMS level 0..1, on a decibel scale from METER_FLOOR_DB to 0 dB. */
export function levelToMeter(rms: number): number {
  if (!(rms > 0)) return 0;
  const db = 20 * Math.log10(rms);
  return Math.min(1, Math.max(0, 1 - db / METER_FLOOR_DB));
}

/**
 * Start of the newest span-sample window that begins on a rising zero crossing, so a steady tone
 * draws in the same place every frame. Falls back to the newest window when nothing crosses.
 */
export function findTrigger(waveform: ArrayLike<number>, span: number): number {
  const latest = waveform.length - span;
  if (latest <= 0) return 0;
  for (let i = latest; i >= 1; i--) {
    if (waveform[i - 1] < 0 && waveform[i] >= 0) return i;
  }
  return latest;
}

/**
 * SVG path data for span samples of waveform from start: SCOPE_POINTS points across the
 * SCOPE_WIDTH x SCOPE_HEIGHT box, 0 in the middle, -1..1 filling the height less 1 unit each side.
 */
export function scopePath(waveform: ArrayLike<number>, start: number, span: number): string {
  const step = span / SCOPE_POINTS;
  let d = '';
  for (let p = 0; p < SCOPE_POINTS; p++) {
    const sample = waveform[start + Math.floor(p * step)] || 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    d += (p === 0 ? 'M' : 'L') + round1(p * X_STEP) + ' ' + round1(MID - clamped * (MID - 1));
  }
  return d;
}

/** The trace of silence: what a scope shows before its first frame. */
export const FLAT_SCOPE_PATH = scopePath([], 0, SCOPE_SAMPLES);
