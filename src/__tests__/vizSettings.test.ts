import { describe, expect, it } from 'vitest';
import {
  SCOPE_COLORINGS,
  SCOPE_DEFAULTS,
  SCOPE_LAYOUTS,
  SCOPE_PRESETS,
  SCOPE_SPANS,
  SPECTRUM_COLORINGS,
  STAGE_DEFAULTS,
  matchingScopePreset,
  scopeColoringById,
  scopeLayoutById,
  scopeSettingsOf,
  spectrumColoringById,
} from '../config/stageSettings';

const preset = (id: string) => SCOPE_PRESETS.find((p) => p.id === id)!;

describe('spectrum colorings', () => {
  it('offers add like light (default), average and unified', () => {
    expect(SPECTRUM_COLORINGS.map((c) => c.id)).toEqual(['additive', 'average', 'unified']);
    expect(STAGE_DEFAULTS.spectrumColoring).toBe('additive');
    expect(STAGE_DEFAULTS.spectrumGradient).toBe('mw-green');
    expect(spectrumColoringById('unified').label).toBe('Unified');
    expect(spectrumColoringById('rainbow').id).toBe('additive');
    expect(spectrumColoringById(3).id).toBe('additive');
  });
});

describe('scope layouts and colorings', () => {
  it('offers four layouts and two trace colorings, with fallbacks', () => {
    expect(SCOPE_LAYOUTS.map((l) => l.id)).toEqual(['stacked', 'overlaid', 'rings', 'phase']);
    expect(SCOPE_COLORINGS.map((c) => c.id)).toEqual(['channel', 'unified']);
    expect(scopeLayoutById('milkdrop').id).toBe('stacked');
    expect(scopeColoringById(null).id).toBe('unified');
  });
});

describe('scope presets', () => {
  it('lists Green CRT first and makes it the default', () => {
    expect(SCOPE_PRESETS.map((p) => p.id)).toEqual([
      'green-crt',
      'halo',
      'neon',
      'phosphor',
      'xy',
      'today',
    ]);
    expect(SCOPE_DEFAULTS).toEqual(preset('green-crt').settings);
    Object.entries(SCOPE_DEFAULTS).forEach(([key, value]) =>
      expect((STAGE_DEFAULTS as Record<string, unknown>)[key]).toBe(value)
    );
  });

  it('uses the owner-approved values', () => {
    expect(preset('green-crt').settings).toEqual({
      scopeLayout: 'stacked',
      scopeColoring: 'unified',
      scopeTrails: 0.8,
      scopeGlow: 0.6,
      scopeBloom: 0.45,
      scopeReactivity: 0.25,
      scopeLineWidth: 1.5,
      scopeCore: true,
      scopeFill: false,
      scopeCrt: true,
      scopeSpan: 512,
    });
    expect(preset('halo').settings).toMatchObject({
      scopeLayout: 'rings',
      scopeColoring: 'channel',
      scopeTrails: 0.6,
      scopeGlow: 0.5,
      scopeBloom: 0.4,
      scopeReactivity: 0.55,
      scopeSpan: 768,
    });
    expect(preset('today').settings).toMatchObject({
      scopeTrails: 0,
      scopeGlow: 0,
      scopeBloom: 0,
      scopeReactivity: 0,
      scopeLineWidth: 2,
      scopeCore: false,
      scopeCrt: false,
    });
  });

  it('keeps every preset value inside its control range', () => {
    SCOPE_PRESETS.forEach(({ settings }) => {
      expect(scopeSettingsOf(settings as unknown as Record<string, unknown>)).toEqual(settings);
      expect(SCOPE_SPANS).toContain(settings.scopeSpan);
    });
  });
});

describe('scopeSettingsOf', () => {
  it('fills missing keys from the defaults', () => {
    expect(scopeSettingsOf({})).toEqual(SCOPE_DEFAULTS);
  });

  it('replaces junk with defaults and clamps numbers into range', () => {
    const settings = scopeSettingsOf({
      scopeLayout: 'milkdrop',
      scopeColoring: 'rainbow',
      scopeTrails: 'abc',
      scopeGlow: 7,
      scopeBloom: -1,
      scopeReactivity: NaN,
      scopeLineWidth: 99,
      scopeCore: 'yes',
      scopeFill: 1,
      scopeCrt: null,
      scopeSpan: 300,
    });
    expect(settings).toEqual({
      ...SCOPE_DEFAULTS,
      scopeGlow: 1,
      scopeBloom: 0,
      scopeLineWidth: 5,
    });
  });

  it('caps trails below 1 so the picture always fades', () => {
    expect(scopeSettingsOf({ scopeTrails: 1 }).scopeTrails).toBe(0.9);
  });
});

describe('matchingScopePreset', () => {
  it('finds the preset whose values all match, else null', () => {
    expect(matchingScopePreset({})!.id).toBe('green-crt');
    expect(matchingScopePreset({ ...preset('halo').settings })!.id).toBe('halo');
    expect(matchingScopePreset({ ...preset('halo').settings, scopeGlow: 0.55 })).toBeNull();
  });
});
