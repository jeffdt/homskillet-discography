import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { buildCatalog } from '../catalog/catalog';
import { PlaybackControls, PlaybackState } from '../types/playback';

import Dock from '../components/Dock';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

vi.mock('../components/TimeSlider', () => ({
  default: ({ particleEnabled }: { particleEnabled?: boolean }) => (
    <div data-testid="time-slider" data-sparks={String(particleEnabled)} />
  ),
}));

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
  shuffle: true,
  repeat: false,
  stubMode: false,
};

function makeControls(): PlaybackControls {
  return {
    playTracks: vi.fn(),
    togglePause: vi.fn(),
    prevTrack: vi.fn(),
    nextTrack: vi.fn(),
    seekToFraction: vi.fn(),
    seekToMs: vi.fn(),
    seekRelative: vi.fn(),
    getPositionMs: vi.fn(() => 0),
    setTempo: vi.fn(),
    setSpeedRelative: vi.fn(),
    setVoiceMix: vi.fn(),
    setParam: vi.fn(),
    setVolume: vi.fn(),
    setShuffle: vi.fn(),
    setRepeat: vi.fn(),
    resumeAudio: vi.fn(),
  };
}

function renderDock(
  overrides: Partial<PlaybackState> = {},
  props: Partial<React.ComponentProps<typeof Dock>> = {}
) {
  const controls = makeControls();
  const onShowInAlbums = vi.fn();
  render(
    <Dock
      playback={{ ...playing, ...overrides }}
      controls={controls}
      track={track}
      album={album}
      settings={{}}
      onShowInAlbums={onShowInAlbums}
      showFullscreen={false}
      {...props}
    />
  );
  return { controls, onShowInAlbums };
}

