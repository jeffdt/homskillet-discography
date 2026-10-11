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

/** Points around each ring: enough for about 8 points per lobe of a C5 at the default zoom. */
export const RING_POINTS = 720;
/** Ring turn speed: about 0.12 radians a second. */
export const RING_SPEED_RAD_PER_MS = 0.00012;
/**
 * A pitched ring wraps this many zoom spans of time, so lobes count pitch: at the default zoom a
 * 65 Hz C2 draws 4, C3 8, C4 16 and C5 33, where one span gave a bass note one lopsided bulge.
 */
export const RING_SPAN_FACTOR = 3;
/** Phase portraits plot each sample against the one this many samples earlier (1 ms at 24 kHz). */
export const PHASE_DELAY_SAMPLES = 24;
/** Newest samples a phase portrait draws. */
export const PHASE_WINDOW_SAMPLES = 420;
/** Fewest samples a pitched phase portrait draws, so a high note still shows a few cycles. */
export const PHASE_MIN_SPAN = 48;
/** Cycles a pitched phase portrait draws: one is the shape, more stack copies as the volume moves. */
const PHASE_CYCLES = 2;
/** Shortest period estimatePeriod reports (3 kHz at 24 kHz); anything faster is treated as unpitched. */
const MIN_PERIOD = 8;
/** How estimatePeriod decides a wave is pitched. */
export interface PeriodTuning {
  /** How far past zero, as a share of the peak, the wave must swing for a crossing to count. */
  hysteresis: number;
  /** How far a gap may differ from the median and still agree; vibrato and slides move it a little. */
  tolerance: number;
  /** Share of the cycle-to-cycle gaps that must agree with the median. */
  agreement: number;
}

/** Chosen 2026-10-11 against an autocorrelation reference over 10 catalog tracks: right 85%, wrong 2.4%. */
export const PERIOD_TUNING: PeriodTuning = { hysteresis: 0.1, tolerance: 0.12, agreement: 0.7 };

/** How long a voice keeps its last period through frames where none is found. */
export const PERIOD_HOLD_MS = 150;

/** Each voice's last found period, held briefly so a portrait does not flicker between styles. */
export class PeriodHold {
  private readonly periods = new Map<number, { period: number; ageMs: number }>();

  /** The period to draw voice index with this frame, given this frame's estimate. */
  update(index: number, estimate: number | null, dtMs: number): number | null {
    if (estimate !== null) {
      this.periods.set(index, { period: estimate, ageMs: 0 });
      return estimate;
    }
    const held = this.periods.get(index);
    if (!held) return null;
    held.ageMs += dtMs;
    if (held.ageMs <= PERIOD_HOLD_MS) return held.period;
    this.periods.delete(index);
    return null;
  }
}

/**
 * The wave's period in samples, from the gaps between its rising zero crossings, or null for
 * silence, noise or less than one whole cycle. The taps carry no DC (the NES output filter removes
 * it), so zero is the middle. A crossing needs the wave to have dipped below zero by a twentieth of
 * its peak first, so the slow sag of a held NES level and small wiggles never count as a new cycle.
 * Several gaps must mostly agree; one gap is trusted only for a cycle too long to fit three crossings.
 */
export function estimatePeriod(
  waveform: ArrayLike<number>,
  tuning: PeriodTuning = PERIOD_TUNING
): number | null {
  let peak = 0;
  for (let i = 0; i < waveform.length; i++) peak = Math.max(peak, Math.abs(waveform[i]));
  if (!(peak > 1e-4)) return null;
  const threshold = tuning.hysteresis * peak;
  const crossings: number[] = [];
  let armed = false;
  for (let i = 0; i < waveform.length; i++) {
    if (waveform[i] < -threshold) armed = true;
    else if (armed && waveform[i] >= threshold) {
      crossings.push(i);
      armed = false;
    }
  }
  if (crossings.length < 2) return null;
  const gaps = crossings.slice(1).map((at, k) => at - crossings[k]);
  if (gaps.length === 1) return gaps[0] * 3 > waveform.length ? gaps[0] : null;
  const median = [...gaps].sort((x, y) => x - y)[Math.floor(gaps.length / 2)];
  const agreeing = gaps.filter((gap) => Math.abs(gap - median) <= tuning.tolerance * median);
  if (median < MIN_PERIOD || agreeing.length < tuning.agreement * gaps.length) return null;
  return agreeing.reduce((sum, gap) => sum + gap, 0) / agreeing.length;
}

/**
 * Which samples a phase portrait plots. A pitched wave is plotted against itself a quarter cycle
 * earlier over two cycles, so a square draws a box, a triangle a diamond and a sine a circle at any
 * pitch; long cycles skip samples (stride) to stay within PHASE_WINDOW_SAMPLES points. Without a
 * clear pitch it falls back to a fixed 1 ms delay over the newest PHASE_WINDOW_SAMPLES. The period
 * is estimated from the waveform unless one is given (null means unpitched).
 */
