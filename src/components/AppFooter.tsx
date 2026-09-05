import React, { memo, useContext, useState } from 'react';
import SongDisplay from './SongDisplay';
import TimeSlider from './TimeSlider';
import VolumeSlider from './VolumeSlider';
import { useAudioPulse } from '../contexts/AudioPulseContext';
import { UserContext } from './UserProvider';

interface AppFooterProps {
  // State props
  currentSongDurationMs: number;
  ejected: boolean;
  imageUrl: string | null;
  paused: boolean;
  shuffle: number;
  isLocked: boolean;
  songUrl: string | null;
  volume: number;

  // Method props
  getCurrentSongLink: () => string | null;
  handleCopyLink: (link: string) => void;
  handleCycleShuffle: () => void;
  handleToggleLock: () => void;
  handleTimeSliderChange: (position: number) => void;
  handleVolumeChange: (volume: number) => void;
  navigateToCurrentSong: () => void;
  nextSong: () => void;
  prevSong: () => void;
  sequencer: any; // TODO: Type Sequencer properly when migrating
  togglePause: () => void;
}

function AppFooter(props: AppFooterProps): React.ReactElement {
  const {
    // this.state.
    currentSongDurationMs,
    ejected,
    imageUrl,
    paused,
    shuffle,
    isLocked,
    songUrl,
    volume,

    // this.
    getCurrentSongLink,
    handleCopyLink,
    handleCycleShuffle,
    handleToggleLock,
    handleTimeSliderChange,
    handleVolumeChange,
    navigateToCurrentSong,
    nextSong,
    prevSong,
    sequencer,
    togglePause,
  } = props;

  const playPauseTitle = paused ? 'Play' : 'Pause';
  const playPauseClass = paused ? 'icon-play' : 'icon-pause';

  const { amplitude } = useAudioPulse();
  const pulseIntensity = paused || ejected ? 0 : amplitude;
  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-dark')
    .trim();

  const userContext = useContext(UserContext);
  const particleSettings = {
    particleEnabled: userContext.settings.sliderSparksEnabled,
    particleSpawnRate: userContext.settings.particleSpawnRate,
    particleLifespan: userContext.settings.particleLifespan,
    particleBaseAngle: userContext.settings.particleBaseAngle,
    particleAngleSpread: userContext.settings.particleAngleSpread,
    particleSpeed: userContext.settings.particleSpeed,
    particleSpeedVariance: userContext.settings.particleSpeedVariance,
    particleGravity: userContext.settings.particleGravity,
    particleHueVariation: userContext.settings.particleHueVariation,
    particleFadeMode: userContext.settings.particleFadeMode,
  };

  const [showAboutModal, setShowAboutModal] = useState(false);

  return (
    <div className="AppFooter">
      <div className="AppFooter-attribution">
        <a
          href="https://github.com/jeffdt/homskillet-discography"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        {' • '}
        based on{' '}
        <a href="https://chiptune.app/" target="_blank" rel="noopener noreferrer">
          chiptune.app
        </a>{' '}
        by matt montag
        {' • '}
        Title font: Nixdorf 8810 M15 by{' '}
        <a href="https://int10h.org/oldschool-pc-fonts/" target="_blank" rel="noopener noreferrer">
          VileR
        </a>{' '}
        (CC BY-SA 4.0)
      </div>
      <button
        className="AppFooter-about-button"
        onClick={() => setShowAboutModal(true)}
        title="About"
      >
        ?
      </button>
      {showAboutModal && (
        <div className="AppFooter-modal-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="AppFooter-modal" onClick={(e) => e.stopPropagation()}>
            <h3>About</h3>
            <p>
              <a
                href="https://github.com/jeffdt/homskillet-discography"
                target="_blank"
                rel="noopener noreferrer"
              >
                View source on GitHub
              </a>
            </p>
            <p>
              based on{' '}
              <a href="https://chiptune.app/" target="_blank" rel="noopener noreferrer">
                chiptune.app
              </a>{' '}
              by matt montag
            </p>
            <p>
              Title font: Nixdorf 8810 M15 by{' '}
              <a
                href="https://int10h.org/oldschool-pc-fonts/"
                target="_blank"
                rel="noopener noreferrer"
              >
                VileR
              </a>{' '}
              (CC BY-SA 4.0)
            </p>
            <button className="box-button" onClick={() => setShowAboutModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
      <div className="AppFooter-main">
        <div className="AppFooter-playback-info">
          <SongDisplay
            songUrl={songUrl}
            ejected={ejected}
            navigateToCurrentSong={navigateToCurrentSong}
          />
          <div style={{ display: 'flex', gap: 'var(--charW2)' }}>
            <TimeSlider
              paused={paused}
              currentSongDurationMs={currentSongDurationMs}
              getCurrentPositionMs={() => {
                // TODO: reevaluate this approach
                if (sequencer && sequencer.getPlayer()) {
                  return sequencer.getPlayer().getPositionMs();
                }
                return 0;
              }}
              onChange={handleTimeSliderChange}
              {...particleSettings}
            />
            <VolumeSlider
              onChange={(e) => {
                handleVolumeChange(e.target.value);
              }}
              handleReset={(e) => {
                handleVolumeChange(100);
                e.preventDefault();
                e.stopPropagation();
              }}
              title="Double-click or right-click to reset to 100%."
              value={volume}
            />
          </div>
        </div>
        <div className="AppFooter-controls-row">
          <button onClick={prevSong} title="Previous" className="box-button" disabled={ejected}>
            <span className="inline-icon icon-prev" />
          </button>
          <button
            onClick={togglePause}
            title={playPauseTitle}
            className={`box-button AppFooter-play-pause ${!paused ? 'AppFooter-play-pause-active' : ''}`}
            disabled={ejected}
            style={
              {
                '--pulse-intensity': pulseIntensity,
                '--pulse-color': accentColor,
              } as React.CSSProperties
            }
          >
            <span className={`inline-icon ${playPauseClass}`} />
          </button>
          <button onClick={nextSong} title="Next" className="box-button" disabled={ejected}>
            <span className="inline-icon icon-next" />
          </button>
        </div>
        <div className="AppFooter-controls-row AppFooter-secondary-controls">
          <button
            title="Toggle shuffle mode"
            className={`AppFooter-shuffle box-button ${shuffle ? 'AppFooter-shuffle-active' : ''}`}
            onClick={handleCycleShuffle}
          >
            <span className="inline-icon icon-shuffle" />
          </button>
          <button
            title={
              isLocked
                ? 'Unlock player (allow auto-advance)'
                : 'Loop current song (disable auto-advance)'
            }
            className={`AppFooter-lock box-button ${isLocked ? 'AppFooter-lock-active' : ''}`}
            onClick={handleToggleLock}
          >
            <span className="inline-icon icon-infinity" />
          </button>
        </div>
      </div>
      {imageUrl && <img alt="Cover art" className="AppFooter-art" src={imageUrl} />}
    </div>
  );
}

export default memo(AppFooter);
