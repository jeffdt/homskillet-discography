// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FLASH_DECAY_MS,
  FLASH_RISE,
  FlashFollower,
  LEVEL_FULL_RMS,
  MIN_TRAIL_FADE,
  PHASE_DELAY_SAMPLES,
  PHASE_WINDOW_SAMPLES,
  PERIOD_HOLD_MS,
  PeriodHold,
  RING_SPAN_FACTOR,
  RING_POINTS,
  SCOPE_AUTO_GAIN,
  SCOPE_FIXED_GAIN,
  TRAIL_REFERENCE_MS,
  TraceArgs,
  buildTrace,
  createTraceBuffer,
  findTrigger,
  estimatePeriod,
  laneBox,
  phaseCell,
  phaseGrid,
  phaseLabelAnchor,
  phaseWindow,
  reactiveEnergy,
  ringRadius,
  ringWindow,
  scopeLaneAt,
  traceCapacity,
  trailFade,
  voiceLevel,
} from '../visuals/scopeMath';

function sine(length: number, period: number, phase = 0.3): Float32Array {
  return Float32Array.from({ length }, (_, i) => Math.sin((2 * Math.PI * (i + phase)) / period));
}

describe('findTrigger', () => {
  it('starts the newest window that begins on a rising zero crossing', () => {
    const wave = sine(1024, 100);
    const start = findTrigger(wave, 512);
    expect(start).toBeLessThanOrEqual(512);
    expect(wave[start - 1]).toBeLessThan(0);
    expect(wave[start]).toBeGreaterThanOrEqual(0);
    for (let i = start + 1; i <= 512; i++) expect(wave[i - 1] < 0 && wave[i] >= 0).toBe(false);
  });

  it('holds a steady tone in place from frame to frame', () => {
    const a = sine(1024, 64);
    const start = findTrigger(a, 256);
    expect(a[start]).toBeGreaterThanOrEqual(0);
    expect(a[start]).toBeLessThan(Math.sin((2 * Math.PI) / 64) + 1e-6);
  });

  it('falls back to the newest window when nothing crosses, and to 0 when the span is too long', () => {
    expect(findTrigger(new Float32Array(1024).fill(0.5), 512)).toBe(512);
    expect(findTrigger(new Float32Array(1024), 768)).toBe(256);
    expect(findTrigger(new Float32Array(100), 512)).toBe(0);
  });
});

describe('laneBox', () => {
  it('splits the height evenly, first lane on top', () => {
    expect([0, 1, 2].map((lane) => laneBox(lane, 3, 300))).toEqual([
      { top: 0, height: 100 },
      { top: 100, height: 100 },
      { top: 200, height: 100 },
    ]);
  });
});

const wave = (fn: (i: number) => number, n = 1024) =>
  Float32Array.from({ length: n }, (_, i) => fn(i));
const args = (over: Partial<TraceArgs>): TraceArgs => ({
  layout: 'stacked',
  waveform: wave(() => 0),
  span: 512,
  lane: 0,
  lanes: 2,
  width: 200,
  height: 300,
  angle: 0,
  ...over,
});

