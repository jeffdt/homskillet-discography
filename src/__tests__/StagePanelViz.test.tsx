import fs from 'fs';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import StagePanel from '../components/StagePanel';
import { UserContext, UserSettings } from '../components/UserProvider';
import { SCOPE_ZOOM, STAGE_COPY } from '../components/stage/stageControls';
import {
  MORE_SCOPE_SLIDERS,
  MORE_SCOPE_TOGGLES,
  SCOPE_CRT,
  SCOPE_EFFECT_SLIDERS,
  VIZ_COPY,
} from '../components/stage/vizControls';
import { SPECTRUM_GRADIENTS } from '../config/spectrumGradients';
import { SCOPE_PRESETS, STAGE_DEFAULTS } from '../config/stageSettings';

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
  it('offers the three colorings with add like light checked', () => {
    renderPanel();
    expect(checkedIn('Spectrum coloring')).toBe('Add light');
    expect(screen.getByText(/their light adds up, like colored stage lights/)).toBeTruthy();
    expect(screen.queryByRole('radiogroup', { name: 'Gradient' })).toBeNull();
  });

  it('stores the chosen coloring', () => {
    const { updateSettings } = renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: 'Unified' }));
    expect(updateSettings).toHaveBeenCalledWith({ spectrumColoring: 'unified' });
  });

  it('shows all 23 gradients only for the unified coloring', () => {
    const { updateSettings } = renderPanel({ spectrumColoring: 'unified' });
    const group = screen.getByRole('radiogroup', { name: 'Gradient' });
    expect(within(group).getAllByRole('radio')).toHaveLength(SPECTRUM_GRADIENTS.length);
    expect(checkedIn('Gradient')).toBe('MW Green');
    expect(screen.getByText(VIZ_COPY.gradient)).toBeTruthy();
    fireEvent.click(within(group).getByRole('radio', { name: 'bz Inferno' }));
    expect(updateSettings).toHaveBeenCalledWith({ spectrumGradient: 'bz-inferno' });
  });

  it('hides scope controls in the spectrum style', () => {
    renderPanel();
    expect(screen.queryByRole('group', { name: 'Scope presets' })).toBeNull();
    expect(screen.queryByLabelText('Trails')).toBeNull();
  });
});

describe('StagePanel channel scopes', () => {
  it('shows presets with Green CRT pressed, and every scope control explained', () => {
    renderPanel({ visualizerStyle: 'scopes' });
    const presets = screen.getByRole('group', { name: 'Scope presets' });
    expect(
      within(presets).getByRole('button', { name: 'Green CRT' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(screen.getByText(VIZ_COPY.presets)).toBeTruthy();
    expect(checkedIn('Scope layout')).toBe('Stacked');
    expect(checkedIn('Trace color')).toBe('Accent color');
    [...SCOPE_EFFECT_SLIDERS, SCOPE_ZOOM, ...MORE_SCOPE_SLIDERS].forEach((def) => {
      expect(screen.getByLabelText(def.label)).toBeTruthy();
      expect(screen.getByText(def.explanation)).toBeTruthy();
    });
    [SCOPE_CRT, ...MORE_SCOPE_TOGGLES].forEach((def) =>
      expect(screen.getByText(def.explanation)).toBeTruthy()
    );
    expect(screen.queryByRole('radiogroup', { name: 'Spectrum coloring' })).toBeNull();
  });

  it('says Custom when no preset matches', () => {
    renderPanel({ visualizerStyle: 'scopes', scopeGlow: 0.35 });
    const presets = screen.getByRole('group', { name: 'Scope presets' });
    within(presets)
      .getAllByRole('button')
      .forEach((button) => expect(button.getAttribute('aria-pressed')).toBe('false'));
    expect(screen.getByText(VIZ_COPY.custom)).toBeTruthy();
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
    fireEvent.click(screen.getByRole('radio', { name: 'Rings' }));
    expect(updateSettings).toHaveBeenCalledWith({ scopeLayout: 'rings' });
    fireEvent.click(screen.getByRole('radio', { name: 'By channel' }));
    expect(updateSettings).toHaveBeenCalledWith({ scopeColoring: 'channel' });
    fireEvent.change(screen.getByLabelText('Glow'), { target: { value: '0.3' } });
    expect(updateSettings).toHaveBeenCalledWith({ scopeGlow: 0.3 });
  });
});

describe('StagePanel channel colors note', () => {
  it('says where channel colors show', () => {
    renderPanel();
    expect(screen.getByText(STAGE_COPY.channelColors)).toBeTruthy();
    expect(STAGE_COPY.channelColors).toContain("scopes' By channel traces");
    expect(STAGE_COPY.channelColors).toContain("spectrum's Add light and Average colorings");
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
  it('appears for the default Green CRT scopes, and switching clears it', () => {
    const { updateSettings } = renderPanel({ visualizerStyle: 'scopes' });
    fireEvent.click(screen.getByRole('button', { name: VIZ_COPY.colorScopesByChannel }));
    expect(updateSettings).toHaveBeenCalledWith({ scopeColoring: 'channel' });
  });

  it('does not appear for the default Add light spectrum', () => {
    renderPanel();
    expect(screen.queryByText(VIZ_COPY.spectrumIgnoresChannels)).toBeNull();
    expect(screen.queryByText(VIZ_COPY.scopesIgnoreChannels)).toBeNull();
  });
});
