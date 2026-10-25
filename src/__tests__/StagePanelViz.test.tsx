import fs from 'fs';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import StagePanel from '../components/StagePanel';
import { UserContext, UserSettings } from '../components/UserProvider';
import { SCOPE_ZOOM, STAGE_COPY } from '../components/stage/stageControls';
import {
  MORE_SCOPE_SLIDERS,
  MORE_SCOPE_TOGGLES,
  SCOPE_EFFECT_SLIDERS,
  VIZ_COPY,
} from '../components/stage/vizControls';
import { SPECTRUM_GRADIENTS } from '../config/spectrumGradients';
import { SCOPE_PRESETS, STAGE_DEFAULTS } from '../config/stageSettings';
import { expectControlHelp } from './helpers/controlHelp';

function renderPanel(stored: Record<string, unknown> = {}) {
  const updateSettings = vi.fn();
  const settings = { showPlayerSettings: true, ...STAGE_DEFAULTS, ...stored } as UserSettings;
  render(
    <UserContext.Provider value={{ settings, updateSettings, replaceSettings: vi.fn() }}>
      <StagePanel />
    </UserContext.Provider>
  );
  return { updateSettings };
}

function checkedIn(group: string): string {
  const radios = within(screen.getByRole('radiogroup', { name: group })).getAllByRole('radio');
  return radios.find((radio) => radio.getAttribute('aria-checked') === 'true')?.textContent || '';
}

describe('StagePanel spectrum coloring', () => {
  it('offers the three colorings with Unified checked', () => {
    renderPanel({ visualizerStyle: 'spectrum' });
    expect(checkedIn('Spectrum coloring')).toBe('Unified');
    expect(screen.getByText(/Colors by loudness/)).toBeTruthy();
    expect(screen.getByRole('radiogroup', { name: 'Gradient' })).toBeTruthy();
  });

  it('stores the chosen coloring and hides the gradients outside Unified', () => {
    const { updateSettings } = renderPanel({
      visualizerStyle: 'spectrum',
      spectrumColoring: 'additive',
    });
    expect(screen.queryByRole('radiogroup', { name: 'Gradient' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Unified' }));
    expect(updateSettings).toHaveBeenCalledWith({ spectrumColoring: 'unified' });
  });

  it('shows all 23 gradients only for the unified coloring', () => {
    const { updateSettings } = renderPanel({
      visualizerStyle: 'spectrum',
      spectrumColoring: 'unified',
    });
    const group = screen.getByRole('radiogroup', { name: 'Gradient' });
    expect(within(group).getAllByRole('radio')).toHaveLength(SPECTRUM_GRADIENTS.length);
    expect(checkedIn('Gradient')).toBe('MW Green');
    expect(screen.getByText(VIZ_COPY.gradient)).toBeTruthy();
    fireEvent.click(within(group).getByRole('radio', { name: 'bz Inferno' }));
    expect(updateSettings).toHaveBeenCalledWith({ spectrumGradient: 'bz-inferno' });
  });

  it('hides scope controls in the spectrum style', () => {
    renderPanel({ visualizerStyle: 'spectrum' });
    expect(screen.queryByRole('group', { name: 'Scope presets' })).toBeNull();
    expect(screen.queryByLabelText('Trails')).toBeNull();
  });
});

describe('StagePanel channel scopes', () => {
  it('starts as a custom mix of raw rings, with every scope control explained', () => {
    renderPanel({ visualizerStyle: 'scopes' });
    const presets = screen.getByRole('group', { name: 'Scope presets' });
    within(presets)
      .getAllByRole('button')
      .forEach((button) => expect(button.getAttribute('aria-pressed')).toBe('false'));
    expect(checkedIn('Scope layout')).toBe('Rings');
    expect(checkedIn('Trace color')).toBe('By channel');
    [...SCOPE_EFFECT_SLIDERS, SCOPE_ZOOM, ...MORE_SCOPE_SLIDERS].forEach((def) => {
      expect(screen.getByLabelText(def.label)).toBeTruthy();
      expectControlHelp(def);
    });
    MORE_SCOPE_TOGGLES.forEach((def) => expectControlHelp(def));
    expect(screen.queryByRole('radiogroup', { name: 'Spectrum coloring' })).toBeNull();
  });

  it('presses no preset when none matches', () => {
    renderPanel({ visualizerStyle: 'scopes', scopeGlow: 0.35 });
    const presets = screen.getByRole('group', { name: 'Scope presets' });
    within(presets)
      .getAllByRole('button')
      .forEach((button) => expect(button.getAttribute('aria-pressed')).toBe('false'));
  });

  it('writes every value of a preset in one update', () => {
    const { updateSettings } = renderPanel({ visualizerStyle: 'scopes' });
    fireEvent.click(screen.getByRole('button', { name: 'Halo' }));
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).toHaveBeenCalledWith(
      SCOPE_PRESETS.find((p) => p.id === 'halo')!.settings
    );
  });

  it('stores the layout, trace color and slider values', () => {
    const { updateSettings } = renderPanel({ visualizerStyle: 'scopes' });
    fireEvent.click(screen.getByRole('radio', { name: 'Stacked' }));
    expect(updateSettings).toHaveBeenCalledWith({ scopeLayout: 'stacked' });
    fireEvent.click(screen.getByRole('radio', { name: 'Accent color' }));
    expect(updateSettings).toHaveBeenCalledWith({ scopeColoring: 'unified' });
    fireEvent.change(screen.getByLabelText('Glow'), { target: { value: '0.3' } });
    expect(updateSettings).toHaveBeenCalledWith({ scopeGlow: 0.3 });
  });
});

describe('StagePanel channel colors note', () => {
  it('says where channel colors show', () => {
    renderPanel();
    expect(screen.getByText(STAGE_COPY.channelColors)).toBeTruthy();
    expect(STAGE_COPY.channelColors).toContain('Mixer');
    expect(STAGE_COPY.channelColors).toContain('used by the visualizer and the Mixer');
  });
});

describe('SwatchPicker labels', () => {
  it('wrap inside their card instead of overflowing it', () => {
    const css = fs.readFileSync('src/styles/stage.css', 'utf8');
    const rule = /\.SwatchPicker-label\s*\{([^}]*)\}/.exec(css);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/text-wrap:\s*balance/);
    expect(rule![1]).toMatch(/overflow-wrap:\s*anywhere/);
    expect(rule![1]).toMatch(/min-width:\s*0/);
  });
});

describe('StagePanel channel colors notice', () => {
  it('appears for accent-colored scopes, and switching clears it', () => {
    const { updateSettings } = renderPanel({ visualizerStyle: 'scopes', scopeColoring: 'unified' });
    fireEvent.click(screen.getByRole('button', { name: VIZ_COPY.colorScopesByChannel }));
    expect(updateSettings).toHaveBeenCalledWith({ scopeColoring: 'channel' });
  });

  it('does not appear for the default channel-colored scopes or the Add light spectrum', () => {
    renderPanel();
    expect(screen.queryByText(VIZ_COPY.scopesIgnoreChannels)).toBeNull();
    cleanup();
    renderPanel({ visualizerStyle: 'spectrum', spectrumColoring: 'additive' });
    expect(screen.queryByText(VIZ_COPY.spectrumIgnoresChannels)).toBeNull();
    expect(screen.queryByText(VIZ_COPY.scopesIgnoreChannels)).toBeNull();
  });
});
