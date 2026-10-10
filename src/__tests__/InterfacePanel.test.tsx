import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import InterfacePanel from '../components/InterfacePanel';
import { UserContext, UserSettings } from '../components/UserProvider';
import {
  FILM_GRAIN,
  REACTIVE_STRENGTH,
  MORE_SPARK_SLIDERS,
  REACTIVE_UI,
  SPARKS,
  SPARK_FADE,
  SPARK_SLIDERS,
  STAGE_COPY,
} from '../components/stage/stageControls';
import { INTERFACE_DEFAULTS, SPARK_DEFAULTS, STAGE_DEFAULTS } from '../config/stageSettings';
import { UI_PALETTES } from '../config/uiPalettes';

function renderPanel(stored: Record<string, unknown> = {}) {
  const updateSettings = vi.fn();
  const settings = { showPlayerSettings: true, ...STAGE_DEFAULTS, ...stored } as UserSettings;
  render(
    <UserContext.Provider value={{ settings, updateSettings, replaceSettings: vi.fn() }}>
      <InterfacePanel />
    </UserContext.Provider>
  );
  return { updateSettings };
}

/** The label of the one checked card in a radio group. */
function checkedIn(group: string): string {
  const radios = within(screen.getByRole('radiogroup', { name: group })).getAllByRole('radio');
  const checked = radios.filter((radio) => radio.getAttribute('aria-checked') === 'true');
  expect(checked).toHaveLength(1);
  return checked[0].textContent || '';
}

describe('InterfacePanel', () => {
  it('shows every interface control with its explanation', () => {
    renderPanel();
    ['Look', 'Sparks'].forEach((heading) =>
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    );
    [REACTIVE_STRENGTH, FILM_GRAIN, ...SPARK_SLIDERS, ...MORE_SPARK_SLIDERS].forEach((def) => {
      expect(screen.getByLabelText(def.label)).toBeTruthy();
      expect(screen.getByText(def.explanation)).toBeTruthy();
    });
    [REACTIVE_UI, SPARKS, SPARK_FADE].forEach((def) => {
      expect(screen.getByRole('switch', { name: def.label })).toBeTruthy();
      expect(screen.getByText(def.explanation)).toBeTruthy();
    });
    expect(screen.getByRole('radiogroup', { name: 'Accent color' })).toBeTruthy();
    expect(screen.getByText(STAGE_COPY.accent)).toBeTruthy();
    expect(screen.getByText(STAGE_COPY.resetInterface)).toBeTruthy();
    expect(screen.getByText('More spark settings')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset sparks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset interface' })).toBeTruthy();
  });

  it('leaves the visualizer controls to the Visualizer panel', () => {
    renderPanel();
    expect(screen.queryByRole('radiogroup', { name: 'Visualizer style' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Channel palette' })).toBeNull();
  });

  it('picks an accent', () => {
    const { updateSettings } = renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: UI_PALETTES[3].label }));
    expect(updateSettings).toHaveBeenLastCalledWith({ uiPalette: 3 });
  });

  it('shows a valid selection for stale or unknown stored values', () => {
    renderPanel({ uiPalette: 9, filmGrainAmount: 'garbage' });
    expect(checkedIn('Accent color')).toBe(UI_PALETTES[0].label);
    expect((screen.getByLabelText('Film grain') as HTMLInputElement).value).toBe('50');
  });

  it('writes slider values in the stored units', () => {
    const { updateSettings } = renderPanel();
    fireEvent.change(screen.getByLabelText('Film grain'), { target: { value: '0' } });
    expect(updateSettings).toHaveBeenLastCalledWith({ filmGrainAmount: 0 });
  });

  it('turns the pulse off and sparks on', () => {
    const { updateSettings } = renderPanel();
    fireEvent.click(screen.getByRole('switch', { name: REACTIVE_UI.label }));
    expect(updateSettings).toHaveBeenLastCalledWith({ audioReactivePulse: false });
    fireEvent.click(screen.getByRole('switch', { name: 'Sparks' }));
    expect(updateSettings).toHaveBeenLastCalledWith({ sliderSparksEnabled: true });
  });

  it('disables the pulse strength slider while the pulse is off', () => {
    renderPanel({ audioReactivePulse: false });
    expect((screen.getByLabelText(REACTIVE_STRENGTH.label) as HTMLInputElement).disabled).toBe(
      true
    );
  });

  it('leaves the pulse strength slider enabled while the pulse is on', () => {
    renderPanel();
    expect((screen.getByLabelText(REACTIVE_STRENGTH.label) as HTMLInputElement).disabled).toBe(
      false
    );
  });

  it('disables spark tuning while sparks are off', () => {
    renderPanel();
    [...SPARK_SLIDERS, ...MORE_SPARK_SLIDERS].forEach((def) =>
      expect((screen.getByLabelText(def.label) as HTMLInputElement).disabled).toBe(true)
    );
    expect((screen.getByRole('switch', { name: 'Fade out' }) as HTMLInputElement).disabled).toBe(
      true
    );
  });

  it('enables spark tuning once sparks are on and stores the fade mode', () => {
    const { updateSettings } = renderPanel({ sliderSparksEnabled: true });
    [...SPARK_SLIDERS, ...MORE_SPARK_SLIDERS].forEach((def) =>
      expect((screen.getByLabelText(def.label) as HTMLInputElement).disabled).toBe(false)
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Fade out' }));
    expect(updateSettings).toHaveBeenLastCalledWith({ particleFadeMode: 'instant' });
  });

  it('resets the sparks, then the whole interface without touching the visualizer', () => {
    const { updateSettings } = renderPanel({ sliderSparksEnabled: true, particleGravity: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Reset sparks' }));
    expect(updateSettings).toHaveBeenLastCalledWith(SPARK_DEFAULTS);
    fireEvent.click(screen.getByRole('button', { name: 'Reset interface' }));
    expect(updateSettings).toHaveBeenLastCalledWith(INTERFACE_DEFAULTS);
    expect(INTERFACE_DEFAULTS).not.toHaveProperty('visualizerStyle');
    expect(INTERFACE_DEFAULTS).not.toHaveProperty('channelPalette');
  });
});
