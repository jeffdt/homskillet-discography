import { describe, expect, it } from 'vitest';
import { VISUALIZER_DEFAULTS } from '../config/stageSettings';
import {
  buildShareQuery,
  buildShareUrl,
  hasSharedSettings,
  parseSharedSettings,
  SharedSettings,
} from '../shell/shareLink';

const SLIDER_DEFAULTS = { tempo: 1, subbass: 0, stereoWidth: 1 };
const PLAIN = { muted: [], soloed: [] };
const voices = (values: Record<number, number>, fallback: number) =>
  Array.from({ length: 8 }, (_, v) => values[v] ?? fallback);

function roundTrip(query: string): SharedSettings {
  return parseSharedSettings(`?${query}`);
}

describe('buildShareQuery', () => {
  it('is a plain ?play= link when nothing differs from the defaults', () => {
    expect(
      buildShareQuery({
        trackId: 'SuperFORE!/cave.nsf',
        startMs: null,
        sliders: SLIDER_DEFAULTS,
        mix: PLAIN,
        visualizer: { ...VISUALIZER_DEFAULTS, unrelated: 3 },
      })
    ).toBe('play=SuperFORE%21/cave.nsf');
  });

  it('adds a start time only when asked and past 0', () => {
    expect(buildShareQuery({ trackId: 'A/b.nsf', startMs: 83456.7 })).toBe('play=A/b.nsf&t=83456');
    expect(buildShareQuery({ trackId: 'A/b.nsf', startMs: 0 })).toBe('play=A/b.nsf');
  });

  it('writes changed sliders, mutes, solos and per-voice percents compactly', () => {
    const query = buildShareQuery({
      trackId: 'A/b.nsf',
      startMs: null,
      sliders: { tempo: 0.3, subbass: 0, stereoWidth: 0.5 },
      mix: {
        muted: [true, false, true],
        soloed: [false, false, false, false, false, true],
        volume: voices({ 1: 0.5 }, 1),
        pan: voices({ 1: -0.4 }, 0),
        reverb: voices({ 3: 0.25 }, 0),
      },
    });
    expect(query).toBe(
      'play=A/b.nsf&speed=0.3&stereo=0.5&mute=02&solo=5&vol=100_50&pan=0_-40&verb=0_0_0_25'
    );
  });
});

describe('parseSharedSettings', () => {
  it('reads back everything buildShareQuery wrote', () => {
    const mix = {
      muted: voices({ 2: 1 }, 0).map(Boolean),
      soloed: voices({}, 0).map(Boolean),
      volume: voices({ 1: 1.5 }, 1),
      pan: voices({ 7: 1 }, 0),
      reverb: voices({ 0: 0.6 }, 0),
    };
    const visualizer = { ...VISUALIZER_DEFAULTS, scopeLayout: 'phase', scopeGlow: 0.25 };
    const shared = roundTrip(
      buildShareQuery({
        trackId: 'A/b.nsf',
        startMs: null,
        sliders: { tempo: 1.25, subbass: 0.6, stereoWidth: 1 },
        mix,
        visualizer,
      })
    );
    expect(shared.sliders).toEqual({ tempo: 1.25, subbass: 0.6 });
    expect(shared.mix).toEqual(mix);
    expect(shared.visualizer).toEqual({ scopeLayout: 'phase', scopeGlow: 0.25 });
    expect(hasSharedSettings(shared)).toBe(true);
  });

  it('has nothing to apply for a plain link', () => {
    const shared = roundTrip('play=A/b.nsf&t=5000');
    expect(shared).toEqual({ sliders: {}, mix: null, visualizer: {} });
    expect(hasSharedSettings(shared)).toBe(false);
  });

  it('clamps sliders, leaves levels for the engine to clamp, and ignores junk', () => {
    const shared = roundTrip('speed=9&bass=abc&stereo=&mute=9x1&vol=500_-20_nope&pan=300&verb=_');
    expect(shared.sliders).toEqual({ tempo: 2 });
    expect(shared.mix!.muted.slice(0, 2)).toEqual([false, true]);
    expect(shared.mix!.volume!.slice(0, 3)).toEqual([5, -0.2, 1]);
  });

  it('drops visualizer keys it does not own or whose type is wrong, and garbage viz', () => {
    const viz = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '');
    expect(
      roundTrip(
        `viz=${viz({ scopeGlow: 'bright', crtScreen: true, scopeFill: !VISUALIZER_DEFAULTS.scopeFill })}`
      ).visualizer
    ).toEqual({ scopeFill: !VISUALIZER_DEFAULTS.scopeFill });
    expect(roundTrip('viz=%%%').visualizer).toEqual({});
    expect(roundTrip(`viz=${viz([1, 2])}`).visualizer).toEqual({});
  });
});

describe('buildShareUrl', () => {
  it('puts the query after the site address', () => {
    expect(buildShareUrl({ trackId: 'A/b.nsf', startMs: null }, 'https://music.example/')).toBe(
      'https://music.example/?play=A/b.nsf'
    );
  });
});
