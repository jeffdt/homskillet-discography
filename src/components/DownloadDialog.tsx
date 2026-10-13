import React, { useContext, useEffect, useRef, useState } from 'react';
import { END_FADE_MS } from '../audio/constants';
import {
  estimateBytes,
  EXPORT_ARTIST,
  ExportFormat,
  exportFileName,
  exportSettings,
  formatLength,
  formatMegabytes,
  isLongWav,
  lengthError,
  mixDiffers,
  mixSilent,
  mixSummary,
  MixSnapshot,
  parseLength,
} from '../audio/export/exportPlan';
import { exportTrack, saveBlob } from '../audio/export/exportTrack';
import { useVoices } from '../hooks/useVoices';
import { PlaybackState } from '../types/playback';
import { MIXER_SLIDERS, MixerSliderId, sliderValue } from './mixer/mixerControls';
import { ToastLevels } from './Toast';
import { ToastContext } from './ToastProvider';
import { UserContext, UserSettings } from './UserProvider';
import '../styles/download.css';

interface DownloadDialogProps {
  title: string;
  album: string | null;
  songUrl: string;
  playback: PlaybackState;
  settings: Partial<UserSettings>;
  onClose: () => void;
  /** Replaced in tests. */
  exporter?: typeof exportTrack;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'rendering'; progress: number }
  | { kind: 'error'; message: string };

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled)';

/** The dialog's Tab stops in order; an unchecked radio is skipped, as the browser does. */
function tabStops(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !(el instanceof HTMLInputElement && el.type === 'radio' && !el.checked)
  );
}

