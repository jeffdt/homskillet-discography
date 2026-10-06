import React, { useState } from 'react';
import { Album } from '../catalog/catalog';
import AlbumArt from './AlbumArt';
import LevelIndicator from './LevelIndicator';

interface TracklistProps {
  album: Album;
  playingTrackId: string | null;
  paused: boolean;
  onBack: () => void;
  onPlayTrack: (index: number) => void;
  /** Track whose blurb starts expanded (from clicking the title in the dock). */
  initialExpandedTrackId: string | null;
}

/** Second drawer level: album header and numbered tracks in album order. */
export default function Tracklist({
  album,
  playingTrackId,
  paused,
  onBack,
  onPlayTrack,
  initialExpandedTrackId,
}: TracklistProps) {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedTrackId);

  return (
    <div className="Tracklist">
      <button className="Tracklist-back" onClick={onBack}>
        ← Albums
      </button>
      <div
        className={`Tracklist-header${
          album.tracks.some((t) => t.id === playingTrackId) ? ' is-playing' : ''
        }`}
      >
        <AlbumArt album={album} size="large" />
        <div className="Tracklist-heading">
          <h3 className="Tracklist-albumTitle">{album.title}</h3>
          {album.description && <p className="Tracklist-description">{album.description}</p>}
          <button className="Tracklist-playAlbum" onClick={() => onPlayTrack(0)}>
            ▶ Play album
          </button>
        </div>
      </div>
      <ol className="Tracklist-tracks">
        {album.tracks.map((track, index) => {
          const playing = track.id === playingTrackId;
          const expanded = expandedId === track.id && Boolean(track.blurb);
          return (
            <li key={track.id} className="Tracklist-row">
              <button
                className="Tracklist-track"
                aria-current={playing ? 'true' : undefined}
                onClick={() => onPlayTrack(index)}
              >
                <span className="Tracklist-number">
                  {playing ? <LevelIndicator active={!paused} /> : track.number}
                </span>
                <span className="Tracklist-title">{track.title}</span>
              </button>
              {track.blurb && (
                <button
                  className="Tracklist-info"
                  aria-label={`About ${track.title}`}
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : track.id)}
                >
                  i
                </button>
              )}
              {expanded && <p className="Tracklist-blurb">{track.blurb}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
