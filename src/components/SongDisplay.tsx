import React from 'react';
import { formatSongDisplayName } from '../util';

interface SongDisplayProps {
  songUrl: string | null;
  ejected: boolean;
  getCurrentSongLink: (withSubtune?: boolean) => string | null;
  handleCopyLink: (link: string) => void;
}

const SongDisplay: React.FC<SongDisplayProps> = ({ songUrl, ejected, getCurrentSongLink, handleCopyLink }) => {
  if (ejected || !songUrl) {
    return null;
  }

  const displayName = formatSongDisplayName(songUrl);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const link = getCurrentSongLink(false);
    if (link) {
      handleCopyLink(link);
    }
  };

  return (
    <div className="SongDisplay">
      <a href="#" onClick={handleClick} title="Copy song link to clipboard">
        {displayName}
        <span className="inline-icon icon-copy" style={{ marginLeft: 'var(--charW1)' }}/>
      </a>
    </div>
  );
};

export default SongDisplay;
