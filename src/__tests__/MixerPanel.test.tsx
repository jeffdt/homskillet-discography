import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import MixerPanel, { MIXER_COPY } from '../components/MixerPanel';
import { EMPTY_CHANNELS_HINT } from '../components/mixer/ChannelStrips';
import { MIXER_SLIDERS } from '../components/mixer/mixerControls';
import { PlaybackControls, PlaybackState } from '../types/playback';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';
import { voiceInfo } from './helpers/voices';

const ALL_FALSE = [false, false, false, false, false, false, false, false];

const IDLE: PlaybackState = {
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

const PLAYING: PlaybackState = {
  ...IDLE,
  ejected: false,
  paused: false,
  songUrl: '/SuperFORE!/cave.nsf',
  durationMs: 180000,
  tempo: 1.25,
  numVoices: 2,
  paramValues: { subbass: 0.5, stereoWidth: 1 },
  playerKey: 'gme',
};

function makeControls() {
  return {
    setTempo: vi.fn(),
    setParam: vi.fn(),
    pinParam: vi.fn(),
    setVoiceMix: vi.fn(),
  } as unknown as PlaybackControls & Record<string, ReturnType<typeof vi.fn>>;
}

function renderPanel(playback = PLAYING, settings: Record<string, any> = {}) {
  const data = createTestAudioData();
  const controls = makeControls();
  render(
    withAudioData(
      data.value,
      <MixerPanel playback={playback} controls={controls} settings={settings as any} />
    )
  );
  return { data, controls };
}

describe('MixerPanel', () => {
  it('explains every section and control in visible text', () => {
    renderPanel();
    expect(screen.getByText(MIXER_COPY.channels)).toBeTruthy();
    expect(screen.getByText(MIXER_COPY.sound)).toBeTruthy();
    expect(screen.getByText(MIXER_COPY.reset)).toBeTruthy();
    MIXER_SLIDERS.forEach((def) => expect(screen.getByText(def.explanation)).toBeTruthy());
  });

  it('shows channel strips once a track is loaded', () => {
    const { data } = renderPanel();
    expect(screen.getByText(EMPTY_CHANNELS_HINT)).toBeTruthy();
    act(() => data.source.setVoices([voiceInfo(0, 'Square 1'), voiceInfo(2, 'Triangle')]));
    expect(screen.getByRole('button', { name: 'Mute Triangle' })).toBeTruthy();
  });

  it('sends mute and solo through the playback controls', () => {
    const { data, controls } = renderPanel();
    act(() => data.source.setVoices([voiceInfo(0, 'Square 1'), voiceInfo(2, 'Triangle')]));
    fireEvent.click(screen.getByRole('button', { name: 'Solo Square 1' }));
    expect(controls.setVoiceMix).toHaveBeenLastCalledWith({
      muted: ALL_FALSE,
      soloed: [true, false, false, false, false, false, false, false],
    });
  });

  it('drives speed, bass and stereo', () => {
    const { controls } = renderPanel();
    expect(screen.getByText('125%')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Speed'), { target: { value: '1.5' } });
    fireEvent.change(screen.getByLabelText('Bass boost'), { target: { value: '1.2' } });
    fireEvent.change(screen.getByLabelText('Stereo width'), { target: { value: '0.25' } });
    expect(controls.setTempo).toHaveBeenCalledWith(1.5);
    expect(controls.setParam).toHaveBeenCalledWith('subbass', 1.2);
    expect(controls.setParam).toHaveBeenCalledWith('stereoWidth', 0.25);
  });

  it('pins the shown value under the old settings keys', () => {
    const { controls } = renderPanel(PLAYING, { tempo: 1.25 });
    const speedPin = screen.getByRole('button', { name: 'Keep Speed for every song' });
    expect(speedPin.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Keep Bass boost for every song' }));
    expect(controls.pinParam).toHaveBeenCalledWith('gme.subbass', 0.5);
    fireEvent.click(speedPin);
    expect(controls.pinParam).toHaveBeenCalledWith('tempo', 1.25);
  });

  it('resets speed, bass, stereo, mutes and solos', () => {
    const { controls } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Reset mixer' }));
    expect(controls.setTempo).toHaveBeenCalledWith(1);
    expect(controls.setParam).toHaveBeenCalledWith('subbass', 0);
    expect(controls.setParam).toHaveBeenCalledWith('stereoWidth', 1);
    expect(controls.setVoiceMix).toHaveBeenCalledWith({ muted: ALL_FALSE, soloed: ALL_FALSE });
  });

  it('waits for a track before the sliders work', () => {
    const { controls } = renderPanel(IDLE);
    expect(screen.getByText(EMPTY_CHANNELS_HINT)).toBeTruthy();
    expect(screen.getByText(MIXER_COPY.noTrack)).toBeTruthy();
    MIXER_SLIDERS.forEach((def) =>
      expect((screen.getByLabelText(def.label) as HTMLInputElement).disabled).toBe(true)
    );
    expect(
      (screen.getByRole('button', { name: 'Reset mixer' }) as HTMLButtonElement).disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Keep Stereo width for every song' }));
    expect(controls.pinParam).toHaveBeenCalledWith('gme.stereoWidth', 1);
  });

  it('shows a pinned value before anything plays', () => {
    renderPanel(IDLE, { 'gme.subbass': 0.8 });
    expect(screen.getByText('80%')).toBeTruthy();
  });

  it('draws every frame without a React commit', () => {
    const data = createTestAudioData();
    data.source.setVoices([voiceInfo(0, 'Square 1'), voiceInfo(1, 'Square 2')]);
    data.frameLoop.setPlaying(true);
    const onRender = vi.fn();
    const { container } = render(
      <React.Profiler id="mixer" onRender={onRender}>
        {withAudioData(
          data.value,
          <MixerPanel playback={PLAYING} controls={makeControls()} settings={{} as any} />
        )}
      </React.Profiler>
    );
    const commits = onRender.mock.calls.length;
    const path = container.querySelector('svg.ChannelStrip-scope path')!;
    for (let frame = 1; frame <= 10; frame++) {
      data.source.frame.voices[0].waveform.fill(frame % 2 ? 0.5 : -0.5);
      data.source.frame.voices[0].rms = frame / 10;
      data.scheduler.tick(frame * 16);
    }
    expect(path.getAttribute('d')!.startsWith('M0 47L')).toBe(true);
    expect(onRender.mock.calls.length).toBe(commits);
  });
});