describe('buildTrace', () => {
  it('draws stacked lanes as before: a point every 2 px around the lane middle', () => {
    const out = createTraceBuffer(traceCapacity(200));
    buildTrace(args({ waveform: wave(() => 0.5), lane: 1 }), out);
    expect(out.count).toBe(101);
    expect(out.closed).toBe(false);
    expect(out.xs[0]).toBe(0);
    expect(out.xs[100]).toBe(200);
    // Lane 1 of 2 in 300 px: middle 225, amplitude 0.4 * 150 = 60.
    expect(out.ys[0]).toBeCloseTo(225 - 0.5 * 60);
    expect(out.baseline).toBe(225);
  });

  it('overlays every lane on the middle line at 0.4 of the height', () => {
    const out = createTraceBuffer(traceCapacity(200));
    buildTrace(args({ layout: 'overlaid', waveform: wave(() => 1), lane: 1 }), out);
    expect(out.ys[0]).toBeCloseTo(150 - 120);
    expect(out.baseline).toBe(150);
  });

  it('wraps a ring around the center, closed, turned by the angle', () => {
    const out = createTraceBuffer(traceCapacity(200));
    buildTrace(args({ layout: 'rings', width: 400, height: 400 }), out);
    const { radius } = ringRadius(0, 2, 400, 400);
    expect(out.count).toBe(RING_POINTS);
    expect(out.closed).toBe(true);
    expect(Number.isNaN(out.baseline)).toBe(true);
    expect(out.xs[0]).toBeCloseTo(200 + radius);
    expect(out.ys[0]).toBeCloseTo(200);
    buildTrace(args({ layout: 'rings', width: 400, height: 400, angle: Math.PI / 2 }), out);
    expect(out.xs[0]).toBeCloseTo(200);
    expect(out.ys[0]).toBeCloseTo(200 + radius);
  });

  it('wraps a pitched wave as whole repeated cycles, one lobe per cycle and no seam', () => {
    const out = createTraceBuffer(traceCapacity(400));
    const slow = sine(1024, 480);
    buildTrace(
      args({ layout: 'rings', waveform: slow, width: 400, height: 400, lanes: 4, gain: 0.5 }),
      out
    );
    const { radius } = ringRadius(0, 4, 400, 400);
    const r = (k: number) => Math.hypot(out.xs[k] - 200, out.ys[k] - 200) - radius;
    const peaks = Array.from({ length: RING_POINTS }, (_, k) => k).filter(
      (k) => r(k) > r((k + RING_POINTS - 1) % RING_POINTS) && r(k) >= r((k + 1) % RING_POINTS)
    );
    expect(peaks).toHaveLength(Math.round((RING_SPAN_FACTOR * 512) / 480));
    expect(Math.abs(r(RING_POINTS - 1) - r(0))).toBeLessThan(0.1 * radius);
  });

  it('plots a pitched wave against itself a quarter cycle earlier', () => {
    const out = createTraceBuffer(traceCapacity(200));
    const square = pulse(1024, 160, 0.5);
    buildTrace(args({ layout: 'phase', waveform: square, lanes: 1, width: 300, height: 300 }), out);
    const { cx, cy, half } = phaseCell(0, 1, 300, 300);
    expect(out.count).toBe(320);
    const i = 1024 - 320;
    expect(out.xs[0]).toBeCloseTo(cx + square[i] * half);
    expect(out.ys[0]).toBeCloseTo(cy - square[i - 40] * half);
  });

  it('plots an unpitched wave against the sample 24 earlier', () => {
    const out = createTraceBuffer(traceCapacity(200));
    const ramp = wave((i) => (i % 2 ? 0.5 : -0.5));
    buildTrace(args({ layout: 'phase', waveform: ramp, lanes: 1, width: 300, height: 300 }), out);
    const { cx, cy, half } = phaseCell(0, 1, 300, 300);
    expect(out.count).toBe(PHASE_WINDOW_SAMPLES);
    const i = 1024 - PHASE_WINDOW_SAMPLES;
    expect(out.xs[0]).toBeCloseTo(cx + ramp[i] * half);
    expect(out.ys[0]).toBeCloseTo(cy - ramp[i - PHASE_DELAY_SAMPLES] * half);
  });

  it('clamps samples outside -1..1 and treats missing ones as 0', () => {
    const out = createTraceBuffer(traceCapacity(200));
    buildTrace(args({ layout: 'overlaid', waveform: wave(() => 4) }), out);
    expect(out.ys[0]).toBeCloseTo(150 - 120);
    buildTrace(args({ layout: 'overlaid', waveform: new Float32Array(8) }), out);
    expect(out.ys[out.count - 1]).toBeCloseTo(150);
  });
});

describe('phase and ring layout', () => {
  it('fits the phase grid to the window shape', () => {
    expect(phaseGrid(5, 1100, 440)).toEqual({ cols: 4, rows: 2 });
    expect(phaseGrid(5, 400, 800)).toEqual({ cols: 2, rows: 3 });
    expect(phaseGrid(1, 0, 0)).toEqual({ cols: 1, rows: 1 });
  });

  it('puts the first ring innermost', () => {
    expect(ringRadius(0, 4, 400, 400).radius).toBeLessThan(ringRadius(3, 4, 400, 400).radius);
  });
});

/** A pulse wave of the given period and duty, centered on zero like the NES output, sagging toward zero. */
function pulse(length: number, period: number, duty: number, sag = 0.004): Float32Array {
  const high = 1 - duty;
  const low = -duty;
  let level = 0;
  let last = NaN;
  return Float32Array.from({ length }, (_, i) => {
    const target = (i % period) / period < duty ? high : low;
    if (target !== last) level = target;
    else level *= 1 - sag;
    last = target;
    return 0.1 * level;
  });
}

