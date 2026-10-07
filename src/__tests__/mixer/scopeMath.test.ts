// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FLAT_SCOPE_PATH,
  SCOPE_POINTS,
  SCOPE_SAMPLES,
  findTrigger,
  SCOPE_GAIN_FLOOR_PEAK,
  levelToMeter,
  nextScopeGain,
  scopePath,
  windowPeak,
} from '../../components/mixer/scopeMath';

function sine(length: number, period: number, phase: number): Float32Array {
  return Float32Array.from({ length }, (_, i) => Math.sin((2 * Math.PI * (i + phase)) / period));
}

function points(path: string): string[] {
  return path.split(/[ML]/).filter(Boolean);
}

describe('levelToMeter', () => {
  it('maps full scale to 1, -24 dB to the middle and silence to 0', () => {
    expect(levelToMeter(1)).toBe(1);
    expect(levelToMeter(Math.pow(10, -24 / 20))).toBeCloseTo(0.5, 6);
    expect(levelToMeter(0)).toBe(0);
    expect(levelToMeter(1e-6)).toBe(0);
  });

  it('clamps out-of-range and invalid levels', () => {
    expect(levelToMeter(2)).toBe(1);
    expect(levelToMeter(-0.5)).toBe(0);
    expect(levelToMeter(NaN)).toBe(0);
  });
});

describe('findTrigger', () => {
  it('starts the newest window on a rising zero crossing', () => {
    // Rising crossings fall between samples 469 and 470, 569 and 570, ...; the newest start that
    // leaves room for 512 samples in 1024 is 470.
    expect(findTrigger(sine(1024, 100, 30.5), SCOPE_SAMPLES)).toBe(470);
  });

  it('holds a steady tone in place across frames', () => {
    const a = findTrigger(sine(1024, 100, 30.5), SCOPE_SAMPLES);
    const b = findTrigger(sine(1024, 100, 30.5 + 100), SCOPE_SAMPLES);
    expect(b).toBe(a);
  });

  it('falls back to the newest window when nothing crosses zero', () => {
    expect(findTrigger(new Float32Array(1024), SCOPE_SAMPLES)).toBe(512);
    expect(findTrigger(new Float32Array(1024).fill(0.5), SCOPE_SAMPLES)).toBe(512);
  });

  it('starts at 0 when the window is longer than the waveform', () => {
    expect(findTrigger(new Float32Array(100), SCOPE_SAMPLES)).toBe(0);
  });
});

describe('scopePath', () => {
  it('draws SCOPE_POINTS points from the left edge to the right edge', () => {
    const path = scopePath(new Float32Array(1024), 512, SCOPE_SAMPLES);
    expect(points(path)).toHaveLength(SCOPE_POINTS);
    expect(path.startsWith('M0 24L1 24')).toBe(true);
    expect(path.endsWith('L128 24')).toBe(true);
  });

  it('puts +1 near the top, -1 near the bottom and clamps louder samples', () => {
    expect(scopePath(new Float32Array(1024).fill(1), 0, SCOPE_SAMPLES).startsWith('M0 1L')).toBe(
      true
    );
    expect(scopePath(new Float32Array(1024).fill(-1), 0, SCOPE_SAMPLES).startsWith('M0 47L')).toBe(
      true
    );
    expect(scopePath(new Float32Array(1024).fill(3), 0, SCOPE_SAMPLES).startsWith('M0 1L')).toBe(
      true
    );
  });

  it('reads past the end of the waveform as silence', () => {
    expect(scopePath(new Float32Array(10).fill(1), 0, SCOPE_SAMPLES).endsWith('L128 24')).toBe(
      true
    );
  });

  it('matches the flat path for silence', () => {
    expect(scopePath(new Float32Array(1024), 512, SCOPE_SAMPLES)).toBe(FLAT_SCOPE_PATH);
  });
});

describe('scopePath gain', () => {
  it('scales samples around the middle and still clamps at the edges', () => {
    const quarter = new Float32Array(1024).fill(0.25);
    expect(scopePath(quarter, 0, SCOPE_SAMPLES, 4).startsWith('M0 1L')).toBe(true);
    expect(scopePath(quarter, 0, SCOPE_SAMPLES, 40).startsWith('M0 1L')).toBe(true);
    expect(scopePath(quarter, 0, SCOPE_SAMPLES, 2).startsWith('M0 12.5L')).toBe(true);
  });
});

describe('windowPeak', () => {
  it('is the largest absolute sample in the window only', () => {
    const wave = Float32Array.from([0.9, 0.1, -0.4, 0.2, 0.3]);
    expect(windowPeak(wave, 1, 3)).toBeCloseTo(0.4, 6);
    expect(windowPeak(new Float32Array(4), 0, 10)).toBe(0);
  });
});

describe('nextScopeGain', () => {
  it('fills the scope: a quiet steady wave settles on gain 1 / peak', () => {
    let gain = 1;
    for (let i = 0; i < 600; i++) gain = nextScopeGain(gain, 0.25, 16);
    expect(gain).toBeCloseTo(4, 1);
  });

  it('drops at once when the wave gets louder, so it never clips', () => {
    expect(nextScopeGain(8, 0.5, 16)).toBe(2);
  });

  it('rises slowly after a loud passage instead of pumping', () => {
    const next = nextScopeGain(1, 0.1, 16);
    expect(next).toBeGreaterThan(1);
    expect(next).toBeLessThan(1.5);
  });

  it('keeps silence flat: gain never exceeds 1 / floor', () => {
    let gain = 1;
    for (let i = 0; i < 2000; i++) gain = nextScopeGain(gain, 0, 16);
    expect(gain).toBeCloseTo(1 / SCOPE_GAIN_FLOOR_PEAK, 3);
    expect(gain * 0.001).toBeLessThan(0.02);
  });

  it('does not depend on the frame rate', () => {
    let fine = 1;
    for (let i = 0; i < 60; i++) fine = nextScopeGain(fine, 0.2, 10);
    expect(nextScopeGain(1, 0.2, 600)).toBeCloseTo(fine, 5);
  });
});
