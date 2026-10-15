import React, { useContext, useEffect, useRef, useState } from 'react';
import { formatLength, mixSummary } from '../audio/export/exportPlan';
import { useVoices } from '../hooks/useVoices';
import { BASE_PATH } from '../shell/playUrl';
import { buildShareUrl, changedSliders, changedVisualizer, mixChanged } from '../shell/shareLink';
import { PlaybackState } from '../types/playback';
import { useDialogKeys } from './dialogFocus';
import { MIXER_SLIDERS, MixerSliderId, sliderValue } from './mixer/mixerControls';
import { mixOf } from './mixer/voiceMix';
import { ToastLevels } from './Toast';
import { ToastContext } from './ToastProvider';
import { UserSettings } from './UserProvider';
// The share dialog wears the download dialog's modal look.
import '../styles/download.css';

interface ShareDialogProps {
  title: string;
  trackId: string;
  /** Where playback was when the dialog opened; "Start here" uses it. */
  positionMs: number;
  playback: PlaybackState;
  settings: Partial<UserSettings>;
  onClose: () => void;
  /** Replaced in tests. */
  siteUrl?: string;
}

/** A checkbox row with a line under it saying what it covers. */
function Option({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="ShareDialog-option">
      <label>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      <p className="ShareDialog-note">{note}</p>
    </div>
  );
}

/**
 * Builds a link that plays this track the way it sounds and looks right now: speed, bass and
 * stereo, each channel's mute, solo, volume, pan and reverb, and the visualizer settings. Only
 * what differs from the defaults goes in. Each part can be left out.
 */
export default function ShareDialog({
  title,
  trackId,
  positionMs,
  playback,
  settings,
  onClose,
  siteUrl = `${window.location.origin}${BASE_PATH}`,
}: ShareDialogProps) {
  const { enqueueToast } = useContext(ToastContext);
  const voices = useVoices();
  const dialogRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [includeMix, setIncludeMix] = useState(true);
  const [includeVisualizer, setIncludeVisualizer] = useState(true);
  const [startHere, setStartHere] = useState(false);

  useDialogKeys(dialogRef, onClose);
  useEffect(() => dialogRef.current?.focus(), []);

  const sliders = Object.fromEntries(
    MIXER_SLIDERS.map((def) => [def.id, sliderValue(def, playback, settings)])
  ) as Record<MixerSliderId, number>;
  const mix = mixOf(voices);
  const hasMix = Object.keys(changedSliders(sliders)).length > 0 || mixChanged(mix);
  const visualizerChanges = Object.keys(changedVisualizer(settings)).length;
  const startMs = Math.floor(positionMs);

  const url = buildShareUrl(
    {
      trackId,
      startMs: startHere ? startMs : null,
      sliders: hasMix && includeMix ? sliders : undefined,
      mix: hasMix && includeMix ? mix : null,
      visualizer: visualizerChanges > 0 && includeVisualizer ? settings : null,
    },
    siteUrl
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      enqueueToast('Link copied', ToastLevels.INFO);
      onClose();
    } catch {
      urlRef.current?.select();
      enqueueToast('Copy the selected link with Ctrl+C or Cmd+C', ToastLevels.INFO);
    }
  };

  const canNativeShare = typeof navigator.share === 'function';
  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
      onClose();
    } catch {
      // Dismissed by the visitor; the dialog stays open.
    }
  };

  return (
    <div className="DownloadDialog-backdrop" data-modal-layer onClick={onClose}>
      <div
        ref={dialogRef}
        className="DownloadDialog ShareDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ShareDialog-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ShareDialog-title" className="DownloadDialog-title">
          Share <em>{title}</em>
        </h2>
        <p className="ShareDialog-note">
          Whoever opens the link hears and sees the song the way you set it up.
        </p>

        {hasMix && (
          <Option
            label="My mix"
            note={mixSummary({
              tempo: sliders.tempo,
              subbass: sliders.subbass,
              stereoWidth: sliders.stereoWidth,
              voices,
            })}
            checked={includeMix}
            onChange={setIncludeMix}
          />
        )}
        {visualizerChanges > 0 && (
          <Option
            label="My visualizer"
            note={`${visualizerChanges} visualizer setting${visualizerChanges === 1 ? '' : 's'} changed from the defaults`}
            checked={includeVisualizer}
            onChange={setIncludeVisualizer}
          />
        )}
        {startMs > 0 && (
          <Option
            label={`Start at ${formatLength(startMs)}`}
            note="Otherwise the song plays from the top."
            checked={startHere}
            onChange={setStartHere}
          />
        )}

        <input
          ref={urlRef}
          className="ShareDialog-url"
          value={url}
          readOnly
          aria-label="Share link"
          onFocus={(e) => e.target.select()}
        />

        <div className="DownloadDialog-actions">
          <button className="DownloadDialog-secondary" onClick={onClose}>
            Close
          </button>
          {canNativeShare && (
            <button className="DownloadDialog-secondary" onClick={nativeShare}>
              Share…
            </button>
          )}
          <button className="DownloadDialog-primary" onClick={copy}>
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}