export function phaseWindow(
  waveform: ArrayLike<number>,
  period: number | null = estimatePeriod(waveform)
): {
  delay: number;
  span: number;
  stride: number;
} {
  if (period === null) {
    return { delay: PHASE_DELAY_SAMPLES, span: PHASE_WINDOW_SAMPLES, stride: 1 };
  }
  const delay = Math.max(1, Math.round(period / 4));
  const span = Math.min(
    waveform.length - delay,
    Math.max(PHASE_MIN_SPAN, Math.round(PHASE_CYCLES * period))
  );
  return { delay, span, stride: Math.ceil(span / PHASE_WINDOW_SAMPLES) };
}

/** What a ring draws: `cycle` samples from `start`, repeated `cycles` times around it. */
export interface RingWindow {
  start: number;
  /** Samples per repeat: one period for a pitched wave, the whole span otherwise. */
  cycle: number;
  /** Repeats around the ring; 1 for an unpitched wave. */
  cycles: number;
}

/**
 * Which samples a ring wraps. A pitched wave wraps the whole number of cycles nearest
 * RING_SPAN_FACTOR spans, so the lobe count follows pitch and the end meets the start with no seam.
 * That is longer than the tap buffer, so the ring repeats the newest whole cycle; a held note's
 * cycles are alike, so the repeat shows the same shape the wave has. Unpitched waves (noise, DMC
 * hits) wrap the span as it is.
 */
export function ringWindow(
  waveform: ArrayLike<number>,
  span: number,
  period: number | null
): RingWindow {
  if (period === null || period > waveform.length) {
    return { start: findTrigger(waveform, span), cycle: span, cycles: 1 };
  }
  const cycle = Math.ceil(period);
  return {
    start: findTrigger(waveform, cycle),
    cycle: period,
    cycles: Math.max(1, Math.round((RING_SPAN_FACTOR * span) / period)),
  };
}

/** Trails are given as the share of the picture kept per frame at 60 fps. */
export const TRAIL_REFERENCE_MS = 1000 / 60;
/** Smallest per-frame fade, so 8-bit rounding never leaves ghosts brighter than about 3 percent. */
export const MIN_TRAIL_FADE = 0.06;
/**
 * RMS that counts as full level for reactivity: the pulse voices' p99 smoothed level over the
 * catalog (measured 2026-10-10; DMC goes past it and clamps). It was 0.6, five times any real voice.
 */
export const LEVEL_FULL_RMS = 0.12;
/** A rise this far above the slow follower is a new note and flashes: a fifth of full level, about half a typical note. */
export const FLASH_RISE = 0.024;
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
  /** Phase portraits and rings: the voice's period (null for unpitched); estimated from the waveform when omitted. */
  period?: number | null;
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

/** Where a phase portrait's label sits: centered on the top edge of the portrait. */
export function phaseLabelAnchor(
  lane: number,
  lanes: number,
  width: number,
  height: number
): { x: number; y: number } {
  const { cx, cy, half } = phaseCell(lane, lanes, width, height);
  return { x: cx, y: cy - half };
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

/** The lane whose trace owns the point (x, y), or null where no single channel does (overlaid, gaps, off the stage). */
export function scopeLaneAt(
  layout: ScopeLayoutId,
  x: number,
  y: number,
  lanes: number,
  width: number,
  height: number
): number | null {
  if (lanes < 1 || x < 0 || y < 0 || x >= width || y >= height) return null;
  let lane: number;
  if (layout === 'stacked') {
    lane = Math.floor((y * lanes) / height);
  } else if (layout === 'phase') {
    const { cols, rows } = phaseGrid(lanes, width, height);
    lane = Math.floor((y * rows) / height) * cols + Math.floor((x * cols) / width);
  } else if (layout === 'rings') {
    const inner = ringRadius(0, lanes, width, height);
    const distance = Math.hypot(x - width / 2, y - height / 2);
    lane = Math.floor((distance - (inner.radius - inner.band / 2)) / inner.band);
  } else {
    return null;
  }
  return lane >= 0 && lane < lanes ? lane : null;
}

/** Fills out with one voice's trace for the layout (spec 4.1). */
export function buildTrace(args: TraceArgs, out: TraceBuffer): void {
  const { layout, waveform, span, lane, lanes, width, height, angle } = args;
  const gain = args.gain ?? 1;
  const last = waveform.length - 1;
  if (layout === 'phase') {
    const { cx, cy, half } = phaseCell(lane, lanes, width, height);
    const {
      delay,
      span: drawn,
      stride,
    } = args.period === undefined ? phaseWindow(waveform) : phaseWindow(waveform, args.period);
    const from = Math.max(delay, waveform.length - drawn);
    let count = 0;
    for (let i = from; i < waveform.length; i += stride) {
      out.xs[count] = cx + unit(waveform[i] * gain) * half;
      out.ys[count] = cy - unit(waveform[i - delay] * gain) * half;
      count++;
    }
    out.count = count;
    out.closed = false;
    out.baseline = NaN;
    return;
  }
  if (layout === 'rings') {
    const { radius, band } = ringRadius(lane, lanes, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const period = args.period === undefined ? estimatePeriod(waveform) : args.period;
    const ring = ringWindow(waveform, span, period);
    const total = ring.cycle * ring.cycles;
    for (let k = 0; k < RING_POINTS; k++) {
      const offset = Math.floor(((k * total) / RING_POINTS) % ring.cycle);
      const s = unit(waveform[Math.min(last, ring.start + offset)] * gain);
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
  const start = findTrigger(waveform, span);
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
