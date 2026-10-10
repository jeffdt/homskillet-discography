import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPECTRUM_GRADIENT_ID,
  SPECTRUM_GRADIENTS,
  spectrumGradientById,
} from '../config/spectrumGradients';

describe('spectrum gradients', () => {
  it('brings back all 23 old gradients, Green first', () => {
    expect(SPECTRUM_GRADIENTS).toHaveLength(23);
    expect(SPECTRUM_GRADIENTS[0].id).toBe('mw-green');
    expect(DEFAULT_SPECTRUM_GRADIENT_ID).toBe('mw-green');
    expect(SPECTRUM_GRADIENTS.map((g) => g.label)).toContain('Negative');
  });

  it('has unique kebab-case ids and lowercase hex stops', () => {
    const ids = SPECTRUM_GRADIENTS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    SPECTRUM_GRADIENTS.forEach((g) => {
      expect(g.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(g.stops.length).toBeGreaterThanOrEqual(2);
      g.stops.forEach((stop) => expect(stop).toMatch(/^#[0-9a-f]{6}$/));
    });
  });

  it('finds by id and falls back to Green', () => {
    expect(spectrumGradientById('bz-inferno').label).toBe('Inferno');
    expect(spectrumGradientById('nope').id).toBe('mw-green');
    expect(spectrumGradientById(7).id).toBe('mw-green');
    expect(spectrumGradientById(undefined).id).toBe('mw-green');
  });
});
