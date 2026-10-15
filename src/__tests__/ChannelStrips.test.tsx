import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ChannelStrips, { EMPTY_CHANNELS_HINT } from '../components/mixer/ChannelStrips';
import { CHIP_DESCRIPTIONS } from '../components/mixer/voiceMix';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';
import { voiceInfo } from './helpers/voices';

const TRACK = [
  voiceInfo(0, 'Square 1'),
  voiceInfo(1, 'Square 2', { soloed: true }),
  voiceInfo(2, 'Triangle', { audible: false }),
  voiceInfo(5, 'Saw Wave', { chip: 'VRC6', audible: false }),
];

function renderStrips(onVoiceMixChange = vi.fn()) {
  const data = createTestAudioData();
  data.frameLoop.setPlaying(true);
  const view = render(
    withAudioData(data.value, <ChannelStrips onVoiceMixChange={onVoiceMixChange} />)
  );
  return { data, view, onVoiceMixChange };
}

describe('ChannelStrips', () => {
  it('asks for a track while nothing is loaded', () => {
    renderStrips();
    expect(screen.getByText(EMPTY_CHANNELS_HINT)).toBeTruthy();
    expect(EMPTY_CHANNELS_HINT).toBe('Play a song to see its channels.');
  });

  it('shows one strip per voice, grouped and described by chip', () => {
    const { data, view } = renderStrips();
    act(() => data.source.setVoices(TRACK));
    expect(screen.queryByText(EMPTY_CHANNELS_HINT)).toBeNull();
    expect(view.container.querySelectorAll('li.ChannelStrip')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: '2A03' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'VRC6' })).toBeTruthy();
    expect(screen.getByText(CHIP_DESCRIPTIONS['2A03'])).toBeTruthy();
    expect(screen.getByText(CHIP_DESCRIPTIONS.VRC6)).toBeTruthy();
  });

  it('sends the whole mix with one mute or solo flipped', () => {
    const { data, onVoiceMixChange } = renderStrips();
    act(() => data.source.setVoices(TRACK));
    fireEvent.click(screen.getByRole('button', { name: 'Mute Triangle' }));
    expect(onVoiceMixChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        muted: [false, false, true, false, false, false, false, false],
        soloed: [false, true, false, false, false, false, false, false],
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Solo Saw Wave' }));
    expect(onVoiceMixChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        muted: [false, false, false, false, false, false, false, false],
        soloed: [false, true, false, false, false, true, false, false],
      })
    );
  });

  it('sends a level change for one channel, keeping the others', () => {
    const { data, onVoiceMixChange } = renderStrips();
    act(() => data.source.setVoices(TRACK.map((v) => (v.index === 0 ? { ...v, reverb: 0.4 } : v))));
    fireEvent.change(screen.getByLabelText('Triangle volume'), { target: { value: '1.5' } });
    const mix = onVoiceMixChange.mock.lastCall![0];
    expect(mix.volume.slice(0, 3)).toEqual([1, 1, 1.5]);
    expect(mix.reverb[0]).toBe(0.4);
    fireEvent.doubleClick(screen.getByLabelText('Square 1 reverb'));
    expect(onVoiceMixChange.mock.lastCall![0].reverb[0]).toBe(0);
  });

  it('swaps strips when the track changes and stops drawing removed ones', () => {
    const { data, view } = renderStrips();
    act(() => data.source.setVoices(TRACK));
    act(() => data.source.setVoices([voiceInfo(0, 'Square 1')]));
    expect(view.container.querySelectorAll('li.ChannelStrip')).toHaveLength(1);
    expect(screen.queryByText('Triangle')).toBeNull();
    act(() => data.source.setVoices([]));
    expect(screen.getByText(EMPTY_CHANNELS_HINT)).toBeTruthy();
    expect(data.frameLoop.isRunning()).toBe(false);
  });
});
