// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  ALL_STAGE_SLIDERS,
  FILM_GRAIN,
  MORE_SPARK_SLIDERS,
  PEAK_DECAY,
  PEAK_QUANTIZATION,
  PEAK_SLIDERS,
  REACTIVE_UI,
  SCOPE_ZOOM,
  SPARKS,
  SPARK_FADE,
  SPARK_LIFESPAN,
  SPARK_SLIDERS,
  SPARK_SPAWN,
  SPARK_SPEED_VARIANCE,
  STAGE_COPY,
  STAGE_TOGGLES,
  StageSliderDef,
  displayValue,
  nearestIndex,
  sliderSetting,
  toggleSetting,
} from '../components/stage/stageControls';
import { SCOPE_SPANS, STAGE_DEFAULTS, scopeSpanOf } from '../config/stageSettings';

const EM_DASH = new RegExp(String.fromCharCode(0x2014));

/** Every position the slider can take, rounded like a range input reports it. */
function positions(def: StageSliderDef): number[] {
  const out: number[] = [];
  for (let k = 0; def.min + k * def.step <= def.max + 1e-9; k++) {
    out.push(Math.round((def.min + k * def.step) * 1000) / 1000);
  }
  return out;
}

describe('stage controls', () => {
  it('cover every old lab control once, grouped', () => {
    expect(ALL_STAGE_SLIDERS).toEqual([
      ...PEAK_SLIDERS,
      SCOPE_ZOOM,
      FILM_GRAIN,
      ...SPARK_SLIDERS,
      ...MORE_SPARK_SLIDERS,
    ]);
    expect(ALL_STAGE_SLIDERS.map((def) => def.key)).toEqual([
      'peakDecayRate',
      'peakQuantization',
      'scopeSpan',
      'filmGrainAmount',
      'particleSpawnRate',
      'particleLifespan',
      'particleBaseAngle',
      'particleAngleSpread',
      'particleSpeed',
      'particleSpeedVariance',
      'particleGravity',
    ]);
    expect(STAGE_TOGGLES.map((def) => def.key)).toEqual([
      'audioReactivePulse',
      'sliderSparksEnabled',
      'particleFadeMode',
    ]);
  });

  it('write only stage settings, have unique ids and explain themselves in plain lines', () => {
    const defs = [...ALL_STAGE_SLIDERS, ...STAGE_TOGGLES];
    expect(new Set(defs.map((def) => def.id)).size).toBe(defs.length);
    defs.forEach((def) => {
      expect(Object.keys(STAGE_DEFAULTS)).toContain(def.key);
      expect(def.explanation.length).toBeGreaterThan(20);
      expect(def.explanation).not.toMatch(EM_DASH);
    });
    Object.values(STAGE_COPY).forEach((line) => expect(line).not.toMatch(EM_DASH));
  });

  it('round-trip every slider position', () => {
    ALL_STAGE_SLIDERS.forEach((def) =>
      positions(def).forEach((p) => expect(def.toSlider(def.fromSlider(p))).toBeCloseTo(p, 6))
    );
  });

  it('place every default on its slider', () => {
    ALL_STAGE_SLIDERS.forEach((def) => {
      const value = STAGE_DEFAULTS[def.key] as number;
      const p = def.toSlider(value);
      expect(p).toBeGreaterThanOrEqual(def.min);
      expect(p).toBeLessThanOrEqual(def.max);
      expect(def.fromSlider(p)).toBeCloseTo(value, 6);
    });
  });

  it('keep the old stored values for peaks, spawn rate and speed variance', () => {
    expect(PEAK_DECAY.fromSlider(0)).toBe(0.92);
    expect(PEAK_DECAY.fromSlider(5)).toBe(0.995);
    expect(PEAK_DECAY.toSlider(0.9500000000000001)).toBe(2);
    expect(PEAK_DECAY.format(0.98)).toBe('5/6');
    expect([0, 1, 2, 3].map((p) => PEAK_QUANTIZATION.fromSlider(p))).toEqual([1, 2, 4, 8]);
    expect(PEAK_QUANTIZATION.format(1)).toBe('Off');
    expect(PEAK_QUANTIZATION.format(8)).toBe('High');
    expect(SPARK_SPAWN.fromSlider(0)).toBe(200);
    expect(SPARK_SPAWN.fromSlider(9)).toBe(20);
    expect(SPARK_SPAWN.format(20)).toBe('10');
    expect(SPARK_SPEED_VARIANCE.fromSlider(2)).toBe(20);
    expect(SPARK_SPEED_VARIANCE.format(20)).toBe('20%');
  });

  it('format values the way the panel shows them', () => {
    expect(SCOPE_ZOOM.format(512)).toBe('21 ms');
    expect(FILM_GRAIN.format(0)).toBe('Off');
    expect(FILM_GRAIN.format(35)).toBe('35%');
    expect(SPARK_LIFESPAN.format(600)).toBe('0.6 s');
  });

  it('snap unknown stored values to the nearest step, ties to the lower', () => {
    expect(nearestIndex([1, 2, 4, 8], 3)).toBe(1);
    expect(PEAK_QUANTIZATION.toSlider(3)).toBe(1);
    expect(PEAK_QUANTIZATION.toSlider(100)).toBe(3);
    expect(FILM_GRAIN.toSlider(150)).toBe(100);
    expect(FILM_GRAIN.toSlider(-5)).toBe(0);
  });

  it('read stored values with defaults for missing or broken ones', () => {
    expect(sliderSetting({ filmGrainAmount: 0 }, FILM_GRAIN)).toBe(0);
    expect(sliderSetting({ filmGrainAmount: '35' }, FILM_GRAIN)).toBe(35);
    expect(sliderSetting({ filmGrainAmount: 'garbage' }, FILM_GRAIN)).toBe(50);
    expect(sliderSetting({ filmGrainAmount: null }, FILM_GRAIN)).toBe(50);
    expect(sliderSetting({}, PEAK_DECAY)).toBe(0.98);
  });

  it('read switches with their defaults', () => {
    expect(toggleSetting({}, REACTIVE_UI)).toBe(true);
    expect(toggleSetting({ audioReactivePulse: false }, REACTIVE_UI)).toBe(false);
    expect(toggleSetting({}, SPARKS)).toBe(false);
    expect(toggleSetting({ sliderSparksEnabled: true }, SPARKS)).toBe(true);
    expect(toggleSetting({}, SPARK_FADE)).toBe(true);
    expect(toggleSetting({ particleFadeMode: 'instant' }, SPARK_FADE)).toBe(false);
    expect(SPARK_FADE.toValue(false)).toBe('instant');
    expect(SPARK_FADE.toValue(true)).toBe('fade');
  });

  it('resolve the scope zoom like the renderer does', () => {
    [1000, '256', undefined, 'garbage', 768].forEach((value) =>
      expect(SCOPE_ZOOM.toSlider(value as number)).toBe(SCOPE_SPANS.indexOf(scopeSpanOf(value)))
    );
  });

  it('display the snapped value for stale stored values', () => {
    expect(displayValue(FILM_GRAIN, 150)).toBe('100%');
    expect(displayValue(FILM_GRAIN, 0)).toBe('Off');
    expect(displayValue(SCOPE_ZOOM, 1000)).toBe('21 ms');
    expect(displayValue(PEAK_QUANTIZATION, 3)).toBe('Low');
  });
});
