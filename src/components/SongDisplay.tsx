import React from 'react';
import { formatSongDisplayName } from '../util';

interface SongDisplayProps {
  songUrl: string | null;
  ejected: boolean;
}

const SongDisplay: React.FC<SongDisplayProps> = ({ songUrl, ejected }) => {
  if (ejected || !songUrl) {
    return null;
  }

  const displayName = formatSongDisplayName(songUrl);

  return (
    <div className="SongDisplay">
      {displayName}
    </div>
  );
};

export default SongDisplay;
