import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PlaybackControls, PlaybackState } from '../types/playback';

import AppShell from '../components/AppShell';
import { UserProvider } from '../components/UserProvider';

const { FIXTURE } = vi.hoisted(() => ({
  FIXTURE: {
    '/': [
      { path: '/Bazaar', type: 'directory' },
      { path: '/MetallicWing', type: 'directory' },
    ],
    '/Bazaar': [
      { path: '/Bazaar/groove.nsf', type: 'file' },
      { path: '/Bazaar/mt.nsf', type: 'file' },
    ],
    '/MetallicWing': [{ path: '/MetallicWing/hope.nsf', type: 'file' }],
  },
}));

vi.mock('../catalog/loadCatalog', async () => {
  const { buildCatalog } = await import('../catalog/catalog');
  return {
    loadCatalog: async () =>
      buildCatalog(FIXTURE as any, {
        albums: {
          Bazaar: {
            tracks: [{ file: 'groove.nsf' }, { file: 'mt.nsf', blurb: 'Dusty market theme' }],
          },
        },
      }),
  };
});
vi.mock('../components/Stage', () => ({ default: () => null }));
vi.mock('../components/TimeSlider', () => ({ default: () => null }));

/** Node's experimental localStorage shadows jsdom's and is undefined here, so install an in-memory one. */
function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  });
}
installMemoryLocalStorage();

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

/** Builds a PlaybackControls object whose every command is a spy. */
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

/** Renders AppShell inside UserProvider and returns a helper to push new playback state. */
function renderShell(playback: PlaybackState = IDLE, controls = makeControls()) {
  const utils = render(
    <UserProvider>
      <AppShell playback={playback} controls={controls} audioGraph={null} />
    </UserProvider>
  );
  const rerenderWith = (next: PlaybackState) =>
    utils.rerender(
      <UserProvider>
        <AppShell playback={next} controls={controls} audioGraph={null} />
      </UserProvider>
    );
  return { ...utils, controls, rerenderWith };
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
});

