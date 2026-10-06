import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { buildCatalog } from '../catalog/catalog';
import { PlaybackControls, PlaybackState } from '../types/playback';

import Dock from '../components/Dock';

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
    setVoiceMask: vi.fn(),
    setParam: vi.fn(),
    pinParam: vi.fn(),
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

  it('shows fullscreen only when supported', () => {
    renderDock({}, { showFullscreen: true });
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeTruthy();
  });
});
