// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SPECTRUM_BINS, SPECTRUM_MAX_HZ, SPECTRUM_MIN_HZ } from '../../../audio/data/constants';
import { Fft } from '../../../audio/data/fft';
import { FftBinMap, createSpectrumLayout } from '../../../audio/data/spectrumLayout';

describe('Fft', () => {
  it('matches a direct DFT', () => {
    const n = 16;
    const input = Array.from({ length: n }, (_, i) => Math.sin(i * 1.3) + (i % 3));
    const re = Float32Array.from(input);
    const im = new Float32Array(n);
    new Fft(n).transform(re, im);
    for (let k = 0; k < n; k++) {
      let sumRe = 0;
      let sumIm = 0;
      for (let t = 0; t < n; t++) {
        sumRe += input[t] * Math.cos((-2 * Math.PI * k * t) / n);
        sumIm += input[t] * Math.sin((-2 * Math.PI * k * t) / n);
      }
      expect(re[k]).toBeCloseTo(sumRe, 4);
      expect(im[k]).toBeCloseTo(sumIm, 4);
    }
  });

  it('rejects sizes that are not powers of two', () => {
    expect(() => new Fft(12)).toThrow();
  });
});

describe('createSpectrumLayout', () => {
  it('spaces bins evenly in log frequency like showcqtbar', () => {
    const layout = createSpectrumLayout();
    expect(layout.bins).toBe(SPECTRUM_BINS);
    expect(layout.frequencies).toHaveLength(SPECTRUM_BINS);
    const step = (Math.log(SPECTRUM_MAX_HZ) - Math.log(SPECTRUM_MIN_HZ)) / SPECTRUM_BINS;
    expect(layout.frequencies[0]).toBeCloseTo(Math.exp(Math.log(SPECTRUM_MIN_HZ) + 0.5 * step), 3);
    expect(layout.frequencies[SPECTRUM_BINS - 1]).toBeLessThan(SPECTRUM_MAX_HZ);
    for (let b = 1; b < SPECTRUM_BINS; b++) {
      expect(Math.log(layout.frequencies[b] / layout.frequencies[b - 1])).toBeCloseTo(step, 5);
    }
  });
});

describe('FftBinMap', () => {
  it('takes the loudest FFT bin inside a wide layout bin', () => {
    // 4 bins over 100..1600 Hz, one octave each; FFT bins are 10 Hz apart.
    const layout = createSpectrumLayout(4, 100, 1600);
    const map = new FftBinMap(layout, 256, 2560);
    const magnitudes = new Float32Array(128);
    magnitudes[15] = 0.5; // 150 Hz
    magnitudes[16] = 0.9; // 160 Hz, same layout bin (100..200 Hz)
    const out = new Float32Array(4);
    map.map(magnitudes, out);
    expect(out[0]).toBeCloseTo(0.9, 6);
    expect(out[1]).toBe(0);
  });

  it('interpolates where a layout bin is narrower than an FFT bin', () => {
    const layout = createSpectrumLayout();
    const fftSize = 2048;
    const rate = 24000;
    const hz = rate / fftSize; // 11.7 Hz; layout bins near 117 Hz are about 1.4 Hz wide
    const map = new FftBinMap(layout, fftSize, rate);
    const magnitudes = new Float32Array(fftSize / 2);
    magnitudes[10] = 1;
    const out = new Float32Array(layout.bins);
    map.map(magnitudes, out);
    let checked = 0;
    for (let b = 0; b < layout.bins; b++) {
      const k = layout.frequencies[b] / hz;
      if (k > 9 && k < 11) {
        expect(out[b]).toBeCloseTo(1 - Math.abs(k - 10), 4);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5);
  });
});