describe('AppShell', () => {
  it('Start listening shuffles the whole catalog', async () => {
    const { controls } = renderShell();
    await screen.findByText('or browse 2 albums');
    fireEvent.click(screen.getByRole('button', { name: /start listening/i }));
    expect(controls.setShuffle).toHaveBeenCalledWith(true);
    const [hrefs, index] = (controls.playTracks as any).mock.calls[0];
    expect(hrefs).toEqual([
      '/music/Bazaar/groove.nsf',
      '/music/Bazaar/mt.nsf',
      '/music/MetallicWing/hope.nsf',
    ]);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(3);
    expect(controls.resumeAudio).toHaveBeenCalled();
  });

  it('plays exactly once when Start is pressed before the engine is ready', async () => {
    const { controls, rerenderWith } = renderShell({ ...IDLE, ready: false });
    await screen.findByText('or browse 2 albums');
    const start = screen.getByRole('button', { name: /start listening/i });
    fireEvent.click(start);
    fireEvent.click(start);
    expect(controls.playTracks).not.toHaveBeenCalled();
    rerenderWith({ ...IDLE, ready: true });
    await waitFor(() => expect(controls.playTracks).toHaveBeenCalledTimes(1));
    expect(controls.setShuffle).toHaveBeenCalledTimes(1);
  });

  it('plays a shared link within its album, then seeks once it loads', async () => {
    window.history.replaceState(null, '', '/?play=Bazaar%2Fmt.nsf&t=5000');
    const { controls, rerenderWith } = renderShell();
    fireEvent.click(await screen.findByRole('button', { name: '▶ Play Mt' }));
    expect(controls.setShuffle).not.toHaveBeenCalled();
    expect(controls.playTracks).toHaveBeenCalledWith(
      ['/music/Bazaar/groove.nsf', '/music/Bazaar/mt.nsf'],
      1
    );

    rerenderWith({ ...IDLE, ejected: false, paused: false, songUrl: '/music/Bazaar/mt.nsf' });
    expect(controls.seekToMs).toHaveBeenCalledWith(5000);
  });

  it('falls back to the normal title screen for an unknown shared track and cleans the URL', async () => {
    window.history.replaceState(null, '', '/?play=Gone%2Fold.nsf&debug=true');
    const { controls } = renderShell();
    await screen.findByRole('button', { name: /start listening/i });
    await waitFor(() => expect(window.location.search).toBe('?debug=true'));
    expect(controls.playTracks).not.toHaveBeenCalled();
  });

  it('treats a refresh as a reset: no resume offer and a clean URL', async () => {
    window.history.replaceState(null, '', '/?play=Bazaar%2Fmt.nsf&t=5000&debug=true');
    const entries = vi
      .spyOn(performance, 'getEntriesByType')
      .mockReturnValue([{ type: 'reload' }] as unknown as PerformanceEntryList);
    try {
      renderShell();
      await screen.findByRole('button', { name: /start listening/i });
      await waitFor(() => expect(window.location.search).toBe('?debug=true'));
    } finally {
      entries.mockRestore();
    }
  });

  it('ignores a garbage t= on a known shared track', async () => {
    window.history.replaceState(null, '', '/?play=Bazaar%2Fmt.nsf&t=abc');
    const { controls, rerenderWith } = renderShell();
    fireEvent.click(await screen.findByRole('button', { name: '▶ Play Mt' }));
    rerenderWith({ ...IDLE, ejected: false, paused: false, songUrl: '/music/Bazaar/mt.nsf' });
    expect(controls.seekToMs).not.toHaveBeenCalled();
  });

  it('opens the Albums drawer at an album named by an old browse path', async () => {
    window.history.replaceState(null, '', '/MetallicWing');
    renderShell();
    expect(await screen.findByRole('dialog', { name: 'Albums' })).toBeTruthy();
    expect(screen.getByText('Hope')).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });

  it('keeps the address bar shareable and spotlights the new track', async () => {
    const { rerenderWith } = renderShell();
    await screen.findByText('or browse 2 albums');
    rerenderWith({ ...IDLE, ejected: false, paused: false, songUrl: '/music/Bazaar/groove.nsf' });
    expect(window.location.search).toBe('?play=Bazaar%2Fgroove.nsf');
    expect(document.querySelector('.Spotlight.is-visible')!.textContent).toContain('Groove');
    expect(screen.queryByRole('button', { name: /start listening/i })).toBeNull();
    expect(screen.getByRole('region', { name: 'Player' })).toBeTruthy();
  });

  it('toggles panels from the keyboard and closes the topmost with Escape', async () => {
    renderShell();
    await screen.findByText('or browse 2 albums');
    fireEvent.keyDown(document.body, { key: 'a' });
    fireEvent.keyDown(document.body, { key: 'm' });
    expect(screen.getByRole('dialog', { name: 'Albums' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Mixer' })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Mixer' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Albums' })).toBeTruthy();
  });

  it('closes every open panel on a press outside the panels and chrome, but not inside them', async () => {
    const { container } = renderShell();
    fireEvent.click(await screen.findByText('or browse 2 albums'));
    fireEvent.click(screen.getByRole('button', { name: 'Mixer' }));
    const albums = screen.getByRole('dialog', { name: 'Albums' });

    fireEvent.pointerDown(albums);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'About' }));
    expect(screen.getByRole('dialog', { name: 'Albums' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Mixer' })).toBeTruthy();

    fireEvent.pointerDown(container.querySelector('.AppShell') as Element);
    expect(screen.queryByRole('dialog', { name: 'Albums' })).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Mixer' })).toBeNull();
  });

  it('opens Albums at the playing album and plays tracks from it', async () => {
    const { controls } = renderShell({
      ...IDLE,
      ejected: false,
      paused: false,
      songUrl: '/music/Bazaar/mt.nsf',
    });
    await screen.findByText('Mt', { selector: '.Dock-title' });
    fireEvent.click(screen.getByRole('button', { name: 'Albums' }));
    fireEvent.click(screen.getByText('Groove'));
    expect(controls.playTracks).toHaveBeenCalledWith(
      ['/music/Bazaar/groove.nsf', '/music/Bazaar/mt.nsf'],
      0
    );
  });

  it('expands the playing track blurb when the dock title is clicked with its album already open', async () => {
    renderShell({ ...IDLE, ejected: false, paused: false, songUrl: '/music/Bazaar/mt.nsf' });
    await screen.findByText('Mt', { selector: '.Dock-title' });
    fireEvent.click(screen.getByRole('button', { name: 'Albums' }));
    expect(screen.queryByText('Dusty market theme', { selector: '.Tracklist-blurb' })).toBeNull();
    fireEvent.click(screen.getByText('Mt', { selector: '.Dock-title' }));
    expect(screen.getByText('Dusty market theme', { selector: '.Tracklist-blurb' })).toBeTruthy();
  });

  it('keeps a queued shared-link start on the shared track when the catalog arrives late', async () => {
    window.history.replaceState(null, '', '/?play=Bazaar%2Fmt.nsf');
    const { controls } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: /start listening/i }));
    await waitFor(() => expect(controls.playTracks).toHaveBeenCalledTimes(1));
    expect(controls.playTracks).toHaveBeenCalledWith(
      ['/music/Bazaar/groove.nsf', '/music/Bazaar/mt.nsf'],
      1
    );
    expect(controls.setShuffle).not.toHaveBeenCalled();
  });

  it('drops a pending seek when the shared track never loads', async () => {
    window.history.replaceState(null, '', '/?play=Bazaar%2Fmt.nsf&t=5000');
    const { controls, rerenderWith } = renderShell();
    fireEvent.click(await screen.findByRole('button', { name: '▶ Play Mt' }));
    rerenderWith({ ...IDLE, ejected: false, paused: false, songUrl: '/music/Bazaar/groove.nsf' });
    rerenderWith({ ...IDLE, ejected: false, paused: false, songUrl: '/music/Bazaar/mt.nsf' });
    expect(controls.seekToMs).not.toHaveBeenCalled();
  });

  it('keeps the dock instead of returning to the title screen when the sequencer ejects mid-session', async () => {
    const { rerenderWith } = renderShell();
    await screen.findByText('or browse 2 albums');
    rerenderWith({ ...IDLE, ejected: false, paused: false, songUrl: '/music/Bazaar/groove.nsf' });
    rerenderWith({ ...IDLE, ejected: true, paused: true, songUrl: null });
    expect(screen.queryByRole('button', { name: /start listening/i })).toBeNull();
    expect(screen.getByRole('region', { name: 'Player' })).toBeTruthy();
  });

  it('resumes audio synchronously in the press even before the engine is ready', async () => {
    const { controls } = renderShell({ ...IDLE, ready: false });
    await screen.findByText('or browse 2 albums');
    fireEvent.click(screen.getByRole('button', { name: /start listening/i }));
    expect(controls.resumeAudio).toHaveBeenCalledTimes(1);
    expect(controls.playTracks).not.toHaveBeenCalled();
  });

  describe('responsive panels', () => {
    /** Installs a matchMedia whose compact query result can be flipped, notifying listeners. */
    function mockMatchMedia() {
      let compact = false;
      const listeners = new Set<() => void>();
      window.matchMedia = ((query: string) => ({
        get matches() {
          return query.includes('max-width') ? compact : false;
        },
        media: query,
        addListener: (fn: () => void) => listeners.add(fn),
        removeListener: (fn: () => void) => listeners.delete(fn),
      })) as any;
      return (next: boolean) => {
        compact = next;
        act(() => listeners.forEach((fn) => fn()));
      };
    }

    afterEach(() => {
      delete (window as any).matchMedia;
    });

    it('shows only the topmost panel after rotating to compact, and both again when back to wide', async () => {
      const setCompact = mockMatchMedia();
      renderShell();
      await screen.findByText('or browse 2 albums');
      fireEvent.keyDown(document.body, { key: 'a' });
      fireEvent.keyDown(document.body, { key: 'v' });
      expect(screen.getByRole('dialog', { name: 'Albums' })).toBeTruthy();
      expect(screen.getByRole('dialog', { name: 'Visuals' })).toBeTruthy();

      setCompact(true);
      expect(screen.queryByRole('dialog', { name: 'Albums' })).toBeNull();
      expect(screen.getByRole('dialog', { name: 'Visuals' })).toBeTruthy();

      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'Visuals' })).toBeNull();
      expect(screen.getByRole('dialog', { name: 'Albums' })).toBeTruthy();
    });

    it('restores both panels when flipping back to wide', async () => {
      const setCompact = mockMatchMedia();
      renderShell();
      await screen.findByText('or browse 2 albums');
      fireEvent.keyDown(document.body, { key: 'a' });
      fireEvent.keyDown(document.body, { key: 'v' });
      setCompact(true);
      setCompact(false);
      expect(screen.getByRole('dialog', { name: 'Albums' })).toBeTruthy();
      expect(screen.getByRole('dialog', { name: 'Visuals' })).toBeTruthy();
    });

    it('marks only the visible panel in the top bar and raises a hidden one instead of closing it', async () => {
      const setCompact = mockMatchMedia();
      renderShell();
      await screen.findByText('or browse 2 albums');
      fireEvent.keyDown(document.body, { key: 'm' });
      fireEvent.keyDown(document.body, { key: 'a' });
      setCompact(true);
      const albumsButton = screen.getByRole('button', { name: 'Albums' });
      const mixerButton = screen.getByRole('button', { name: 'Mixer' });
      expect(albumsButton.getAttribute('aria-pressed')).toBe('true');
      expect(mixerButton.getAttribute('aria-pressed')).toBe('false');
      fireEvent.click(mixerButton);
      expect(screen.getByRole('dialog', { name: 'Mixer' })).toBeTruthy();
      expect(mixerButton.getAttribute('aria-pressed')).toBe('true');
    });
  });
});
