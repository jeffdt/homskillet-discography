import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MixerPanel from '../components/MixerPanel';
import VisualizerPaletteSettings from '../components/VisualizerPaletteSettings';
import { VISUALIZER_PALETTES } from '../config/visualizerPalettes';

const idle = {
  ready: true,
  ejected: true,
  paused: true,
  songUrl: null,
  durationMs: 1,
  tempo: 1,
  numVoices: 0,
  voiceMask: [],
  voiceNames: [],
  voiceGroups: [],
  paramDefs: [],
  paramValues: {},
  playerKey: null,
  volume: 100,
  shuffle: false,
  repeat: false,
};

describe('interim lab slots', () => {
  it('Mixer explains it needs a track before channels appear', () => {
    render(<MixerPanel playback={idle} controls={{} as any} settings={{}} />);
    expect(screen.getByText('Play something to see channels')).toBeTruthy();
  });

  it('palette picker selects by index', () => {
    const onSelect = vi.fn();
    render(<VisualizerPaletteSettings selected={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(VISUALIZER_PALETTES[3].label));
    expect(onSelect).toHaveBeenCalledWith(3);
    expect(
      screen.getByText(VISUALIZER_PALETTES[0].label).closest('button')!.getAttribute('aria-pressed')
    ).toBe('true');
  });
});
