import React, { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { buildCatalog } from '../catalog/catalog';
import Dock from '../components/Dock';
import LevelIndicator from '../components/LevelIndicator';
import { PlaybackControls, PlaybackState } from '../types/playback';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

const catalog = buildCatalog(
  {
    '/': [{ path: '/Bazaar', type: 'directory' }],
    '/Bazaar': [{ path: '/Bazaar/groove.nsf', type: 'file' }],
  },
  {}
);
const album = catalog.albums[0];
const track = album.tracks[0];

const playing: PlaybackState = {
  ready: true,
  ejected: false,
  paused: false,
  songUrl: track.href,
  durationMs: 180000,
  tempo: 1,
  numVoices: 0,
  voiceMask: [],
  voiceNames: [],
  voiceGroups: [],
  paramDefs: [],
  paramValues: {},
  playerKey: 'gme',
  volume: 100,
  shuffle: false,
  repeat: false,
};

describe('steady-state playback', () => {
  it('runs two seconds of frames without a React commit', () => {
    const data = createTestAudioData();
    data.source.frame.mixSpectrum.fill(0.3);
    data.frameLoop.setPlaying(true);
    let positionMs = 0;
    const controls = {
      getPositionMs: () => (positionMs += 100),
      togglePause: vi.fn(),
      prevTrack: vi.fn(),
      nextTrack: vi.fn(),
      seekToFraction: vi.fn(),
      setShuffle: vi.fn(),
      setRepeat: vi.fn(),
      setVolume: vi.fn(),
    } as unknown as PlaybackControls;
    const onRender = vi.fn();
    render(
      withAudioData(
        data.value,
        <Profiler id="playback" onRender={onRender}>
          <Dock
            playback={playing}
            controls={controls}
            track={track}
            album={album}
            settings={{ sliderSparksEnabled: true, particleSpawnRate: 10 }}
            onShowInAlbums={() => {}}
            showFullscreen={false}
          />
          <LevelIndicator active />
        </Profiler>
      )
    );
    const commitsAfterMount = onRender.mock.calls.length;
    const elapsedBefore = screen.getByText('0:00');
    const knob = document.body.querySelector('.Slider-knob') as HTMLElement;
    const knobBefore = knob.style.left;
    act(() => {
      for (let i = 0; i < 120; i++) data.scheduler.tick((i * 1000) / 60);
    });
    expect(onRender.mock.calls.length).toBe(commitsAfterMount);
    expect(elapsedBefore.textContent).not.toBe('0:00');
    expect(knob.style.left).not.toBe(knobBefore);
    const glow = screen.getByRole('button', { name: 'Pause' }).style;
    expect(Number(glow.getPropertyValue('--pulse-intensity'))).toBeGreaterThan(0.5);
    expect(document.body.querySelectorAll('.SliderParticle').length).toBeGreaterThan(0);
  });
});
