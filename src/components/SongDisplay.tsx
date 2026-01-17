import React from 'react';
import { formatSongDisplayName } from '../util';

interface SongDisplayProps {
  songUrl: string | null;
  ejected: boolean;
  navigateToCurrentSong: () => void;
}

const SongDisplay: React.FC<SongDisplayProps> = ({ songUrl, ejected, navigateToCurrentSong }) => {
  if (ejected || !songUrl) {
    return null;
  }

  const displayName = formatSongDisplayName(songUrl);

  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigateToCurrentSong();
  };

  return (
    <div className="SongDisplay">
      <span
        className="song-title-link"
        onClick={handleTitleClick}
        title="Go to file in browser"
        style={{ cursor: 'pointer' }}
      >
        {displayName}
      </span>
    </div>
  );
};

export default SongDisplay;
