import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { VoiceInfo } from '../audio/data/contract';
import ChannelPaletteSettings from '../components/ChannelPaletteSettings';
import { CHANNEL_PALETTES } from '../config/channelPalettes';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

function voice(index: number, name: string, state: Partial<VoiceInfo> = {}): VoiceInfo {
  return { index, name, chip: '2A03', muted: false, soloed: false, audible: true, ...state };
}

describe('channel palette picker', () => {
  it('selects palettes by id and marks the selected one', () => {
    const onSelect = vi.fn();
    render(<ChannelPaletteSettings selectedId="chromatic" onSelect={onSelect} />);
    fireEvent.click(screen.getByText(CHANNEL_PALETTES[2].label));
    expect(onSelect).toHaveBeenCalledWith(CHANNEL_PALETTES[2].id);
    expect(screen.getByText('Chromatic').closest('button')!.getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByText(CHANNEL_PALETTES[0].description)).toBeTruthy();
  });

  it('marks Chromatic for an unknown id', () => {
    render(<ChannelPaletteSettings selectedId="retired-palette" onSelect={() => {}} />);
    expect(screen.getByText('Chromatic').closest('button')!.getAttribute('aria-pressed')).toBe(
      'true'
    );
  });

  it('asks for a track before it can show which color is which channel', () => {
    render(<ChannelPaletteSettings selectedId="chromatic" onSelect={() => {}} />);
    expect(screen.getByText('Play something to see which color is which channel.')).toBeTruthy();
  });

  it("lists the track's channels with their color and dims the ones you cannot hear", () => {
    const data = createTestAudioData();
    render(
      withAudioData(
        data.value,
        <ChannelPaletteSettings selectedId="chromatic" onSelect={() => {}} />
      )
    );
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
