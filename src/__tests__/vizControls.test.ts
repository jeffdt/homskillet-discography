import { describe, expect, it } from 'vitest';
import { STAGE_DEFAULTS } from '../config/stageSettings';
import { displayValue } from '../components/stage/stageControls';
import {
  MORE_SCOPE_SLIDERS,
  MORE_SCOPE_TOGGLES,
  SCOPE_BLOOM,
  SCOPE_CRT,
  SCOPE_EFFECT_SLIDERS,
  SCOPE_LINE_WIDTH,
  SCOPE_TRAILS,
} from '../components/stage/vizControls';

describe('scope controls', () => {
  const all = [...SCOPE_EFFECT_SLIDERS, ...MORE_SCOPE_SLIDERS, SCOPE_CRT, ...MORE_SCOPE_TOGGLES];

  it('writes settings the stage defaults know, with unique ids and explanations', () => {
    all.forEach((def) => {
      expect(Object.keys(STAGE_DEFAULTS)).toContain(def.key);
      expect(def.explanation.length).toBeGreaterThan(10);
    });
    expect(new Set(all.map((def) => def.id)).size).toBe(all.length);
    expect(SCOPE_EFFECT_SLIDERS.map((def) => def.label)).toEqual([
      'Trails',
      'Glow',
      'Bloom',
      'Reacts to loudness',
    ]);
  });

  it('shows percentages, Off at zero, and line width in px', () => {
    expect(displayValue(SCOPE_BLOOM, 0)).toBe('Off');
    expect(displayValue(SCOPE_BLOOM, 0.45)).toBe('45%');
    expect(displayValue(SCOPE_TRAILS, 1)).toBe('90%');
    expect(displayValue(SCOPE_LINE_WIDTH, 1.5)).toBe('1.5 px');
  });

  it('stores switches as booleans', () => {
    expect(SCOPE_CRT.toValue(true)).toBe(true);
    expect(SCOPE_CRT.isOn(undefined)).toBe(false);
  });
});
