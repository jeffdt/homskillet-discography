import React from 'react';
import { PlaybackControls, PlaybackState } from '../types/playback';
import ChannelStrips from './mixer/ChannelStrips';
import MixerSlider from './mixer/MixerSlider';
import { MIXER_SLIDERS, MixerSliderDef, isPinned, sliderValue } from './mixer/mixerControls';
import { clearedVoiceMix } from './mixer/voiceMix';
import { UserSettings } from './UserProvider';

/** The Mixer's plain-language lines; each control's own line lives in MIXER_SLIDERS. */
export const MIXER_COPY = {
  channels:
    'Each strip is one voice of the sound chip, drawn live. Mute silences a channel; Solo plays only the soloed ones. Channels you are not hearing stay as dim ghosts.',
  sound:
    'These change how the whole song plays. They reset when a new song starts unless you pin them.',
  noTrack: 'Start a song to use these. Pins work any time.',
  reset: 'Puts speed, bass and stereo back to normal and unmutes every channel.',
};

interface MixerPanelProps {
  playback: PlaybackState;
  controls: PlaybackControls;
  settings: UserSettings;
}

/** What you hear: live channel strips with mute and solo, speed, bass and stereo, and a reset. */
export default function MixerPanel({ playback, controls, settings }: MixerPanelProps) {
  const noTrack = playback.playerKey === null;

  const change = (def: MixerSliderDef, value: number) => {
    if (def.id === 'tempo') controls.setTempo(value);
    else controls.setParam(def.id, value);
  };

  const reset = () => {
    MIXER_SLIDERS.forEach((def) => change(def, def.defaultValue));
    controls.setVoiceMix(clearedVoiceMix());
  };

  return (
    <div className="Mixer">
      <section className="Mixer-section" aria-labelledby="mixer-channels">
        <h3 id="mixer-channels">Channels</h3>
        <p className="Mixer-explain">{MIXER_COPY.channels}</p>
        <ChannelStrips onVoiceMixChange={controls.setVoiceMix} />
      </section>
      <section className="Mixer-section" aria-labelledby="mixer-sound">
        <h3 id="mixer-sound">Sound</h3>
        <p className="Mixer-explain">{MIXER_COPY.sound}</p>
        {noTrack && <p className="Mixer-hint">{MIXER_COPY.noTrack}</p>}
        {MIXER_SLIDERS.map((def) => {
          const value = sliderValue(def, playback, settings);
          return (
            <MixerSlider
              key={def.id}
              def={def}
              value={value}
              pinned={isPinned(def, settings)}
              disabled={noTrack}
              onChange={(next) => change(def, next)}
              onTogglePin={() => controls.pinParam(def.pinKey, value)}
            />
          );
        })}
      </section>
      <section className="Mixer-section">
        <button type="button" className="Mixer-reset" disabled={noTrack} onClick={reset}>
          Reset mixer
        </button>
        <p className="Mixer-explain">{MIXER_COPY.reset}</p>
      </section>
    </div>
  );
}
