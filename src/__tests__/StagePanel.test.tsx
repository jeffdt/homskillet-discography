import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { VoiceInfo } from '../audio/data/contract';
import StagePanel from '../components/StagePanel';
import { UserContext, UserSettings } from '../components/UserProvider';
import {
  FILM_GRAIN,
  REACTIVE_STRENGTH,
  PEAK_QUANTIZATION,
  PEAK_SLIDERS,
  REACTIVE_UI,
  SCOPE_ZOOM,
  SPARKS,
  STAGE_COPY,
} from '../components/stage/stageControls';
import { CHANNEL_PALETTES } from '../config/channelPalettes';
import { STAGE_DEFAULTS, VISUALIZER_DEFAULTS } from '../config/stageSettings';
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
    ['Style', 'Channel colors'].forEach((heading) =>
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    );
    PEAK_SLIDERS.forEach((def) => {
      expect(screen.getByLabelText(def.label)).toBeTruthy();
      expect(screen.getByText(def.explanation)).toBeTruthy();
    });
    ['Visualizer style', 'Channel palette'].forEach((group) =>
      expect(screen.getByRole('radiogroup', { name: group })).toBeTruthy()
    );
    expect(screen.getByText(STAGE_COPY.channelColors)).toBeTruthy();
    expect(screen.getByText(STAGE_COPY.resetVisualizer)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset visualizer' })).toBeTruthy();
  });

  it('leaves the interface controls to the Interface panel', () => {
    renderPanel();
    expect(screen.queryByRole('radiogroup', { name: 'Accent color' })).toBeNull();
    [REACTIVE_UI, SPARKS].forEach((def) =>
      expect(screen.queryByRole('switch', { name: def.label })).toBeNull()
    );
    [REACTIVE_STRENGTH, FILM_GRAIN].forEach((def) =>
      expect(screen.queryByLabelText(def.label)).toBeNull()
    );
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

  it.each([1000, '768'])(
    'shows the default zoom for an unsupported stored span %s',
    (scopeSpan) => {
      renderPanel({ visualizerStyle: 'scopes', scopeSpan });
      expect((screen.getByLabelText(SCOPE_ZOOM.label) as HTMLInputElement).value).toBe('1');
      expect(screen.getByText('21 ms')).toBeTruthy();
    }
  );

  it('picks a style and a channel palette', () => {
    const { updateSettings } = renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: 'Channel scopes' }));
    expect(updateSettings).toHaveBeenLastCalledWith({ visualizerStyle: 'scopes' });
    fireEvent.click(screen.getByRole('radio', { name: CHANNEL_PALETTES[2].label }));
    expect(updateSettings).toHaveBeenLastCalledWith({ channelPalette: CHANNEL_PALETTES[2].id });
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
      visualizerStyle: 'milkdrop',
      peakQuantization: 3,
    });
    expect(checkedIn('Channel palette')).toBe('Chromatic');
    expect(checkedIn('Visualizer style')).toBe('Spectrum');
    expect((screen.getByLabelText(PEAK_QUANTIZATION.label) as HTMLInputElement).value).toBe('1');
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('writes slider values in the stored units', () => {
    const { updateSettings } = renderPanel();
    fireEvent.change(screen.getByLabelText('Peak decay'), { target: { value: '2' } });
    expect(updateSettings).toHaveBeenLastCalledWith({ peakDecayRate: 0.95 });
    fireEvent.change(screen.getByLabelText(PEAK_QUANTIZATION.label), { target: { value: '3' } });
    expect(updateSettings).toHaveBeenLastCalledWith({ peakQuantization: 8 });
  });

  it('resets the whole visualizer without touching the interface', () => {
    const { updateSettings } = renderPanel({ visualizerStyle: 'scopes' });
    fireEvent.click(screen.getByRole('button', { name: 'Reset visualizer' }));
    expect(updateSettings).toHaveBeenLastCalledWith(VISUALIZER_DEFAULTS);
    expect(VISUALIZER_DEFAULTS).not.toHaveProperty('uiPalette');
    expect(VISUALIZER_DEFAULTS).not.toHaveProperty('sliderSparksEnabled');
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
