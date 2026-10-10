import { ScopeLayoutId } from '../config/stageSettings';
import type { AutoGainTuning } from './autoGain';

/** Horizontal backing-store pixels between scope trace points. */
export const SCOPE_POINT_PX = 2;
/** Share of a lane's height a full-scale (-1..1) wave fills. */
export const LANE_FILL = 0.8;
/** Opacity of a voice you cannot hear (muted or not soloed), drawn as a ghost like the Mixer's. */
export const GHOST_ALPHA = 0.3;

/**
 * Start of the newest span-sample window that begins on a rising zero crossing, so a steady tone
 * draws in the same place every frame, like a hardware oscilloscope's trigger. Falls back to the
 * newest window when nothing crosses, and to 0 when span covers the whole waveform.
 */
export function findTrigger(waveform: ArrayLike<number>, span: number): number {
  const latest = waveform.length - span;
  if (latest <= 0) return 0;
  for (let i = latest; i >= 1; i--) {
    if (waveform[i - 1] < 0 && waveform[i] >= 0) return i;
  }
  return latest;
}

/** The band of the canvas a lane occupies, lanes stacked top to bottom. */
export function laneBox(
  lane: number,
  count: number,
  height: number
): { top: number; height: number } {
  const laneHeight = height / count;
  return { top: lane * laneHeight, height: laneHeight };
}

/** Points around each ring. */
export const RING_POINTS = 240;
/** Ring turn speed: about 0.12 radians a second. */
export const RING_SPEED_RAD_PER_MS = 0.00012;
/** Phase portraits plot each sample against the one this many samples earlier (1 ms at 24 kHz). */
export const PHASE_DELAY_SAMPLES = 24;
/** Newest samples a phase portrait draws. */
export const PHASE_WINDOW_SAMPLES = 420;
/** Trails are given as the share of the picture kept per frame at 60 fps. */
export const TRAIL_REFERENCE_MS = 1000 / 60;
/** Smallest per-frame fade, so 8-bit rounding never leaves ghosts brighter than about 3 percent. */
export const MIN_TRAIL_FADE = 0.06;
/** RMS that counts as full level for reactivity. */
export const LEVEL_FULL_RMS = 0.6;
/** A rise this far above the slow follower is a new note and flashes. */
export const FLASH_RISE = 0.12;
/** Time constant of the slow rms follower. */
export const FLASH_FOLLOW_MS = 200;
/** Time constant of the flash decay. */
export const FLASH_DECAY_MS = 120;

const RING_OUTER = 0.47;
const RING_INNER = 0.28;
const RING_BANDS = 0.72;
const RING_SWING = 0.95;
const OVERLAID_AMPLITUDE = 0.4;
const PHASE_SIZE = 0.4;

/** One voice's trace in backing pixels, reused every frame. */
export interface TraceBuffer {
  xs: Float32Array;
  ys: Float32Array;
  count: number;
  /** True when the last point joins the first (rings). */
  closed: boolean;
  /** The center line y to fill down to, or NaN when the layout has none. */
  baseline: number;
}

/** A trace buffer that holds `capacity` points. */
export function createTraceBuffer(capacity: number): TraceBuffer {
  return {
    xs: new Float32Array(capacity),
    ys: new Float32Array(capacity),
    count: 0,
    closed: false,
    baseline: NaN,
  };
}

/** Points any layout needs at this canvas width. */
export function traceCapacity(width: number): number {
  return Math.max(Math.floor(width / SCOPE_POINT_PX) + 1, RING_POINTS, PHASE_WINDOW_SAMPLES);
}

/**
 * Stage scope auto gain. Measured 2026-10-10 over the 120-track catalog: voice windows peak at 0.03
 * to 0.14 of full scale (median), so a gain of 1 filled a few percent of a lane. Target 0.9 fills it;
 * the 0.05 floor lifts every voice's median window past half height while a voice at the silence
 * threshold (peak about 0.0015) stays under 3 percent.
 */
export const SCOPE_AUTO_GAIN: AutoGainTuning = { floorPeak: 0.05, targetPeak: 0.9, releaseMs: 500 };
/**
 * Gain with auto gain off: the pulse and VRC6 voices' p99 window peak is 0.22 to 0.30, so 3.5 puts
 * their loudest notes near full height and keeps channels' relative loudness; DMC hits may clip.
 */
export const SCOPE_FIXED_GAIN = 3.5;

/** What buildTrace needs to place one voice's trace. */
export interface TraceArgs {
  layout: ScopeLayoutId;
  waveform: ArrayLike<number>;
  /** Samples per trace (zoom); ignored by phase portraits. */
  span: number;
  lane: number;
  lanes: number;
  width: number;
  height: number;
  /** Ring rotation in radians. */
  angle: number;
  /** Multiplies every sample before clamping to -1..1 (auto gain); 1 when omitted. */
  gain?: number;
}

function unit(sample: number | undefined): number {
  const s = sample || 0;
  return s > 1 ? 1 : s < -1 ? -1 : s;
}

/** Columns and rows of the phase portrait grid, shaped like the window. */
export function phaseGrid(
  lanes: number,
  width: number,
  height: number
): { cols: number; rows: number } {
  const count = Math.max(1, lanes);
  const cols = Math.min(
    count,
    Math.max(1, Math.round(Math.sqrt((count * width) / Math.max(1, height))))
  );
  return { cols, rows: Math.ceil(count / cols) };
}

