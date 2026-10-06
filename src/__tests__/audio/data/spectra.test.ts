// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { MIX_INPUT_SAMPLES, VOICE_FFT_SIZE } from '../../../audio/data/constants';
import {
  CqtMixAnalyzer,
  FftMixAnalyzer,
  FftSpectrumAnalyzer,
  createMixAnalyzer,
} from '../../../audio/data/spectra';
import { createSpectrumLayout } from '../../../audio/data/spectrumLayout';
import { SpectrumCore } from '../../../audio/types';
import { loadRealChipCore } from '../../helpers/realChipCore';
import { NO_CQT_CORE } from '../../helpers/spectrumCores';

const layout = createSpectrumLayout();
const SEMITONE = Math.pow(2, 1 / 12);

function sine(freq: number, rate: number, length: number, amplitude = 0.25): Float32Array {
  return Float32Array.from(
    { length },
    (_, i) => amplitude * Math.sin((2 * Math.PI * freq * i) / rate)
  );
}

function peakBin(values: Float32Array): number {
  let best = 0;
  for (let b = 1; b < values.length; b++) if (values[b] > values[best]) best = b;
  return best;
}

function expectWithinSemitone(expectedHz: number, actualHz: number): void {
  expect(actualHz / expectedHz).toBeLessThan(SEMITONE);
  expect(expectedHz / actualHz).toBeLessThan(SEMITONE);
}

describe('FftSpectrumAnalyzer', () => {
  it.each([440, 2000])('peaks within a semitone of a %d Hz sine', (freq) => {
    const out = new Float32Array(layout.bins);
    new FftSpectrumAnalyzer(layout, 24000).analyze(sine(freq, 24000, VOICE_FFT_SIZE), out);
    expectWithinSemitone(freq, layout.frequencies[peakBin(out)]);
  });

  it('reads only the newest VOICE_FFT_SIZE samples', () => {
    const input = new Float32Array(VOICE_FFT_SIZE * 2);
    input.set(sine(440, 24000, VOICE_FFT_SIZE)); // loud old half, silent newest half
    const out = new Float32Array(layout.bins);
    new FftSpectrumAnalyzer(layout, 24000).analyze(input, out);
    expect(Math.max(...out)).toBe(0);
  });
});

describe('mix analyzers on the real chip-core', () => {
  let core: SpectrumCore;
  beforeAll(async () => {
    core = await loadRealChipCore();
  });

  it.each([
    [24000, 440],
    [24000, 2000],
    [22050, 440],
  ])('the CQT at %d Hz peaks within a semitone of %d Hz', (rate, freq) => {
    const analyzer = CqtMixAnalyzer.create(core, layout, rate)!;
    const out = new Float32Array(layout.bins);
    analyzer.analyze(sine(freq, rate, MIX_INPUT_SAMPLES), out);
    analyzer.dispose();
    expectWithinSemitone(freq, layout.frequencies[peakBin(out)]);
  });

  it('reports silence as zeros', () => {
    const analyzer = CqtMixAnalyzer.create(core, layout, 24000)!;
    const out = new Float32Array(layout.bins).fill(1);
    analyzer.analyze(new Float32Array(MIX_INPUT_SAMPLES), out);
    analyzer.dispose();
    expect(Math.max(...out)).toBe(0);
  });

  it('keeps the FFT fallback within 25% of the CQT level', () => {
    const input = sine(440, 24000, MIX_INPUT_SAMPLES);
    const cqt = new Float32Array(layout.bins);
    const fft = new Float32Array(layout.bins);
    const analyzer = CqtMixAnalyzer.create(core, layout, 24000)!;
    analyzer.analyze(input, cqt);
    analyzer.dispose();
    new FftMixAnalyzer(layout, 24000).analyze(input, fft);
    const ratio = Math.max(...fft) / Math.max(...cqt);
    expect(ratio).toBeGreaterThan(0.75);
    expect(ratio).toBeLessThan(1.25);
  });

  it('chooses the CQT when the core has one and the FFT otherwise', () => {
    const real = createMixAnalyzer(core, layout, 24000);
    expect(real).toBeInstanceOf(CqtMixAnalyzer);
    real.dispose();
    expect(createMixAnalyzer(NO_CQT_CORE, layout, 24000)).toBeInstanceOf(FftMixAnalyzer);
    expect(createMixAnalyzer(null, layout, 24000)).toBeInstanceOf(FftMixAnalyzer);
  });
});
