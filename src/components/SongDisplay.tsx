import React from 'react';
import { formatSongDisplayName } from '../util';

interface SongDisplayProps {
  songUrl: string | null;
  ejected: boolean;
  getCurrentSongLink: (withSubtune?: boolean) => string | null;
  handleCopyLink: (link: string) => void;
  navigateToCurrentSong: () => void;
}

const SongDisplay: React.FC<SongDisplayProps> = ({
  songUrl,
  ejected,
  getCurrentSongLink,
  handleCopyLink,
  navigateToCurrentSong,
}) => {
  if (ejected || !songUrl) {
    return null;
  }

  const displayName = formatSongDisplayName(songUrl);

  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigateToCurrentSong();
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = getCurrentSongLink(false);
    if (link) {
      handleCopyLink(link);
    }
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
      <span
        className="inline-icon icon-copy"
        onClick={handleCopyClick}
        title="Copy song link to clipboard"
        style={{ marginLeft: 'var(--charW1)', cursor: 'pointer' }}
      />
    </div>
  );
};

export default SongDisplay;
