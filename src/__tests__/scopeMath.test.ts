// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { findTrigger, laneBox } from '../visuals/scopeMath';

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