/** Center and half-size of a lane's phase portrait cell. */
export function phaseCell(
  lane: number,
  lanes: number,
  width: number,
  height: number
): { cx: number; cy: number; half: number } {
  const { cols, rows } = phaseGrid(lanes, width, height);
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  return {
    cx: ((lane % cols) + 0.5) * cellWidth,
    cy: (Math.floor(lane / cols) + 0.5) * cellHeight,
    half: PHASE_SIZE * Math.min(cellWidth, cellHeight),
  };
}

/** Resting radius and band width of a lane's ring, first lane innermost. */
export function ringRadius(
  lane: number,
  lanes: number,
  width: number,
  height: number
): { radius: number; band: number } {
  const outer = RING_OUTER * Math.min(width, height);
  const band = (RING_BANDS * outer) / Math.max(1, lanes);
  return { radius: RING_INNER * outer + (lane + 0.5) * band, band };
}

/** Fills out with one voice's trace for the layout (spec 4.1). */
export function buildTrace(args: TraceArgs, out: TraceBuffer): void {
  const { layout, waveform, span, lane, lanes, width, height, angle } = args;
  const gain = args.gain ?? 1;
  const last = waveform.length - 1;
  if (layout === 'phase') {
    const { cx, cy, half } = phaseCell(lane, lanes, width, height);
    const count = Math.max(
      0,
      Math.min(PHASE_WINDOW_SAMPLES, waveform.length - PHASE_DELAY_SAMPLES)
    );
    const from = waveform.length - count;
    for (let k = 0; k < count; k++) {
      const i = from + k;
      out.xs[k] = cx + unit(waveform[i] * gain) * half;
      out.ys[k] = cy - unit(waveform[i - PHASE_DELAY_SAMPLES] * gain) * half;
    }
    out.count = count;
    out.closed = false;
    out.baseline = NaN;
    return;
  }
  const start = findTrigger(waveform, span);
  if (layout === 'rings') {
    const { radius, band } = ringRadius(lane, lanes, width, height);
    const cx = width / 2;
    const cy = height / 2;
    for (let k = 0; k < RING_POINTS; k++) {
      const s = unit(waveform[Math.min(last, start + Math.floor((k * span) / RING_POINTS))] * gain);
      const a = angle + (2 * Math.PI * k) / RING_POINTS;
      const r = radius + s * band * RING_SWING;
      out.xs[k] = cx + Math.cos(a) * r;
      out.ys[k] = cy + Math.sin(a) * r;
    }
    out.count = RING_POINTS;
    out.closed = true;
    out.baseline = NaN;
    return;
  }
  let mid: number;
  let amplitude: number;
  if (layout === 'overlaid') {
    mid = height / 2;
    amplitude = OVERLAID_AMPLITUDE * height;
  } else {
    const box = laneBox(lane, lanes, height);
    mid = box.top + box.height / 2;
    amplitude = (box.height * LANE_FILL) / 2;
  }
  const points = Math.max(2, Math.floor(width / SCOPE_POINT_PX) + 1);
  const xStep = width / (points - 1);
  const sampleStep = span / (points - 1);
  for (let p = 0; p < points; p++) {
    out.xs[p] = p * xStep;
    out.ys[p] =
      mid - unit(waveform[Math.min(last, start + Math.floor(p * sampleStep))] * gain) * amplitude;
  }
  out.count = points;
  out.closed = false;
  out.baseline = mid;
}

/** Share of the picture to erase this frame: 1 without trails, else frame-rate independent with a floor. */
export function trailFade(trails: number, dtMs: number): number {
  if (!(trails > 0)) return 1;
  return Math.max(MIN_TRAIL_FADE, 1 - Math.pow(Math.min(trails, 1), dtMs / TRAIL_REFERENCE_MS));
}

/** A voice's rms as a 0..1 level for reactivity. */
export function voiceLevel(rms: number): number {
  return rms > 0 ? Math.min(1, rms / LEVEL_FULL_RMS) : 0;
}

/** How hard a trace reacts this frame: reactivity times level and flash. */
export function reactiveEnergy(reactivity: number, level: number, flash: number): number {
  return reactivity * (1.4 * level + flash);
}

/** Per-voice note-onset flash: 1 when rms jumps above a slow follower, then decaying. */
export class FlashFollower {
  private readonly slow: Float32Array;
  private readonly flash: Float32Array;

  constructor(voices: number) {
    this.slow = new Float32Array(voices);
    this.flash = new Float32Array(voices);
  }

  /** Feeds one voice's rms for this frame and returns its flash, 0..1. */
  update(voice: number, rms: number, dtMs: number): number {
    if (rms > this.slow[voice] + FLASH_RISE) this.flash[voice] = 1;
    else this.flash[voice] *= Math.exp(-dtMs / FLASH_DECAY_MS);
    this.slow[voice] += (rms - this.slow[voice]) * (1 - Math.exp(-dtMs / FLASH_FOLLOW_MS));
    return this.flash[voice];
  }

  /** Forgets every voice (a new track). */
  reset(): void {
    this.slow.fill(0);
    this.flash.fill(0);
  }
}
