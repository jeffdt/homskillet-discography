import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { buildCatalog } from '../catalog/catalog';
import AlbumArt from '../components/AlbumArt';

const album = buildCatalog(
  {
    '/': [{ path: '/Bazaar', type: 'directory' }],
    '/Bazaar': [{ path: '/Bazaar/groove.nsf', type: 'file' }],
  },
  { albums: { Bazaar: { art: 'cover.png' } } }
).albums[0];

describe('AlbumArt', () => {
  it('shows the real image when metadata names art', () => {
    const { container } = render(<AlbumArt album={album} />);
    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('falls back to the generated pattern when the image fails to load', () => {
    const { container } = render(<AlbumArt album={album} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
