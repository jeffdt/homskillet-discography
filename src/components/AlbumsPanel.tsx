import React from 'react';
import { Album, Catalog } from '../catalog/catalog';
import AlbumList from './AlbumList';
import Tracklist from './Tracklist';

interface AlbumsPanelProps {
  catalog: Catalog;
  /** Album shown at the tracklist level, or null for the album list. */
  albumId: string | null;
  onSelectAlbum: (albumId: string | null) => void;
  playingTrackId: string | null;
  paused: boolean;
  onPlayTrack: (album: Album, index: number) => void;
  onShuffleAll: () => void;
  focusTrackId: string | null;
}

/** The Albums drawer: album list, then tracklist, with an unfold or slide transition between them. */
export default function AlbumsPanel({
  catalog,
  albumId,
  onSelectAlbum,
  playingTrackId,
  paused,
  onPlayTrack,
  onShuffleAll,
  focusTrackId,
}: AlbumsPanelProps) {
  const album = albumId ? catalog.albumById.get(albumId) || null : null;
  const playingTrack = playingTrackId ? catalog.trackById.get(playingTrackId) : undefined;

  return (
    <div className="Albums">
      {album ? (
        <div key={album.id} className="Albums-level Albums-level--forward">
          <Tracklist
            album={album}
            playingTrackId={playingTrackId}
            paused={paused}
            onBack={() => onSelectAlbum(null)}
            onPlayTrack={(index) => onPlayTrack(album, index)}
            initialExpandedTrackId={focusTrackId}
          />
        </div>
      ) : (
        <div key="list" className="Albums-level Albums-level--back">
          <AlbumList
            albums={catalog.albums}
            playingAlbumId={playingTrack ? playingTrack.albumId : null}
            onSelect={onSelectAlbum}
            onShuffleAll={onShuffleAll}
          />
        </div>
      )}
    </div>
  );
}
