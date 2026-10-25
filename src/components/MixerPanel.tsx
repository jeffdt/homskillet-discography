import React from 'react';
import { InfoButton } from './ControlHelp';
import { PlaybackControls, PlaybackState } from '../types/playback';
import ChannelStrips from './mixer/ChannelStrips';
import MixerSlider from './mixer/MixerSlider';
import { MIXER_SLIDERS, MixerSliderDef, sliderValue } from './mixer/mixerControls';
import { clearedVoiceMix } from './mixer/voiceMix';
import { UserSettings } from './UserProvider';

/** The Mixer's plain-language lines; each control's own line lives in MIXER_SLIDERS. */
export const MIXER_COPY = {
  channels: 'Each strip is one channel of the NES sound chip.',
  levels:
    "Vol sets a channel's volume, Pan moves it left or right, and Verb sends it into a shared reverb. They reset with each new song; double-click one to reset it.",
  sound: 'These apply to every song until you change them.',
};

interface MixerPanelProps {
  playback: PlaybackState;
  controls: PlaybackControls;
  settings: UserSettings;
}

/** What you hear: live channel strips (mute, solo, volume, pan, reverb), speed, bass and stereo, and a reset. */
export default function MixerPanel({ playback, controls, settings }: MixerPanelProps) {
  const [levelsOpen, setLevelsOpen] = React.useState(false);
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
        <p className="Mixer-explain">
          {MIXER_COPY.channels}{' '}
          <InfoButton
            label="Vol, Pan and Verb"
            controls="mixer-levels-info"
            open={levelsOpen}
            onToggle={() => setLevelsOpen((was) => !was)}
          />
        </p>
        <p id="mixer-levels-info" className="Mixer-explain" hidden={!levelsOpen}>
          {MIXER_COPY.levels}
        </p>
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
      </section>
    </div>
  );
}
