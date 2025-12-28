import React, { memo, useContext } from 'react';
import TimeSlider from './TimeSlider';
import VolumeSlider from './VolumeSlider';
import { REPEAT_LABELS, SHUFFLE_LABELS } from '../Sequencer';
import { useAudioPulse } from '../contexts/AudioPulseContext';
import { UserContext } from './UserProvider';

interface AppFooterProps {
  // State props
  currentSongDurationMs: number;
  currentSongNumSubtunes: number;
  currentSongSubtune: number;
  ejected: boolean;
  imageUrl: string | null;
  paused: boolean;
  repeat: number;
  shuffle: number;
  songUrl: string | null;
  volume: number;

  // Method props
  getCurrentSongLink: (withSubtune?: boolean) => string;
  handleCopyLink: (link: string) => void;
  handleCycleRepeat: () => void;
  handleCycleShuffle: () => void;
  handleTimeSliderChange: (position: number) => void;
  handleVolumeChange: (volume: number) => void;
  nextSong: () => void;
  nextSubtune: () => void;
  prevSong: () => void;
  prevSubtune: () => void;
  sequencer: any; // TODO: Type Sequencer properly when migrating
  togglePause: () => void;
}

function AppFooter(props: AppFooterProps): React.ReactElement {
  const {
    // this.state.
    currentSongDurationMs,
    currentSongNumSubtunes,
    currentSongSubtune,
    ejected,
    imageUrl,
    paused,
    repeat,
    shuffle,
    songUrl,
    volume,

    // this.
    getCurrentSongLink,
    handleCopyLink,
    handleCycleRepeat,
    handleCycleShuffle,
    handleTimeSliderChange,
    handleVolumeChange,
    nextSong,
    nextSubtune,
    prevSong,
    prevSubtune,
    sequencer,
    togglePause,
  } = props;

  const subtuneText = `Tune ${currentSongSubtune + 1} of ${currentSongNumSubtunes}`;

  const handleCopySubtuneLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    handleCopyLink(getCurrentSongLink(/*withSubtune=*/true));
  };

  const playPauseTitle = paused ? 'Play' : 'Pause';
  const playPauseClass = paused ? 'icon-play' : 'icon-pause';

  const { amplitude } = useAudioPulse();
  const pulseIntensity = (paused || ejected) ? 0 : amplitude;

  const userContext = useContext(UserContext);
  const particleSettings = {
    particleSpawnRate: userContext.settings.particleSpawnRate,
    particleLifespan: userContext.settings.particleLifespan,
    particleMaxCount: userContext.settings.particleMaxCount,
    particleSpeedX: userContext.settings.particleSpeedX,
    particleSpeedY: userContext.settings.particleSpeedY,
    particleHueVariation: userContext.settings.particleHueVariation,
  };

  return (
    <div className="AppFooter">
      <div className="AppFooter-attribution">
        Forked from <a href="https://github.com/mmontag/chip-player-js" target="_blank" rel="noopener noreferrer">Chip Player JS</a> by Matt Montag
        {' • '}
        Title font: Nixdorf 8810 M15 by <a href="https://int10h.org/oldschool-pc-fonts/" target="_blank" rel="noopener noreferrer">VileR</a> (CC BY-SA 4.0)
      </div>
      <div className="AppFooter-main">
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
            value={volume}/>
        </div>
        <div className="AppFooter-controls-row">
          <button onClick={prevSong}
                  title="Previous"
                  className="box-button"
                  disabled={ejected}>
            <span className="inline-icon icon-prev"/>
          </button>
          <button onClick={togglePause}
                  title={playPauseTitle}
                  className="box-button AppFooter-play-pause"
                  disabled={ejected}
                  style={{
                    '--pulse-intensity': pulseIntensity,
                  } as React.CSSProperties}>
            <span className={`inline-icon ${playPauseClass}`}/>
          </button>
          <button onClick={nextSong}
                  title="Next"
                  className="box-button"
                  disabled={ejected}>
            <span className="inline-icon icon-next"/>
          </button>
          {currentSongNumSubtunes > 1 &&
            <>
              <button
                className="AppFooter-back box-button"
                disabled={ejected}
                onClick={prevSubtune}>
                <span className="inline-icon icon-back"/>
              </button>
              <button
                className="AppFooter-forward box-button"
                disabled={ejected}
                onClick={nextSubtune}>
                <span className="inline-icon icon-forward"/>
              </button>
              {songUrl ?
                <a style={{ color: 'var(--neutral4)' }}
                   href={getCurrentSongLink(/*subtune=*/true)}
                   title="Copy subtune link to clipboard"
                   onClick={handleCopySubtuneLink}>
                  {subtuneText}
                  <span className="inline-icon icon-copy"/>
                </a>
                :
                <span>{subtuneText}</span>
              }
            </>}
        </div>
        <div className="AppFooter-controls-row AppFooter-secondary-controls">
          <button title="Cycle Repeat (repeat off, repeat all songs in the context, or repeat one song)"
                  className="AppFooter-repeat box-button" onClick={handleCycleRepeat}>
            <span className="inline-icon icon-repeat"/>
            {REPEAT_LABELS[repeat]}
          </button>
          <button title="Toggle shuffle mode"
                  className="AppFooter-shuffle box-button" onClick={handleCycleShuffle}>
            <span className="inline-icon icon-shuffle"/>
            {SHUFFLE_LABELS[shuffle]}
          </button>
        </div>
      </div>
      {imageUrl && <img alt="Cover art" className="AppFooter-art" src={imageUrl}/>}
    </div>
  );
}

export default memo(AppFooter);
