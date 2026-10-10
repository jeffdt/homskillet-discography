// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MIXER_SLIDERS, formatPercent, sliderValue } from '../../components/mixer/mixerControls';

const [SPEED, BASS, STEREO] = MIXER_SLIDERS;
const NO_TRACK = { playerKey: null, tempo: 1, paramValues: {} };
const PLAYING = { playerKey: 'gme', tempo: 1.25, paramValues: { subbass: 0.5, stereoWidth: 0.75 } };

describe('mixer controls', () => {
  it('keeps the old ranges, defaults and settings keys', () => {
    expect(MIXER_SLIDERS.map((def) => def.label)).toEqual(['Speed', 'Bass boost', 'Stereo width']);
    expect(MIXER_SLIDERS.map((def) => def.settingKey)).toEqual([
      'tempo',
      'gme.subbass',
      'gme.stereoWidth',
    ]);
    expect([SPEED.min, SPEED.max, SPEED.step, SPEED.defaultValue]).toEqual([0.3, 2, 0.05, 1]);
    expect([BASS.min, BASS.max, BASS.step, BASS.defaultValue]).toEqual([0, 2, 0.01, 0]);
    expect([STEREO.min, STEREO.max, STEREO.step, STEREO.defaultValue]).toEqual([0, 1, 0.01, 1]);
  });

  it('explains every control in one plain line', () => {
    MIXER_SLIDERS.forEach((def) => {
      expect(def.explanation.length).toBeGreaterThan(20);
      expect(def.explanation).not.toMatch(new RegExp(String.fromCharCode(0x2014)));
    });
  });

  it('shows the playing value first', () => {
    expect(sliderValue(SPEED, PLAYING, { tempo: 1.5 })).toBe(1.25);
    expect(sliderValue(BASS, PLAYING, {})).toBe(0.5);
    expect(sliderValue(STEREO, PLAYING, {})).toBe(0.75);
  });

  it('shows the saved value, then the default, before anything plays', () => {
    expect(sliderValue(SPEED, NO_TRACK, { tempo: 1.5 })).toBe(1.5);
    expect(sliderValue(SPEED, NO_TRACK, {})).toBe(1);
    expect(sliderValue(STEREO, NO_TRACK, {})).toBe(1);
  });

  it('reads saved zero and string values', () => {
    expect(sliderValue(STEREO, NO_TRACK, { 'gme.stereoWidth': 0 })).toBe(0);
    expect(sliderValue(BASS, NO_TRACK, { 'gme.subbass': '0.5' })).toBe(0.5);
    expect(sliderValue(BASS, NO_TRACK, { 'gme.subbass': 'garbage' })).toBe(0);
  });

  it('formats values as whole percentages', () => {
    expect(formatPercent(1.25)).toBe('125%');
    expect(formatPercent(0.005)).toBe('1%');
    expect(formatPercent(0)).toBe('0%');
  });
});
