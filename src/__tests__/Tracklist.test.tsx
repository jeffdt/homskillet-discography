import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { buildCatalog } from '../catalog/catalog';
import Tracklist from '../components/Tracklist';

const album = buildCatalog(
  {
    '/': [{ path: '/Bazaar', type: 'directory' }],
    '/Bazaar': [
      { path: '/Bazaar/groove.nsf', type: 'file' },
      { path: '/Bazaar/mt.nsf', type: 'file' },
    ],
  },
  { albums: { Bazaar: { tracks: [{ file: 'mt.nsf', blurb: 'Written on a train.' }] } } }
).albums[0];

function renderList(props: Partial<React.ComponentProps<typeof Tracklist>> = {}) {
  const onBack = vi.fn();
  const onPlayTrack = vi.fn();
  render(
    <Tracklist
      album={album}
      playingTrackId={null}
      paused={false}
      onBack={onBack}
      onPlayTrack={onPlayTrack}
      initialExpandedTrackId={null}
      {...props}
    />
  );
  return { onBack, onPlayTrack };
}

describe('Tracklist', () => {
  it('lists numbered tracks in album order with fallback titles', () => {
    renderList();
    const rows = screen.getAllByRole('listitem');
    expect(rows[0].textContent).toContain('1');
    expect(rows[0].textContent).toContain('Mt');
    expect(rows[1].textContent).toContain('Groove');
  });

  it('plays a track or the whole album, and goes back', () => {
    const { onBack, onPlayTrack } = renderList();
    fireEvent.click(screen.getByText('Groove'));
    fireEvent.click(screen.getByRole('button', { name: /play album/i }));
    fireEvent.click(screen.getByRole('button', { name: /albums/i }));
    expect(onPlayTrack.mock.calls).toEqual([[1], [0]]);
    expect(onBack).toHaveBeenCalled();
  });

  it('highlights the playing track', () => {
    renderList({ playingTrackId: 'Bazaar/groove.nsf' });
    expect(screen.getByText('Groove').closest('button')!.getAttribute('aria-current')).toBe('true');
  });

  it('marks the header as playing only while one of its tracks plays', () => {
    const { container } = render(
      <Tracklist
        album={album}
        playingTrackId="Bazaar/groove.nsf"
        paused={false}
        onBack={vi.fn()}
        onPlayTrack={vi.fn()}
        initialExpandedTrackId={null}
      />
    );
    expect(container.querySelector('.Tracklist-header')!.classList).toContain('is-playing');
  });

  it('leaves the header unlit for another album', () => {
    const { container } = render(
      <Tracklist
        album={album}
        playingTrackId="Covers/x.nsf"
        paused={false}
        onBack={vi.fn()}
        onPlayTrack={vi.fn()}
        initialExpandedTrackId={null}
      />
    );
    expect(container.querySelector('.Tracklist-header')!.classList).not.toContain('is-playing');
  });

  it('shows blurb toggles only for tracks with blurbs', () => {
    renderList();
    const toggles = screen.getAllByRole('button', { name: /^About /i });
    expect(toggles).toHaveLength(1);
    expect(screen.queryByText('Written on a train.')).toBeNull();
    fireEvent.click(toggles[0]);
    expect(screen.getByText('Written on a train.')).toBeTruthy();
    fireEvent.click(toggles[0]);
    expect(screen.queryByText('Written on a train.')).toBeNull();
  });

  it('can open with a blurb already expanded', () => {
    renderList({ initialExpandedTrackId: 'Bazaar/mt.nsf' });
    expect(screen.getByText('Written on a train.')).toBeTruthy();
  });
});