/** Moves Tab focus around inside the dialog instead of out into the page. */
function trapTab(dialog: HTMLElement, e: KeyboardEvent) {
  const stops = tabStops(dialog);
  if (stops.length === 0) return;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const active = document.activeElement;
  if (!dialog.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

function sliderOf(id: MixerSliderId) {
  return MIXER_SLIDERS.find((def) => def.id === id)!;
}

/** A radio group drawn as a segmented control. */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="DownloadDialog-row">
      <legend className="DownloadDialog-label">{label}</legend>
      <div className="DownloadDialog-segmented">
        {options.map((option) => (
          <label key={option.value} className={value === option.value ? 'is-on' : undefined}>
            <input
              type="radio"
              name={`DownloadDialog-${label}`}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Modal that renders the current track to an MP3 or WAV with the visitor's mix or the original. */
export default function DownloadDialog({
  title,
  album,
  songUrl,
  playback,
  settings,
  onClose,
  exporter = exportTrack,
}: DownloadDialogProps) {
  const { updateSettings } = useContext(UserContext);
  const { enqueueToast } = useContext(ToastContext);
  const voices = useVoices();
  const [format, setFormat] = useState<ExportFormat>(
    settings.downloadFormat === 'wav' ? 'wav' : 'mp3'
  );
  const [useMyMix, setUseMyMix] = useState(true);
  const [lengthText, setLengthText] = useState(() =>
    formatLength(playback.durationMs + END_FADE_MS)
  );
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const mix: MixSnapshot = {
    tempo: sliderValue(sliderOf('tempo'), playback, settings),
    subbass: sliderValue(sliderOf('subbass'), playback, settings),
    stereoWidth: sliderValue(sliderOf('stereoWidth'), playback, settings),
    voices,
  };
  const differs = mixDiffers(mix);
  const customMix = differs && useMyMix;
  const silent = customMix && mixSilent(mix);
  const lengthMs = parseLength(lengthText);
  const error = lengthError(lengthMs);
  const rendering = phase.kind === 'rendering';

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => dialogRef.current?.focus(), []);

  const close = () => {
    abortRef.current?.abort();
    onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // Capture phase on document, so the dialog sees every key before the page's shortcuts, wherever
  // focus is: Escape cancels and closes, Tab stays inside, and nothing reaches the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === 'Tab') {
        trapTab(dialog, e);
      } else if (!dialog.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  useEffect(() => {
    if (phase.kind === 'rendering') cancelRef.current?.focus();
  }, [phase.kind]);

  const chooseFormat = (next: ExportFormat) => {
    setFormat(next);
    updateSettings({ downloadFormat: next });
  };

  const start = async () => {
    if (lengthMs === null || error || silent) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const { settings: rendererSettings, gains } = exportSettings(customMix ? mix : null);
    const fileName = exportFileName(title, customMix, format);
    setPhase({ kind: 'rendering', progress: 0 });
    try {
      const response = await fetch(songUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status} while fetching the song`);
      const bytes = await response.arrayBuffer();
      const blob = await exporter(
        {
          wasmUrl: new URL(`${import.meta.env.BASE_URL}chip-core.wasm`, window.location.href).href,
          bytes,
          path: songUrl,
          format,
          lengthMs,
          settings: rendererSettings,
          gains,
          tags: {
            title: customMix ? `${title} (custom mix)` : title,
            artist: EXPORT_ARTIST,
            ...(album ? { album } : {}),
          },
        },
        {
          signal: controller.signal,
          onProgress: (progress) => setPhase({ kind: 'rendering', progress }),
        }
      );
      saveBlob(blob, fileName);
      enqueueToast(`Saved ${fileName}`, ToastLevels.INFO);
      onClose();
    } catch (e) {
      if (controller.signal.aborted) return;
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const size = lengthMs === null ? null : estimateBytes(format, lengthMs);

  return (
    <div className="DownloadDialog-backdrop" data-modal-layer onClick={close}>
      <div
        ref={dialogRef}
        className="DownloadDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="DownloadDialog-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="DownloadDialog-title" className="DownloadDialog-title">
          Download <em>{title}</em>
        </h2>

        <Segmented
          label="Format"
          options={[
            { value: 'mp3', label: 'MP3' },
            { value: 'wav', label: 'WAV' },
          ]}
          value={format}
          onChange={chooseFormat}
          disabled={rendering}
        />

        {differs && (
          <>
            <Segmented
              label="Mix"
              options={[
                { value: 'mine', label: 'My mix' },
                { value: 'original', label: 'Original' },
              ]}
              value={useMyMix ? 'mine' : 'original'}
              onChange={(value) => setUseMyMix(value === 'mine')}
              disabled={rendering}
            />
            <p className="DownloadDialog-note">{mixSummary(mix)}</p>
            {silent && (
              <p className="DownloadDialog-note DownloadDialog-error" role="alert">
                Every voice is silent in your mix. Unmute one, or choose Original.
              </p>
            )}
          </>
        )}

        <div className="DownloadDialog-row">
          <label className="DownloadDialog-label" htmlFor="DownloadDialog-length">
            Length
          </label>
          <input
            id="DownloadDialog-length"
            className="DownloadDialog-length"
            value={lengthText}
            onChange={(e) => setLengthText(e.target.value)}
            disabled={rendering}
            aria-invalid={error ? true : undefined}
          />
          {size !== null && !error && (
            <span className="DownloadDialog-size">{formatMegabytes(size)}</span>
          )}
        </div>
        {error && (
          <p className="DownloadDialog-note DownloadDialog-error" role="alert">
            {error}
          </p>
        )}
        {!error && lengthMs !== null && isLongWav(format, lengthMs) && (
          <p className="DownloadDialog-note DownloadDialog-warning" role="status">
            Long WAV: {formatMegabytes(estimateBytes('wav', lengthMs))}. MP3 would be{' '}
            {formatMegabytes(estimateBytes('mp3', lengthMs))}.
          </p>
        )}
        {phase.kind === 'error' && (
          <p className="DownloadDialog-note DownloadDialog-error" role="alert">
            {phase.message}
          </p>
        )}

        <div className="DownloadDialog-actions">
          {rendering ? (
            <>
              <div className="DownloadDialog-progress">
                <span className="DownloadDialog-progressLabel" aria-live="polite">
                  Generating {format.toUpperCase()}…
                </span>
                <progress value={phase.progress} max={1} aria-label="Rendering" />
              </div>
              <button ref={cancelRef} className="DownloadDialog-secondary" onClick={close}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="DownloadDialog-secondary" onClick={close}>
                Close
              </button>
              <button
                className="DownloadDialog-primary"
                onClick={start}
                disabled={!!error || silent}
              >
                {phase.kind === 'error' ? 'Retry' : 'Download'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
