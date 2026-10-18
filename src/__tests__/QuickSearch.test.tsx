import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { buildCatalog } from '../catalog/catalog';
import QuickSearch from '../components/QuickSearch';

const catalog = buildCatalog(
  {
    '/': [
      { path: '/Bazaar', type: 'directory' },
      { path: '/MetallicWing', type: 'directory' },
    ],
    '/Bazaar': [
      { path: '/Bazaar/groove.nsf', type: 'file' },
      { path: '/Bazaar/hopeless.nsf', type: 'file' },
    ],
    '/MetallicWing': [
      { path: '/MetallicWing/intro.nsf', type: 'file' },
      { path: '/MetallicWing/hope.nsf', type: 'file' },
    ],
  },
  {}
);

/** Renders the search box with spies, starting from the given query. */
function setup(initialQuery = '', playingTrackId: string | null = null) {
  const onPlayTrack = vi.fn();
  const onClose = vi.fn();
  const onQueryChange = vi.fn();
  render(
    <QuickSearch
      catalog={catalog}
      playingTrackId={playingTrackId}
      initialQuery={initialQuery}
      onQueryChange={onQueryChange}
      onPlayTrack={onPlayTrack}
      onClose={onClose}
    />
  );
  const input = screen.getByRole('combobox') as HTMLInputElement;
  return { input, onPlayTrack, onClose, onQueryChange };
}

/** The album and in-album index onPlayTrack should receive for a track id. */
function playArgs(trackId: string) {
  const album = catalog.albumById.get(trackId.split('/')[0])!;
  return [album, album.tracks.findIndex((t) => t.id === trackId)];
}

/** Titles of the listed results, top first. */
const titles = () =>
  screen.getAllByRole('option').map((o) => o.querySelector('.QuickSearch-title')!.textContent);

describe('QuickSearch', () => {
  it('focuses the input and shows a hint before typing', () => {
    const { input } = setup();
    expect(document.activeElement).toBe(input);
    expect(screen.getByText(/then enter/i)).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('plays the top match within its album on Enter, then closes', () => {
    const { input, onPlayTrack, onClose, onQueryChange } = setup();
    fireEvent.change(input, { target: { value: 'hope' } });
    expect(onQueryChange).toHaveBeenCalledWith('hope');
    expect(titles()).toEqual(['Hope', 'Hopeless']);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPlayTrack).toHaveBeenCalledWith(...playArgs('MetallicWing/hope.nsf'));
    expect(onClose).toHaveBeenCalled();
  });

  it('moves the pick with the arrow keys, wrapping around', () => {
    const { input, onPlayTrack } = setup('hope');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe('QuickSearch-option-1');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPlayTrack).toHaveBeenCalledWith(...playArgs('Bazaar/hopeless.nsf'));
  });

  it('plays a clicked result', () => {
    const { onPlayTrack } = setup('hope');
    fireEvent.click(screen.getByText('Hopeless'));
    expect(onPlayTrack).toHaveBeenCalledWith(...playArgs('Bazaar/hopeless.nsf'));
  });

  it('says so when nothing matches, and Enter does nothing', () => {
    const { input, onPlayTrack, onClose } = setup('zzz');
    expect(screen.getByText('No matches')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPlayTrack).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('marks the playing track', () => {
    setup('hope', 'Bazaar/hopeless.nsf');
    const [hope, hopeless] = screen.getAllByRole('option');
    expect(hope.getAttribute('aria-current')).toBeNull();
    expect(hopeless.getAttribute('aria-current')).toBe('true');
  });

  it('closes on Escape and on a backdrop click', () => {
    const { input, onClose } = setup();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(document.querySelector('.QuickSearch-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