describe('Dock', () => {
  it('stops spawning sparks while the dock is faded out', () => {
    renderDock({}, { settings: { sliderSparksEnabled: true }, faded: true });
    expect(screen.getByTestId('time-slider').getAttribute('data-sparks')).toBe('false');
  });

  it('spawns sparks when enabled and visible', () => {
    renderDock({}, { settings: { sliderSparksEnabled: true } });
    expect(screen.getByTestId('time-slider').getAttribute('data-sparks')).toBe('true');
  });

  it('shows the title and album and opens the album on click', () => {
    const { onShowInAlbums } = renderDock();
    expect(screen.getByText('Groove')).toBeTruthy();
    expect(screen.getByText('Bazaar')).toBeTruthy();
    fireEvent.click(screen.getByText('Groove'));
    expect(onShowInAlbums).toHaveBeenCalledWith('Bazaar');
  });

  it('wires transport buttons', () => {
    const { controls } = renderDock();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(controls.togglePause).toHaveBeenCalled();
    expect(controls.nextTrack).toHaveBeenCalled();
    expect(controls.prevTrack).toHaveBeenCalled();
  });

  it('shows shuffle and repeat state and flips it', () => {
    const { controls } = renderDock();
    const shuffle = screen.getByRole('button', { name: 'Shuffle' });
    const repeat = screen.getByRole('button', { name: 'Repeat track' });
    expect(shuffle.getAttribute('aria-pressed')).toBe('true');
    expect(shuffle.className).toContain('is-on');
    expect(repeat.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(shuffle);
    fireEvent.click(repeat);
    expect(controls.setShuffle).toHaveBeenCalledWith(false);
    expect(controls.setRepeat).toHaveBeenCalledWith(true);
  });

  it('disables transport when nothing is loaded', () => {
    renderDock({ ejected: true, songUrl: null }, { track: null, album: null });
    expect(screen.getByText('Nothing playing')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Next track' }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('falls back to a filename title for tracks outside the catalog', () => {
    renderDock({ songUrl: '/music/Other/sun_dried_tanuki.nsf' }, { track: null, album: null });
    expect(screen.getByText('Sun Dried Tanuki')).toBeTruthy();
  });

  it('changes the speed, shows it as a percent and resets it on double-click', () => {
    const { controls } = renderDock({ tempo: 1.25 });
    const speed = screen.getByRole('slider', { name: 'Speed' }) as HTMLInputElement;
    expect(speed.value).toBe('1.25');
    expect(screen.getByText('125%')).toBeTruthy();
    fireEvent.change(speed, { target: { value: '0.5' } });
    expect(controls.setTempo).toHaveBeenLastCalledWith(0.5);
    fireEvent.doubleClick(speed);
    expect(controls.setTempo).toHaveBeenLastCalledWith(1);
  });

  it('shows the saved speed before any song is loaded', () => {
    renderDock({ playerKey: null }, { settings: { tempo: 0.75 } as any });
    expect((screen.getByRole('slider', { name: 'Speed' }) as HTMLInputElement).value).toBe('0.75');
  });

  it('changes the volume and resets it on double-click', () => {
    const { controls } = renderDock({ volume: 80 });
    const volume = screen.getByRole('slider', { name: 'Volume' });
    expect(screen.getByText('80%')).toBeTruthy();
    fireEvent.change(volume, { target: { value: '120' } });
    expect(controls.setVolume).toHaveBeenLastCalledWith(120);
    fireEvent.doubleClick(volume);
    expect(controls.setVolume).toHaveBeenLastCalledWith(100);
  });

  it('shows fullscreen only when supported', () => {
    renderDock({}, { showFullscreen: true });
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeTruthy();
  });

  it('glows with the audio pulse while playing and resets when paused', () => {
    const data = createTestAudioData();
    data.source.frame.mixSpectrum.fill(0.4);
    data.frameLoop.setPlaying(true);
    const dock = (paused: boolean) =>
      withAudioData(
        data.value,
        <Dock
          playback={{ ...playing, paused }}
          controls={makeControls()}
          track={track}
          album={album}
          settings={{}}
          onShowInAlbums={() => {}}
          showFullscreen={false}
        />
      );
    const { rerender } = render(dock(false));
    act(() => {
      for (let i = 0; i < 30; i++) data.scheduler.tick((i * 1000) / 60);
    });
    const pause = screen.getByRole('button', { name: 'Pause' });
    expect(Number(pause.style.getPropertyValue('--pulse-intensity'))).toBeGreaterThan(0.9);
    const region = screen.getByRole('region', { name: 'Player' });
    expect(Number(region.style.getPropertyValue('--pulse-intensity'))).toBeGreaterThan(0.9);
    rerender(dock(true));
    expect(region.style.getPropertyValue('--pulse-intensity')).toBe('0');
    expect(
      screen.getByRole('button', { name: 'Play' }).style.getPropertyValue('--pulse-intensity')
    ).toBe('0');
  });
});

describe('download button', () => {
  function dockFor(overrides: Partial<PlaybackState>, audio = createTestAudioData()) {
    return withAudioData(
      audio.value,
      <Dock
        playback={{ ...playing, ...overrides }}
        controls={makeControls()}
        track={overrides.songUrl === null ? null : track}
        album={overrides.songUrl === null ? null : album}
        settings={{}}
        onShowInAlbums={vi.fn()}
        showFullscreen={false}
      />
    );
  }
  function renderWithAudio(overrides: Partial<PlaybackState> = {}) {
    const audio = createTestAudioData();
    const utils = render(dockFor(overrides, audio));
    return {
      ...utils,
      rerenderWith: (next: Partial<PlaybackState>) => utils.rerender(dockFor(next, audio)),
    };
  }
  const downloadButton = () =>
    screen.getByRole('button', { name: 'Download track' }) as HTMLButtonElement;

  it('opens the download dialog for the current track', () => {
    renderWithAudio();
    fireEvent.click(downloadButton());
    expect(screen.getByRole('dialog', { name: 'Download Groove' })).toBeTruthy();
  });

  it('closes the dialog from its Close button', () => {
    renderWithAudio();
    fireEvent.click(downloadButton());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns focus to the download button on close', () => {
    renderWithAudio();
    fireEvent.click(downloadButton());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(document.activeElement).toBe(downloadButton());
  });

  it('keeps the dialog on the opened track when playback ejects', () => {
    const { rerenderWith } = renderWithAudio();
    fireEvent.click(downloadButton());
    rerenderWith({ ejected: true, songUrl: null });
    expect(screen.getByRole('dialog', { name: 'Download Groove' })).toBeTruthy();
  });

  it('does not reopen the dialog by itself after it was closed', () => {
    const { rerenderWith } = renderWithAudio();
    fireEvent.click(downloadButton());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    rerenderWith({ ejected: true, songUrl: null });
    rerenderWith({});
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is disabled in stub mode', () => {
    renderWithAudio({ stubMode: true });
    expect(downloadButton().disabled).toBe(true);
  });

  it('is disabled when nothing is loaded', () => {
    renderWithAudio({ ejected: true, songUrl: null });
    expect(downloadButton().disabled).toBe(true);
  });
});
