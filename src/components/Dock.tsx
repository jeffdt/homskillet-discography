import React from 'react';
import { Album, Track } from '../catalog/catalog';
import { titleFromFilename } from '../catalog/titles';
import { useAudioPulse } from '../contexts/AudioPulseContext';
import { toggleFullscreen } from '../shell/fullscreen';
import { PlaybackControls, PlaybackState } from '../types/playback';
import TimeSlider from './TimeSlider';
import VolumeSlider from './VolumeSlider';
import { UserSettings } from './UserProvider';
import {
  IconFullscreen,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconRepeat,
  IconShuffle,
} from './icons';

interface DockProps {
  playback: PlaybackState;
  controls: PlaybackControls;
  track: Track | null;
  album: Album | null;
  settings: Partial<UserSettings>;
  onShowInAlbums: (albumId: string) => void;
  showFullscreen: boolean;
}

/** Title for a song that is not in the catalog, derived from its URL. */
function fallbackTitle(songUrl: string | null): string {
  if (!songUrl) return 'Nothing playing';
  const file = songUrl.split('/').pop() || '';
  try {
    return titleFromFilename(decodeURIComponent(file));
  } catch {
    return titleFromFilename(file);
  }
}

/** Maps user settings to the slider particle props. */
function sparkSettings(settings: Partial<UserSettings>) {
  return {
    particleEnabled: settings.sliderSparksEnabled ?? false,
    particleSpawnRate: settings.particleSpawnRate,
    particleLifespan: settings.particleLifespan,
    particleBaseAngle: settings.particleBaseAngle,
    particleAngleSpread: settings.particleAngleSpread,
    particleSpeed: settings.particleSpeed,
    particleSpeedVariance: settings.particleSpeedVariance,
    particleGravity: settings.particleGravity,
    particleHueVariation: settings.particleHueVariation,
    particleFadeMode: settings.particleFadeMode,
  };
}

/** Play/pause with the audio-reactive glow; isolated so only this button re-renders per pulse. */
function PlayPauseButton({
  paused,
  disabled,
  onClick,
}: {
  paused: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { amplitude } = useAudioPulse();
  const label = paused ? 'Play' : 'Pause';
  return (
    <button
      className="Dock-button Dock-play"
      aria-label={label}
      title={`${label} (Space)`}
      onClick={onClick}
      disabled={disabled}
      style={{ '--pulse-intensity': paused || disabled ? 0 : amplitude } as React.CSSProperties}
    >
      {paused ? <IconPlay /> : <IconPause />}
    </button>
  );
}

/** An icon toggle whose on state is an accent fill plus a dot. */
function ModeToggle({
  label,
  on,
  onClick,
  children,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`Dock-button Dock-toggle${on ? ' is-on' : ''}`}
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Floating transport bar: controls, now playing, progress, modes, volume and fullscreen. */
export default function Dock({
  playback,
  controls,
  track,
  album,
  settings,
  onShowInAlbums,
  showFullscreen,
}: DockProps) {
  const disabled = playback.ejected;
  const title = track ? track.title : fallbackTitle(playback.songUrl);

  return (
    <div className="Dock Chrome" role="region" aria-label="Player">
      <div className="Dock-transport">
        <button
          className="Dock-button"
          aria-label="Previous track"
          title="Previous (Left arrow)"
          onClick={controls.prevTrack}
          disabled={disabled}
        >
          <IconPrev />
        </button>
        <PlayPauseButton
          paused={playback.paused}
          disabled={disabled}
          onClick={controls.togglePause}
        />
        <button
          className="Dock-button"
          aria-label="Next track"
          title="Next (Right arrow)"
          onClick={controls.nextTrack}
          disabled={disabled}
        >
          <IconNext />
        </button>
      </div>

      <button
        className="Dock-meta"
        onClick={() => album && onShowInAlbums(album.id)}
        disabled={!album}
        title={album ? 'Show in Albums' : undefined}
      >
        <span className="Dock-title">{title}</span>
        {album && <span className="Dock-album">{album.title}</span>}
      </button>

      <div className="Dock-progress">
        <TimeSlider
          paused={playback.paused || playback.ejected}
          currentSongDurationMs={playback.durationMs}
          getCurrentPositionMs={controls.getPositionMs}
          onChange={controls.seekToFraction}
          {...sparkSettings(settings)}
        />
      </div>

      <div className="Dock-modes">
        <ModeToggle
          label="Shuffle"
          on={playback.shuffle}
          onClick={() => controls.setShuffle(!playback.shuffle)}
        >
          <IconShuffle />
        </ModeToggle>
        <ModeToggle
          label="Repeat track"
          on={playback.repeat}
          onClick={() => controls.setRepeat(!playback.repeat)}
        >
          <IconRepeat />
        </ModeToggle>
      </div>

      <div className="Dock-volume">
        <VolumeSlider
          value={playback.volume}
          onChange={(e) => controls.setVolume(Number(e.target.value))}
          handleReset={(e) => {
            e.preventDefault();
            e.stopPropagation();
            controls.setVolume(100);
          }}
        />
      </div>

      {showFullscreen && (
        <button
          className="Dock-button"
          aria-label="Fullscreen"
          title="Fullscreen (F)"
          onClick={() => toggleFullscreen()}
        >
          <IconFullscreen />
        </button>
      )}
    </div>
  );
}
