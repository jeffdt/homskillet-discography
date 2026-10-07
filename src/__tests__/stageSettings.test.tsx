import React, { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { UserContext, UserProvider } from '../components/UserProvider';
import { DEFAULT_CHANNEL_PALETTE_ID } from '../config/channelPalettes';
import {
  SCOPE_SPANS,
  SPARK_DEFAULTS,
  STAGE_DEFAULTS,
  VISUALIZER_STYLES,
  scopeSpanOf,
  visualizerStyleById,
} from '../config/stageSettings';
import { UI_PALETTES, uiPaletteAt } from '../config/uiPalettes';

describe('visualizer styles', () => {
  it('offer the channel spectrum first, then channel scopes, each explained', () => {
    expect(VISUALIZER_STYLES.map((style) => style.id)).toEqual(['spectrum', 'scopes']);
    VISUALIZER_STYLES.forEach((style) => {
      expect(style.label.length).toBeGreaterThan(0);
      expect(style.description.length).toBeGreaterThan(40);
    });
  });

  it('fall back to the spectrum for missing or unknown ids', () => {
    expect(visualizerStyleById(undefined).id).toBe('spectrum');
    expect(visualizerStyleById(null).id).toBe('spectrum');
    expect(visualizerStyleById('milkdrop').id).toBe('spectrum');
    expect(visualizerStyleById('scopes').id).toBe('scopes');
  });
});

describe('scope spans', () => {
  it('accept only the offered spans', () => {
    expect(SCOPE_SPANS).toEqual([256, 512, 768]);
    expect(scopeSpanOf(256)).toBe(256);
    expect(scopeSpanOf(768)).toBe(768);
    expect(scopeSpanOf(1000)).toBe(512);
    expect(scopeSpanOf('256')).toBe(512);
    expect(scopeSpanOf(undefined)).toBe(512);
  });
});

describe('stage defaults', () => {
  it('keep the existing defaults and add the style and zoom', () => {
    expect(STAGE_DEFAULTS).toEqual({
      visualizerStyle: 'spectrum',
      scopeSpan: 512,
      channelPalette: DEFAULT_CHANNEL_PALETTE_ID,
      uiPalette: 0,
      peakDecayRate: 0.98,
      peakQuantization: 4,
      audioReactivePulse: true,
      reactiveStrength: 100,
      filmGrainAmount: 50,
      sliderSparksEnabled: false,
      particleSpawnRate: 20,
      particleLifespan: 600,
      particleBaseAngle: 180,
      particleAngleSpread: 30,
      particleSpeed: 1.7,
      particleSpeedVariance: 20,
      particleGravity: 0,
      particleFadeMode: 'fade',
    });
  });

  it('hold no Mixer or playback settings', () => {
    const keys = Object.keys(STAGE_DEFAULTS);
    ['tempo', 'volume', 'shuffle', 'repeat', 'gme.subbass', 'gme.stereoWidth'].forEach((key) =>
      expect(keys).not.toContain(key)
    );
  });

  it('reset only the spark tuning with SPARK_DEFAULTS', () => {
    expect(Object.keys(SPARK_DEFAULTS).every((key) => key.startsWith('particle'))).toBe(true);
    Object.entries(SPARK_DEFAULTS).forEach(([key, value]) =>
      expect(STAGE_DEFAULTS[key as keyof typeof STAGE_DEFAULTS]).toEqual(value)
    );
  });
});

describe('uiPaletteAt', () => {
  it('returns the stored accent, or MW Green for anything out of range', () => {
    expect(uiPaletteAt(0)).toBe(UI_PALETTES[0]);
    expect(uiPaletteAt(4)).toBe(UI_PALETTES[4]);
    [9, -1, 1.5, '2', null, undefined, NaN].forEach((index) =>
      expect(uiPaletteAt(index)).toBe(UI_PALETTES[0])
    );
  });
});

let seen: Record<string, any> = {};
function Capture() {
  seen = useContext(UserContext).settings;
  return null;
}

describe('UserProvider stage defaults', () => {
  /** Node's experimental localStorage shadows jsdom's and is undefined here, so install an in-memory one. */
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        setItem: (key: string, value: string) => void store.set(key, String(value)),
        removeItem: (key: string) => void store.delete(key),
        clear: () => store.clear(),
      },
    });
  });

  afterEach(() => window.localStorage.clear());

  it('gives a new visitor every stage default', () => {
    window.localStorage.removeItem('settings');
    render(
      <UserProvider>
        <Capture />
      </UserProvider>
    );
    Object.entries(STAGE_DEFAULTS).forEach(([key, value]) => expect(seen[key]).toEqual(value));
  });

  it('keeps stored stage values and fills only the missing ones', () => {
    window.localStorage.setItem('settings', JSON.stringify({ peakDecayRate: 0.935, uiPalette: 3 }));
    render(
      <UserProvider>
        <Capture />
      </UserProvider>
    );
    expect(seen.peakDecayRate).toBe(0.935);
    expect(seen.uiPalette).toBe(3);
    expect(seen.visualizerStyle).toBe('spectrum');
    expect(seen.scopeSpan).toBe(512);
  });
});
