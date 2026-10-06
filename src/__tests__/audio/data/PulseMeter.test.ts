// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PULSE_MAX_HZ, PULSE_MIN_HZ, PULSE_SMOOTHING_MS } from '../../../audio/data/constants';
import { PulseMeter } from '../../../audio/data/PulseMeter';
import { createSpectrumLayout } from '../../../audio/data/spectrumLayout';

const layout = createSpectrumLayout();

/** A spectrum that is `inBand` inside the pulse band and `outside` everywhere else. */
function spectrum(meter: PulseMeter, inBand: number, outside = 0): Float32Array {
  const values = new Float32Array(layout.bins).fill(outside);
  values.fill(inBand, meter.fromBin, meter.toBin);
  return values;
}

describe('PulseMeter band', () => {
  it('covers exactly the bins between 500 Hz and 4 kHz', () => {
    const meter = new PulseMeter(layout);
    const f = layout.frequencies;
    expect(f[meter.fromBin]).toBeGreaterThanOrEqual(PULSE_MIN_HZ);
    expect(f[meter.fromBin - 1]).toBeLessThan(PULSE_MIN_HZ);
    expect(f[meter.toBin - 1]).toBeLessThanOrEqual(PULSE_MAX_HZ);
    expect(f[meter.toBin]).toBeGreaterThan(PULSE_MAX_HZ);
  });

  it('ignores everything outside the band', () => {
    const meter = new PulseMeter(layout);
    expect(meter.target(spectrum(meter, 0, 5))).toBe(0);
  });

  it('reads 0 for a band outside the layout', () => {
    const meter = new PulseMeter(layout, 5000, 6000);
    expect(meter.fromBin).toBe(meter.toBin);
    expect(meter.target(new Float32Array(layout.bins).fill(1))).toBe(0);
  });
});

describe('PulseMeter level', () => {
  it('boosts the band RMS by 2.5 and squares it', () => {
    const meter = new PulseMeter(layout);
    expect(meter.target(spectrum(meter, 0.2))).toBeCloseTo(0.25, 6);
  });

  it('clips at 1 before squaring', () => {
    const meter = new PulseMeter(layout);
    expect(meter.target(spectrum(meter, 0.4))).toBeCloseTo(1, 6);
    expect(meter.target(spectrum(meter, 3))).toBe(1);
  });

  it('reads silence as 0', () => {
    const meter = new PulseMeter(layout);
    expect(meter.target(new Float32Array(layout.bins))).toBe(0);
  });
});

describe('PulseMeter smoothing', () => {
  it('rises 63% of the way in one time constant', () => {
    const meter = new PulseMeter(layout);
    expect(meter.update(spectrum(meter, 0.4), PULSE_SMOOTHING_MS)).toBeCloseTo(1 - Math.exp(-1), 6);
  });

  it('moves the same per second at 60 and 120 fps', () => {
    const a = new PulseMeter(layout);
    const b = new PulseMeter(layout);
    const loud = spectrum(a, 0.4);
    for (let i = 0; i < 6; i++) a.update(loud, 1000 / 60);
    for (let i = 0; i < 12; i++) b.update(loud, 1000 / 120);
    expect(a.value).toBeCloseTo(b.value, 9);
  });

  it('decays to nothing after a second of silence', () => {
    const meter = new PulseMeter(layout);
    const loud = spectrum(meter, 0.4);
    for (let i = 0; i < 60; i++) meter.update(loud, 1000 / 60);
    const quiet = new Float32Array(layout.bins);
    for (let i = 0; i < 60; i++) meter.update(quiet, 1000 / 60);
    expect(meter.value).toBeLessThan(1e-4);
  });

  it('starts over from 0 after reset', () => {
    const meter = new PulseMeter(layout);
    meter.update(spectrum(meter, 0.4), 500);
    meter.reset();
    expect(meter.value).toBe(0);
  });
});
