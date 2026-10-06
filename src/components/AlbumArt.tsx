import React, { useMemo, useState } from 'react';
import { Album } from '../catalog/catalog';
import { CATALOG_PREFIX } from '../config';
import { ridgeLines } from '../shell/albumRidges';
import { pathJoin } from '../util';

/**
 * Real album art when metadata names a file, otherwise generated ridge lines. The lines
 * are gray at rest; the parent's hover, focus and playing styles relight them.
 */
export default function AlbumArt({
  album,
  size = 'small',
}: {
  album: Album;
  size?: 'small' | 'large';
}) {
  const lines = useMemo(
    () => ridgeLines(album.id, album.coverFamily),
    [album.id, album.coverFamily]
  );
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const className = `AlbumArt AlbumArt--${size}`;
  if (album.art && failedArt !== album.art) {
    const art = album.art;
    return (
      <img
        className={className}
        src={pathJoin(CATALOG_PREFIX, album.id, art)}
        alt=""
        onError={() => setFailedArt(art)}
      />
    );
  }
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <rect className="AlbumArt-bg" width="100" height="100" />
      {lines.map((line, i) => (
        <polyline
          key={i}
          className={`AlbumArt-line${line.hot ? ' is-hot' : ''}`}
          points={line.points}
        />
      ))}
    </svg>
  );
}
