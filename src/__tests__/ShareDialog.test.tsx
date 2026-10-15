import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ShareDialog from '../components/ShareDialog';
import { ToastContext } from '../components/ToastProvider';
import { VISUALIZER_DEFAULTS } from '../config/stageSettings';
import { VoiceInfo } from '../audio/data/contract';
import { PlaybackState } from '../types/playback';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';
import { voiceInfo } from './helpers/voices';

const SITE = 'https://music.example/';

const playback: PlaybackState = {
  ready: true,
  ejected: false,
  paused: false,
  songUrl: '/music/Bazaar/groove.nsf',
  durationMs: 180000,
  tempo: 1,
  numVoices: 3,
  voiceMask: [true, true, true],
  voiceNames: ['Square 1', 'Square 2', 'Triangle'],
  voiceGroups: [],
  paramDefs: [],
  paramValues: { subbass: 0, stereoWidth: 1 },
  playerKey: 'gme',
  volume: 100,
  shuffle: false,
  repeat: false,
  stubMode: false,
};

const PLAIN = [voiceInfo(0, 'Square 1'), voiceInfo(1, 'Square 2'), voiceInfo(2, 'Triangle')];

function setup({
  voices = PLAIN,
  tempo = 1,
  settings = {},
  positionMs = 0,
}: {
  voices?: VoiceInfo[];
  tempo?: number;
  settings?: Record<string, unknown>;
  positionMs?: number;
} = {}) {
  const audio = createTestAudioData();
  audio.source.setVoices(voices);
  const enqueueToast = vi.fn();
  const onClose = vi.fn();
  render(
    withAudioData(
      audio.value,
      <ToastContext.Provider
        value={{ enqueueToast, clearCurrentToast: vi.fn(), currentToast: undefined, toastCount: 0 }}
      >
        <ShareDialog
          title="Groove"
          trackId="Bazaar/groove.nsf"
          positionMs={positionMs}
          playback={{ ...playback, tempo }}
          settings={{ ...VISUALIZER_DEFAULTS, ...settings }}
          onClose={onClose}
          siteUrl={SITE}
        />
      </ToastContext.Provider>
    )
  );
  const link = () => (screen.getByLabelText('Share link') as HTMLInputElement).value;
  return { enqueueToast, onClose, link };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ShareDialog', () => {
  it('offers a plain link with no options when nothing is changed', () => {
    const { link } = setup();
    expect(link()).toBe(`${SITE}?play=Bazaar/groove.nsf`);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('includes the mix and visualizer by default and summarizes the mix', () => {
    const { link } = setup({
      tempo: 0.5,
      voices: [voiceInfo(0, 'Square 1', { reverb: 0.4 }), ...PLAIN.slice(1)],
      settings: { scopeLayout: 'phase' },
    });
    expect(screen.getByText('Speed 50% · Square 1 Verb 40%')).toBeTruthy();
    expect(screen.getByText('1 visualizer setting changed from the defaults')).toBeTruthy();
    expect(link()).toMatch(
      /^https:\/\/music\.example\/\?play=Bazaar\/groove\.nsf&speed=0\.5&verb=40&viz=/
    );

    fireEvent.click(screen.getByLabelText('My mix'));
    expect(link()).not.toMatch(/speed|verb/);
    fireEvent.click(screen.getByLabelText('My visualizer'));
    expect(link()).toBe(`${SITE}?play=Bazaar/groove.nsf`);
  });

  it('adds the start position only when asked', () => {
    const { link } = setup({ positionMs: 83400 });
    expect(link()).not.toContain('t=');
    fireEvent.click(screen.getByLabelText('Start at 1:23'));
    expect(link()).toBe(`${SITE}?play=Bazaar/groove.nsf&t=83400`);
  });

  it('copies the link, says so and closes', async () => {
    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { enqueueToast, onClose, link } = setup();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(writeText).toHaveBeenCalledWith(link());
    expect(enqueueToast).toHaveBeenCalledWith('Link copied', expect.anything());
    expect(onClose).toHaveBeenCalled();
  });

  it('selects the link for a manual copy when the clipboard refuses', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
    });
    const { enqueueToast, onClose } = setup();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(enqueueToast).toHaveBeenCalledWith(
      'Copy the selected link with Ctrl+C or Cmd+C',
      expect.anything()
    );
  });

  it('closes on Escape', () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
