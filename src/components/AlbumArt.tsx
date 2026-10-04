import React, { useMemo, useState } from 'react';
import { Album } from '../catalog/catalog';
import { CATALOG_PREFIX } from '../config';
import { albumPattern } from '../shell/albumPattern';
import { pathJoin } from '../util';

/** Real album art when metadata names a file, otherwise a generated pixel pattern in accent colors. */
export default function AlbumArt({
  album,
  size = 'small',
}: {
  album: Album;
  size?: 'small' | 'large';
}) {
  const cells = useMemo(() => albumPattern(album.id), [album.id]);
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
    <svg className={className} viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges">
      <rect className="AlbumArt-bg" width="8" height="8" />
      {cells.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              className={`AlbumArt-px${cell}`}
              x={x}
              y={y}
              width="1"
              height="1"
            />
          ) : null
        )
      )}
    </svg>
  );
}
