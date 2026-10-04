import React, { useEffect, useRef, useState } from 'react';
import { Album } from '../catalog/catalog';
import { prefersReducedMotion } from '../shell/motion';
import AlbumArt from './AlbumArt';

export const ALBUM_FLASH_MS = 320;

interface AlbumListProps {
  albums: Album[];
  playingAlbumId: string | null;
  onSelect: (albumId: string) => void;
  onShuffleAll: () => void;
}

/** First drawer level: every album with art, title, description and track count. */
export default function AlbumList({
  albums,
  playingAlbumId,
  onSelect,
  onShuffleAll,
}: AlbumListProps) {
  const [flashingId, setFlashingId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  /** Flashes the album, then opens it; a pending flash blocks further clicks. */
  const select = (albumId: string) => {
    if (timerRef.current) return;
    if (prefersReducedMotion()) {
      onSelect(albumId);
      return;
    }
    setFlashingId(albumId);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setFlashingId(null);
      onSelect(albumId);
    }, ALBUM_FLASH_MS);
  };

  return (
    <div className="AlbumList">
      <button className="AlbumList-shuffle" onClick={onShuffleAll}>
        Shuffle everything
      </button>
      <ul className="AlbumList-items">
        {albums.map((album) => {
          const count = album.tracks.length;
          return (
            <li key={album.id}>
              <button
                className={`AlbumList-item${flashingId === album.id ? ' is-flashing' : ''}`}
                aria-current={playingAlbumId === album.id ? 'true' : undefined}
                onClick={() => select(album.id)}
              >
                <AlbumArt album={album} />
                <span className="AlbumList-text">
                  <span className="AlbumList-title">{album.title}</span>
                  {album.description && (
                    <span className="AlbumList-description">{album.description}</span>
                  )}
                  <span className="AlbumList-count">{`${count} track${count === 1 ? '' : 's'}`}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
