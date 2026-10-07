// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FLASH_DECAY_MS,
  FlashFollower,
  MIN_TRAIL_FADE,
  PHASE_DELAY_SAMPLES,
  PHASE_WINDOW_SAMPLES,
  RING_POINTS,
  TRAIL_REFERENCE_MS,
  TraceArgs,
  buildTrace,
  createTraceBuffer,
  findTrigger,
  laneBox,
  phaseCell,
  phaseGrid,
  reactiveEnergy,
  ringRadius,
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

  it('plots a phase portrait against the sample 24 earlier', () => {
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

describe('effect math', () => {
  it('fades by frame-rate-independent trails, never below the floor', () => {
    expect(trailFade(0, 16)).toBe(1);
    expect(trailFade(0.8, TRAIL_REFERENCE_MS)).toBeCloseTo(0.2);
    expect(trailFade(0.8, 2 * TRAIL_REFERENCE_MS)).toBeCloseTo(0.36);
    expect(trailFade(0.99, TRAIL_REFERENCE_MS)).toBe(MIN_TRAIL_FADE);
    expect(trailFade(0.5, 0)).toBe(MIN_TRAIL_FADE);
  });

  it('turns rms into a 0..1 level and energy', () => {
    expect(voiceLevel(0.3)).toBeCloseTo(0.5);
    expect(voiceLevel(2)).toBe(1);
    expect(voiceLevel(-1)).toBe(0);
    expect(reactiveEnergy(0, 1, 1)).toBe(0);
    expect(reactiveEnergy(0.5, 1, 1)).toBeCloseTo(1.2);
  });

  it('flashes on a sudden rise and decays over 120 ms', () => {
    const flash = new FlashFollower(8);
    expect(flash.update(0, 0, 16)).toBe(0);
    expect(flash.update(0, 0.5, 16)).toBe(1);
    expect(flash.update(0, 0, FLASH_DECAY_MS)).toBeCloseTo(Math.exp(-1));
    expect(flash.update(1, 0.05, 16)).toBe(0);
    flash.reset();
    expect(flash.update(0, 0, 16)).toBe(0);
  });
});
