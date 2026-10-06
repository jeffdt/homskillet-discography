import React, { useEffect, useRef, useState } from 'react';
import Wordmark from './Wordmark';

export const START_COOLDOWN_MS = 3000;

interface TitleScreenProps {
  /** Engine and catalog are ready to play. */
  ready: boolean;
  tagline: string;
  albumCount: number;
  /** Set when the visitor arrived via a ?play= link. */
  sharedTrack: { title: string; albumTitle: string } | null;
  onStart: () => void;
  /** Called synchronously inside the press, so audio can resume within the user gesture. */
  onGesture?: () => void;
  onBrowse: () => void;
}

/** First-load screen: one big play action, a browse link, and a dim idle glow behind them. */
export default function TitleScreen({
  ready,
  tagline,
  albumCount,
  sharedTrack,
  onStart,
  onGesture,
  onBrowse,
}: TitleScreenProps) {
  const [pending, setPending] = useState(false);
  const [starting, setStarting] = useState(false);
  const startLockedRef = useRef(false);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    if (!pending || !ready) return;
    setPending(false);
    setStarting(true);
    startLockedRef.current = true;
    onStartRef.current();
  }, [pending, ready]);

  useEffect(() => {
    if (!starting) return undefined;
    const timer = setTimeout(() => {
      startLockedRef.current = false;
      setStarting(false);
    }, START_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [starting]);

  /** Starts playback now, or queues one start for when everything is ready; repeat presses are ignored. */
  const handleStart = () => {
    // Ref guard: state alone would let two clicks in one batch both pass.
    if (startLockedRef.current) return;
    startLockedRef.current = true;
    if (onGesture) onGesture();
    if (ready) {
      setStarting(true);
      onStart();
    } else {
      setPending(true);
    }
  };

  const label = pending
    ? 'Loading…'
    : sharedTrack?.title
      ? `▶ Play ${sharedTrack.title}`
      : '▶ Start listening';
  const sharedLine = sharedTrack
    ? [sharedTrack.title, sharedTrack.albumTitle].filter(Boolean).join(' · ')
    : '';

  return (
    <div className="TitleScreen">
      <div className="TitleScreen-glow" aria-hidden="true" />
      <h1 className="TitleScreen-logo">
        <Wordmark />
      </h1>
      <p className="TitleScreen-tagline">{tagline}</p>
      {sharedLine && <p className="TitleScreen-shared">{sharedLine}</p>}
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
