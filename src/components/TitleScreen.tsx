import React, { useEffect, useRef, useState } from 'react';

export const START_COOLDOWN_MS = 3000;

interface TitleScreenProps {
  /** Engine and catalog are ready to play. */
  ready: boolean;
  tagline: string;
  albumCount: number;
  /** Set when the visitor arrived via a ?play= link. */
  sharedTrack: { title: string; albumTitle: string } | null;
  onStart: () => void;
  onBrowse: () => void;
}

/** First-load screen: one big play action, a browse link, and a dim idle glow behind them. */
export default function TitleScreen({
  ready,
  tagline,
  albumCount,
  sharedTrack,
  onStart,
  onBrowse,
}: TitleScreenProps) {
  const [pending, setPending] = useState(false);
  const [starting, setStarting] = useState(false);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    if (!pending || !ready) return;
    setPending(false);
    setStarting(true);
    onStartRef.current();
  }, [pending, ready]);

  useEffect(() => {
    if (!starting) return undefined;
    const timer = setTimeout(() => setStarting(false), START_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [starting]);

  /** Starts playback now, or queues one start for when everything is ready; repeat presses are ignored. */
  const handleStart = () => {
    if (pending || starting) return;
    if (ready) {
      setStarting(true);
      onStart();
    } else {
      setPending(true);
    }
  };

  const label = pending
    ? 'Loading…'
    : sharedTrack
      ? `▶ Play ${sharedTrack.title}`
      : '▶ Start listening';

  return (
    <div className="TitleScreen">
      <div className="TitleScreen-glow" aria-hidden="true" />
      <h1 className="TitleScreen-logo">HOMSKILLET</h1>
      <p className="TitleScreen-tagline">{tagline}</p>
      {sharedTrack && (
        <p className="TitleScreen-shared">
          {sharedTrack.title} · {sharedTrack.albumTitle}
        </p>
      )}
      <button
        className="TitleScreen-start"
        onClick={handleStart}
        disabled={starting}
        aria-busy={pending}
      >
        {label}
      </button>
      <button className="TitleScreen-browse" onClick={onBrowse}>
        {albumCount > 0 ? `or browse ${albumCount} albums` : 'or browse albums'}
      </button>
    </div>
  );
}
