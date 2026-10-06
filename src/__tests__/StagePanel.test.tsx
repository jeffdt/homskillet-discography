import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { VoiceInfo } from '../audio/data/contract';
import StagePanel from '../components/StagePanel';
import { UserContext, UserSettings } from '../components/UserProvider';
import {
  FILM_GRAIN,
  MORE_SPARK_SLIDERS,
  PEAK_SLIDERS,
  REACTIVE_UI,
  SCOPE_ZOOM,
  SPARKS,
  SPARK_FADE,
  SPARK_SLIDERS,
  STAGE_COPY,
} from '../components/stage/stageControls';
import { CHANNEL_PALETTES } from '../config/channelPalettes';
import { SPARK_DEFAULTS, STAGE_DEFAULTS } from '../config/stageSettings';
import { UI_PALETTES } from '../config/uiPalettes';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

function renderPanel(
  stored: Record<string, unknown> = {},
  wrap: (panel: React.ReactElement) => React.ReactElement = (panel) => panel
) {
  const updateSettings = vi.fn();
  const settings = { showPlayerSettings: true, ...STAGE_DEFAULTS, ...stored } as UserSettings;
  render(
    wrap(
      <UserContext.Provider value={{ settings, updateSettings, replaceSettings: vi.fn() }}>
        <StagePanel />
      </UserContext.Provider>
    )
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

function voice(index: number, name: string, state: Partial<VoiceInfo> = {}): VoiceInfo {
  return { index, name, chip: '2A03', muted: false, soloed: false, audible: true, ...state };
}

describe('StagePanel', () => {
  it('shows every Stage control with its explanation', () => {
    renderPanel();
    ['Style', 'Channel colors', 'Interface', 'Sparks'].forEach((heading) =>
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    );
    [...PEAK_SLIDERS, FILM_GRAIN, ...SPARK_SLIDERS, ...MORE_SPARK_SLIDERS].forEach((def) => {
      expect(screen.getByLabelText(def.label)).toBeTruthy();
      expect(screen.getByText(def.explanation)).toBeTruthy();
    });
    [REACTIVE_UI, SPARKS, SPARK_FADE].forEach((def) => {
      expect(screen.getByRole('switch', { name: def.label })).toBeTruthy();
      expect(screen.getByText(def.explanation)).toBeTruthy();
    });
    ['Visualizer style', 'Channel palette', 'Accent color'].forEach((group) =>
      expect(screen.getByRole('radiogroup', { name: group })).toBeTruthy()
    );
    expect(screen.getByText(STAGE_COPY.channelColors)).toBeTruthy();
    expect(screen.getByText(STAGE_COPY.accent)).toBeTruthy();
    expect(screen.getByText(STAGE_COPY.reset)).toBeTruthy();
    expect(screen.getByText('More spark settings')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset sparks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset stage' })).toBeTruthy();
  });

  it('shows peak settings with the spectrum and the zoom with the scopes', () => {
    renderPanel();
    expect(screen.getByLabelText('Peak decay')).toBeTruthy();
    expect(screen.queryByLabelText(SCOPE_ZOOM.label)).toBeNull();
  });

  it('swaps peak settings for the zoom in the scopes style', () => {
    renderPanel({ visualizerStyle: 'scopes' });
    expect(screen.getByLabelText(SCOPE_ZOOM.label)).toBeTruthy();
    expect(screen.getByText(SCOPE_ZOOM.explanation)).toBeTruthy();
    expect(screen.queryByLabelText('Peak decay')).toBeNull();
  });

  it('picks a style, a channel palette and an accent', () => {
    const { updateSettings } = renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: 'Channel scopes' }));
    expect(updateSettings).toHaveBeenLastCalledWith({ visualizerStyle: 'scopes' });
    fireEvent.click(screen.getByRole('radio', { name: CHANNEL_PALETTES[2].label }));
    expect(updateSettings).toHaveBeenLastCalledWith({ channelPalette: CHANNEL_PALETTES[2].id });
    fireEvent.click(screen.getByRole('radio', { name: UI_PALETTES[3].label }));
    expect(updateSettings).toHaveBeenLastCalledWith({ uiPalette: 3 });
  });

  it('describes the selected style and channel palette', () => {
    renderPanel({ channelPalette: CHANNEL_PALETTES[1].id });
    expect(screen.getByText(CHANNEL_PALETTES[1].description)).toBeTruthy();
    expect(screen.getByText(/Pitch runs from low/)).toBeTruthy();
  });

  it('moves through palettes with the arrow keys', () => {
    const { updateSettings } = renderPanel();
    const chromatic = screen.getByRole('radio', { name: CHANNEL_PALETTES[0].label });
    chromatic.focus();
    fireEvent.keyDown(chromatic, { key: 'ArrowRight' });
    expect(updateSettings).toHaveBeenLastCalledWith({ channelPalette: CHANNEL_PALETTES[1].id });
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: CHANNEL_PALETTES[1].label })
    );
  });

  it('shows a valid selection for stale or unknown stored values', () => {
    renderPanel({
      channelPalette: 'retired-palette',
      uiPalette: 9,
      visualizerStyle: 'milkdrop',
      peakQuantization: 3,
      filmGrainAmount: 'garbage',
    });
    expect(checkedIn('Channel palette')).toBe('Chromatic');
    expect(checkedIn('Accent color')).toBe(UI_PALETTES[0].label);
    expect(checkedIn('Visualizer style')).toBe('Spectrum');
    expect((screen.getByLabelText('Peak quantization') as HTMLInputElement).value).toBe('1');
    expect(screen.getByText('Low')).toBeTruthy();
    expect((screen.getByLabelText('Film grain') as HTMLInputElement).value).toBe('50');
  });

  it('writes slider values in the stored units', () => {
    const { updateSettings } = renderPanel();
    fireEvent.change(screen.getByLabelText('Peak decay'), { target: { value: '2' } });
    expect(updateSettings).toHaveBeenLastCalledWith({ peakDecayRate: 0.95 });
    fireEvent.change(screen.getByLabelText('Peak quantization'), { target: { value: '3' } });
    expect(updateSettings).toHaveBeenLastCalledWith({ peakQuantization: 8 });
    fireEvent.change(screen.getByLabelText('Film grain'), { target: { value: '0' } });
    expect(updateSettings).toHaveBeenLastCalledWith({ filmGrainAmount: 0 });
  });

  it('turns reactive UI off and sparks on', () => {
    const { updateSettings } = renderPanel();
    fireEvent.click(screen.getByRole('switch', { name: 'Reactive UI' }));
    expect(updateSettings).toHaveBeenLastCalledWith({ audioReactivePulse: false });
    fireEvent.click(screen.getByRole('switch', { name: 'Sparks' }));
    expect(updateSettings).toHaveBeenLastCalledWith({ sliderSparksEnabled: true });
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

  it('resets the sparks and the whole stage', () => {
    const { updateSettings } = renderPanel({ sliderSparksEnabled: true, particleGravity: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Reset sparks' }));
    expect(updateSettings).toHaveBeenLastCalledWith(SPARK_DEFAULTS);
    fireEvent.click(screen.getByRole('button', { name: 'Reset stage' }));
    expect(updateSettings).toHaveBeenLastCalledWith(STAGE_DEFAULTS);
  });

  it('asks for a track before it can show which color is which channel', () => {
    renderPanel();
    expect(screen.getByText(STAGE_COPY.noVoices)).toBeTruthy();
  });

  it("lists the track's channels with their color and dims the ones you cannot hear", () => {
    const data = createTestAudioData();
    renderPanel({}, (panel) => withAudioData(data.value, panel));
    act(() =>
      data.source.setVoices([
        voice(0, 'Square 1'),
        voice(2, 'Triangle', { muted: true, audible: false }),
        voice(3, 'Noise', { audible: false }),
      ])
    );
    const square = screen.getByText('Square 1').closest('li')!;
    const triangle = screen.getByText('Triangle').closest('li')!;
    const noise = screen.getByText('Noise').closest('li')!;
    expect(square.className).not.toContain('is-silent');
    expect(square.querySelector('[data-channel]')!.getAttribute('data-channel')).toBe('0');
    expect(triangle.className).toContain('is-silent');
    expect(triangle.querySelector('[data-channel]')!.getAttribute('data-channel')).toBe('2');
    expect(within(triangle).getByText('muted')).toBeTruthy();
    expect(within(noise).getByText('not soloed')).toBeTruthy();
  });
});
