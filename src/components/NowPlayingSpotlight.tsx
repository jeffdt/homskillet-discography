import React, { useEffect, useState } from 'react';

export const SPOTLIGHT_MS = 4000;

interface NowPlayingSpotlightProps {
  trackId: string | null;
  title: string;
  albumTitle: string;
  blurb: string | null;
}

/** Shows the track title and album center stage for a few seconds after each track change. */
export default function NowPlayingSpotlight({
  trackId,
  title,
  albumTitle,
  blurb,
}: NowPlayingSpotlightProps) {
  const [shownId, setShownId] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId) return undefined;
    setShownId(trackId);
    const timer = setTimeout(() => setShownId(null), SPOTLIGHT_MS);
    return () => clearTimeout(timer);
  }, [trackId]);

  const visible = trackId !== null && shownId === trackId;

  return (
    <div className={`Spotlight${visible ? ' is-visible' : ''}`} aria-live="polite">
      {trackId && (
        <>
          <div className="Spotlight-title">{title}</div>
          <div className="Spotlight-album">{albumTitle}</div>
          {blurb && <p className="Spotlight-blurb">{blurb}</p>}
        </>
      )}
    </div>
  );
}