describe('estimatePeriod', () => {
  it('finds the period of a sine, a sagging square and a narrow pulse', () => {
    expect(estimatePeriod(sine(1024, 50))).toBeCloseTo(50, 0);
    expect(estimatePeriod(pulse(1024, 160, 0.5))).toBe(160);
    expect(estimatePeriod(pulse(1024, 64, 0.125))).toBe(64);
  });

  it('gives up on silence, noise and a single cycle', () => {
    expect(estimatePeriod(new Float32Array(1024))).toBeNull();
    let seed = 1;
    const noise = Float32Array.from({ length: 1024 }, () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647 - 0.5;
    });
    expect(estimatePeriod(noise)).toBeNull();
    expect(estimatePeriod(sine(1024, 700))).toBeNull();
  });
});

describe('phaseWindow', () => {
  it('delays a quarter cycle and draws two cycles of a pitched wave', () => {
    expect(phaseWindow(pulse(1024, 160, 0.5))).toEqual({ delay: 40, span: 320, stride: 1 });
  });

  it('keeps at least a few cycles of a high note and skips samples of a low one', () => {
    expect(phaseWindow(pulse(1024, 12, 0.5))).toMatchObject({ delay: 3, span: 48, stride: 1 });
    const low = phaseWindow(pulse(1024, 300, 0.5));
    expect(low).toMatchObject({ delay: 75, span: 600 });
    expect(Math.ceil(low.span / low.stride)).toBeLessThanOrEqual(PHASE_WINDOW_SAMPLES);
  });

  it('uses a period it is given instead of estimating one', () => {
    expect(phaseWindow(new Float32Array(1024), 160)).toEqual({ delay: 40, span: 320, stride: 1 });
    expect(phaseWindow(pulse(1024, 160, 0.5), null)).toMatchObject({ delay: PHASE_DELAY_SAMPLES });
  });

  it('falls back to a fixed 1 ms delay when there is no clear pitch', () => {
    expect(phaseWindow(new Float32Array(1024))).toEqual({
      delay: PHASE_DELAY_SAMPLES,
      span: PHASE_WINDOW_SAMPLES,
      stride: 1,
    });
  });
});

describe('PeriodHold', () => {
  it('keeps the last period through a short miss, then lets it go', () => {
    const hold = new PeriodHold();
    expect(hold.update(0, 100, 16)).toBe(100);
    expect(hold.update(0, null, PERIOD_HOLD_MS - 20)).toBe(100);
    expect(hold.update(1, null, 16)).toBeNull();
    expect(hold.update(0, null, 40)).toBeNull();
    expect(hold.update(0, 50, 16)).toBe(50);
  });
});

describe('phaseLabelAnchor', () => {
  it('centers the label over the top edge of its portrait', () => {
    const { cx, cy, half } = phaseCell(5, 8, 1200, 600);
    expect(phaseLabelAnchor(5, 8, 1200, 600)).toEqual({ x: cx, y: cy - half });
  });
});

describe('scopeLaneAt', () => {
  it('picks the stacked lane under the pointer', () => {
    expect(scopeLaneAt('stacked', 10, 0, 4, 800, 400)).toBe(0);
    expect(scopeLaneAt('stacked', 700, 250, 4, 800, 400)).toBe(2);
    expect(scopeLaneAt('stacked', 10, 399, 4, 800, 400)).toBe(3);
  });

  it('picks the phase portrait cell under the pointer, and nothing in an empty cell', () => {
    // 5 lanes in 1100x440 make a 4 by 2 grid, so the second row holds lane 4 and three empty cells.
    expect(scopeLaneAt('phase', 300, 100, 5, 1100, 440)).toBe(1);
    expect(scopeLaneAt('phase', 100, 300, 5, 1100, 440)).toBe(4);
    expect(scopeLaneAt('phase', 1000, 300, 5, 1100, 440)).toBeNull();
  });

  it('picks the ring band under the pointer, and nothing inside or outside the rings', () => {
    const { radius } = ringRadius(2, 4, 400, 400);
    expect(scopeLaneAt('rings', 200 + radius, 200, 4, 400, 400)).toBe(2);
    expect(scopeLaneAt('rings', 200, 200, 4, 400, 400)).toBeNull();
    expect(scopeLaneAt('rings', 0, 0, 4, 400, 400)).toBeNull();
  });

  it('picks nothing in the overlaid layout, off the stage or with no lanes', () => {
    expect(scopeLaneAt('overlaid', 100, 100, 4, 800, 400)).toBeNull();
    expect(scopeLaneAt('stacked', 100, 500, 4, 800, 400)).toBeNull();
    expect(scopeLaneAt('stacked', 100, 100, 0, 800, 400)).toBeNull();
  });
});

