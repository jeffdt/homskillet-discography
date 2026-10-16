import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RIPPLE_SETTINGS,
  HIT_LOCKOUT_MS,
  RIPPLE_WAVELENGTH_PX,
  RippleField,
  requiredFraction,
} from '../visuals/ripples';

const FRAME_MS = 1000 / 60;

/** A field that has settled on a steady level, so the running average equals it. */
function settledField(level = 0.1, settings = DEFAULT_RIPPLE_SETTINGS): RippleField {
  const field = new RippleField(settings);
  for (let i = 0; i < 120; i++) field.step(level, 200, FRAME_MS);
  return field;
}

/** Largest |displacement| over 0..maxX. */
function peakDisplacement(field: RippleField, maxX = 400): number {
  let peak = 0;
  for (let x = 0; x <= maxX; x++) peak = Math.max(peak, Math.abs(field.displacement(x)));
  return peak;
}

describe('RippleField hit detection', () => {
  it('starts no ripple while the level holds steady', () => {
    const field = settledField(0.3);
    expect(field.ripples).toHaveLength(0);
  });

  it('starts a ripple at the playhead when the level jumps above its recent average', () => {
    const field = settledField(0.05);
    expect(field.step(0.6, 180, FRAME_MS)).toBe(true);
    expect(field.ripples).toHaveLength(1);
    expect(field.ripples[0].frontX).toBe(180);
  });

  it('ignores a jump that is small next to the recent peak', () => {
    const field = settledField(0.1);
    expect(field.step(0.13, 200, FRAME_MS)).toBe(false);
  });

  it('needs a smaller jump at higher sensitivity', () => {
    expect(requiredFraction(90)).toBeLessThan(requiredFraction(50));
    expect(requiredFraction(50)).toBeLessThan(requiredFraction(10));
    const sensitive = settledField(0.1, { ...DEFAULT_RIPPLE_SETTINGS, sensitivity: 90 });
    const dull = settledField(0.1, { ...DEFAULT_RIPPLE_SETTINGS, sensitivity: 10 });
    expect(sensitive.step(0.15, 200, FRAME_MS)).toBe(true);
    expect(dull.step(0.15, 200, FRAME_MS)).toBe(false);
  });

  it('scales the threshold with the recent peak, so quiet tracks still ripple', () => {
    const quiet = settledField(0.01);
    const loud = settledField(0.5);
    expect(quiet.step(0.03, 200, FRAME_MS)).toBe(true);
    expect(loud.step(0.52, 200, FRAME_MS)).toBe(false);
  });

  it('starts at most one ripple per hit during the lockout', () => {
    const field = settledField(0.05);
    field.step(0.6, 200, FRAME_MS);
    const framesInLockout = Math.floor(HIT_LOCKOUT_MS / FRAME_MS) - 1;
    for (let i = 0; i < framesInLockout; i++) field.step(i % 2 ? 0.05 : 0.9, 200, FRAME_MS);
    expect(field.ripples).toHaveLength(1);
  });

  it('gives a harder hit a taller ripple, never above the height setting', () => {
    const soft = settledField(0.05);
    soft.step(0.08, 200, FRAME_MS);
    const hard = settledField(0.05);
    hard.step(1, 200, FRAME_MS);
    expect(hard.ripples[0].amplitude).toBeGreaterThan(soft.ripples[0].amplitude);
    expect(hard.ripples[0].amplitude).toBeLessThanOrEqual(DEFAULT_RIPPLE_SETTINGS.heightPx);
  });
});

describe('RippleField travel', () => {
  it('displaces the bar near the ripple front and leaves it flat far away', () => {
    const field = settledField(0.05);
    field.step(1, 300, FRAME_MS);
    const nearFront = peakDisplacement(field, 300);
    expect(nearFront).toBeGreaterThan(1);
    expect(Math.abs(field.displacement(50))).toBeLessThan(0.01);
  });

  it('moves the ripple front left at the speed setting', () => {
    const settings = { ...DEFAULT_RIPPLE_SETTINGS, speedPxPerSec: 100 };
    const field = settledField(0.05, settings);
    field.step(1, 300, FRAME_MS);
    for (let i = 0; i < 60; i++) field.step(0.05, 300, 1000 / 60);
    expect(field.ripples[0].frontX).toBeCloseTo(200, 0);
  });

  it('fades as it travels', () => {
    const field = settledField(0.05);
    field.step(1, 300, FRAME_MS);
    const early = peakDisplacement(field);
    for (let i = 0; i < 30; i++) field.step(0.05, 300, FRAME_MS);
    expect(peakDisplacement(field)).toBeLessThan(early);
  });

  it('removes a ripple once its front has run past the start of the bar', () => {
    const field = settledField(0.05, { ...DEFAULT_RIPPLE_SETTINGS, speedPxPerSec: 400 });
    field.step(1, 40, FRAME_MS);
    for (let i = 0; i < 30; i++) field.step(0.05, 40, FRAME_MS);
    expect(field.ripples).toHaveLength(0);
    expect(field.displacement(0)).toBe(0);
  });

  it('keeps an earlier ripple travelling while a later hit starts another', () => {
    const field = settledField(0.05);
    field.step(1, 300, FRAME_MS);
    for (let i = 0; i < 20; i++) field.step(0.05, 300, FRAME_MS);
    field.step(1, 300, FRAME_MS);
    expect(field.ripples).toHaveLength(2);
    const [first, second] = field.ripples;
    expect(first.frontX).toBeLessThan(second.frontX - RIPPLE_WAVELENGTH_PX);
    expect(Math.abs(field.displacement(first.frontX - RIPPLE_WAVELENGTH_PX / 4))).toBeGreaterThan(
      0.5
    );
  });

  it('clear removes every ripple and starts the average over from the next level', () => {
    const field = settledField(0.05);
    field.step(1, 300, FRAME_MS);
    field.clear();
    expect(field.ripples).toHaveLength(0);
    expect(field.step(0.8, 300, FRAME_MS)).toBe(false);
  });
});
