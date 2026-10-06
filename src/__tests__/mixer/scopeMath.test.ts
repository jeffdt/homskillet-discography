// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FLAT_SCOPE_PATH,
  SCOPE_POINTS,
  SCOPE_SAMPLES,
  findTrigger,
  levelToMeter,
  scopePath,
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
    expect(path.startsWith('M0 16L1 16')).toBe(true);
    expect(path.endsWith('L128 16')).toBe(true);
  });

  it('puts +1 near the top, -1 near the bottom and clamps louder samples', () => {
    expect(scopePath(new Float32Array(1024).fill(1), 0, SCOPE_SAMPLES).startsWith('M0 1L')).toBe(
      true
    );
    expect(scopePath(new Float32Array(1024).fill(-1), 0, SCOPE_SAMPLES).startsWith('M0 31L')).toBe(
      true
    );
    expect(scopePath(new Float32Array(1024).fill(3), 0, SCOPE_SAMPLES).startsWith('M0 1L')).toBe(
      true
    );
  });

  it('reads past the end of the waveform as silence', () => {
    expect(scopePath(new Float32Array(10).fill(1), 0, SCOPE_SAMPLES).endsWith('L128 16')).toBe(
      true
    );
  });

  it('matches the flat path for silence', () => {
    expect(scopePath(new Float32Array(1024), 512, SCOPE_SAMPLES)).toBe(FLAT_SCOPE_PATH);
  });
});