describe('effect math', () => {
  it('fades by frame-rate-independent trails, never below the floor', () => {
    expect(trailFade(0, 16)).toBe(1);
    expect(trailFade(0.8, TRAIL_REFERENCE_MS)).toBeCloseTo(0.2);
    expect(trailFade(0.8, 2 * TRAIL_REFERENCE_MS)).toBeCloseTo(0.36);
    expect(trailFade(0.99, TRAIL_REFERENCE_MS)).toBe(MIN_TRAIL_FADE);
    expect(trailFade(0.5, 0)).toBe(MIN_TRAIL_FADE);
  });

  it('turns rms into a 0..1 level on the measured scale', () => {
    expect(LEVEL_FULL_RMS).toBe(0.12);
    expect(voiceLevel(0.06)).toBeCloseTo(0.5);
    expect(voiceLevel(0.3)).toBe(1);
    expect(voiceLevel(-1)).toBe(0);
    expect(reactiveEnergy(0, 1, 1)).toBe(0);
    expect(reactiveEnergy(0.5, 1, 1)).toBeCloseTo(1.2);
  });

  it('flashes on a note-sized rise and decays over 120 ms', () => {
    expect(FLASH_RISE).toBe(0.024);
    const flash = new FlashFollower(8);
    expect(flash.update(0, 0, 16)).toBe(0);
    expect(flash.update(0, 0.05, 16)).toBe(1);
    expect(flash.update(0, 0, FLASH_DECAY_MS)).toBeCloseTo(Math.exp(-1));
    expect(flash.update(1, 0.01, 16)).toBe(0);
    flash.reset();
    expect(flash.update(0, 0, 16)).toBe(0);
  });
});

describe('scope gain', () => {
  const stackedArgs = (waveform: Float32Array) => args({ waveform, lanes: 1 });

  it('multiplies samples by the gain before clamping', () => {
    const out = createTraceBuffer(traceCapacity(200));
    const wave = new Float32Array(1024).fill(0.1);
    buildTrace({ ...stackedArgs(wave), gain: 5 }, out);
    // One lane of 300 px: middle 150, amplitude 0.8 * 300 / 2 = 120; 0.1 * 5 = 0.5 of it.
    expect(out.ys[0]).toBeCloseTo(150 - 60);
    buildTrace({ ...stackedArgs(wave), gain: 50 }, out);
    expect(out.ys[0]).toBeCloseTo(150 - 120);
  });

  it('uses the measured stage tuning', () => {
    expect(SCOPE_AUTO_GAIN).toEqual({ floorPeak: 0.05, targetPeak: 0.9, releaseMs: 500 });
    expect(SCOPE_FIXED_GAIN).toBe(3.5);
  });
});

describe('ringWindow', () => {
  it('wraps the whole cycles nearest RING_SPAN_FACTOR spans, so the count follows pitch', () => {
    const wave = sine(1024, 32);
    const ring = ringWindow(wave, 512, 32);
    expect(ring).toMatchObject({ cycle: 32, cycles: RING_SPAN_FACTOR * 16 });
    expect(ring.start + 32).toBeLessThanOrEqual(1024);
    expect(wave[ring.start - 1]).toBeLessThan(0);
    expect(wave[ring.start]).toBeGreaterThanOrEqual(0);
    expect(ringWindow(sine(1024, 367), 512, 367).cycles).toBe(4);
    expect(ringWindow(sine(1024, 184), 512, 184).cycles).toBe(8);
    expect(ringWindow(sine(1024, 2000), 256, 2000).cycles).toBe(1);
  });

  it('wraps the span as it is for an unpitched wave', () => {
    const wave = sine(1024, 100);
    expect(ringWindow(wave, 512, null)).toEqual({
      start: findTrigger(wave, 512),
      cycle: 512,
      cycles: 1,
    });
  });
});
