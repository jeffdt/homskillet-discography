import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { buildCatalog } from '../catalog/catalog';
import AlbumList from '../components/AlbumList';

const catalog = buildCatalog(
  {
    '/': [
      { path: '/Bazaar', type: 'directory' },
      { path: '/SuperFORE!', type: 'directory' },
    ],
    '/Bazaar': [
      { path: '/Bazaar/groove.nsf', type: 'file' },
      { path: '/Bazaar/mt.nsf', type: 'file' },
    ],
    '/SuperFORE!': [{ path: '/SuperFORE!/cave.nsf', type: 'file' }],
  },
  { albums: { 'SuperFORE!': { description: 'Golf soundtrack.' } } }
);

describe('AlbumList', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    delete (window as any).matchMedia;
  });

  it('lists albums with track counts and only real descriptions', () => {
    render(
      <AlbumList
        albums={catalog.albums}
        playingAlbumId={null}
        onSelect={() => {}}
        onShuffleAll={() => {}}
      />
    );
    expect(screen.getByText('2 tracks')).toBeTruthy();
    expect(screen.getByText('1 track')).toBeTruthy();
    expect(screen.getByText('Golf soundtrack.')).toBeTruthy();
    expect(document.querySelectorAll('.AlbumList-description')).toHaveLength(1);
  });

  it('flashes the clicked album twice, then opens it', () => {
    const onSelect = vi.fn();
    render(
      <AlbumList
        albums={catalog.albums}
        playingAlbumId={null}
        onSelect={onSelect}
        onShuffleAll={() => {}}
      />
    );
    const item = screen.getByText('Bazaar').closest('button')!;
    fireEvent.click(item);
    expect(item.className).toContain('is-flashing');
    expect(onSelect).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(319);
    });
    expect(onSelect).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('Bazaar');
    expect(item.className).not.toContain('is-flashing');
  });

  it('ignores a second click while a flash is running', () => {
    const onSelect = vi.fn();
    render(
      <AlbumList
        albums={catalog.albums}
        playingAlbumId={null}
        onSelect={onSelect}
        onShuffleAll={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Bazaar').closest('button')!);
    fireEvent.click(screen.getByText('1 track').closest('button')!);
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(onSelect.mock.calls).toEqual([['Bazaar']]);
  });

  it('opens immediately under reduced motion', () => {
    (window as any).matchMedia = vi.fn(() => ({
      matches: true,
      addListener() {},
      removeListener() {},
    }));
    const onSelect = vi.fn();
    render(
      <AlbumList
        albums={catalog.albums}
        playingAlbumId={null}
        onSelect={onSelect}
        onShuffleAll={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Bazaar').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('Bazaar');
  });

  it('marks the playing album and offers shuffle everything', () => {
    const onShuffleAll = vi.fn();
    render(
      <AlbumList
        albums={catalog.albums}
        playingAlbumId="Bazaar"
        onSelect={() => {}}
        onShuffleAll={onShuffleAll}
      />
    );
    expect(screen.getByText('Bazaar').closest('button')!.getAttribute('aria-current')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /shuffle everything/i }));
    expect(onShuffleAll).toHaveBeenCalled();
  });
});
