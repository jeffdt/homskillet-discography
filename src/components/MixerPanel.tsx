import React from 'react';
import { PlaybackControls, PlaybackState } from '../types/playback';
import ChannelStrips from './mixer/ChannelStrips';
import MixerSlider from './mixer/MixerSlider';
import { MIXER_SLIDERS, MixerSliderDef, sliderValue } from './mixer/mixerControls';
import { clearedVoiceMix } from './mixer/voiceMix';
import { UserSettings } from './UserProvider';

/** The Mixer's plain-language lines; each control's own line lives in MIXER_SLIDERS. */
export const MIXER_COPY = {
  channels:
    'Each strip is one chip channel. Mute silences it; Solo plays only the soloed channels.',
  levels:
    "Vol, Pan and Verb set each channel's volume, position and reverb. They reset with each song; double-click one to reset it.",
  sound: 'These apply to every song until you change them.',
  reset: 'Resets speed, bass, stereo and every channel.',
};

interface MixerPanelProps {
  playback: PlaybackState;
  controls: PlaybackControls;
  settings: UserSettings;
}

/** What you hear: live channel strips (mute, solo, volume, pan, reverb), speed, bass and stereo, and a reset. */
export default function MixerPanel({ playback, controls, settings }: MixerPanelProps) {
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
        <p className="Mixer-explain">{MIXER_COPY.levels}</p>
        <ChannelStrips onVoiceMixChange={controls.setVoiceMix} />
      </section>
      <section className="Mixer-section" aria-labelledby="mixer-sound">
        <h3 id="mixer-sound">Sound</h3>
        <p className="Mixer-explain">{MIXER_COPY.sound}</p>
        {MIXER_SLIDERS.map((def) => (
          <MixerSlider
            key={def.id}
            def={def}
            value={sliderValue(def, playback, settings)}
            onChange={(next) => change(def, next)}
          />
        ))}
      </section>
      <section className="Mixer-section">
        <button type="button" className="Mixer-reset" onClick={reset}>
          Reset mixer
        </button>
        <p className="Mixer-explain">{MIXER_COPY.reset}</p>
      </section>
    </div>
  );
}
