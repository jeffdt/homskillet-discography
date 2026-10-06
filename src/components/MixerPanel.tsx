import React from 'react';
import { PlaybackControls, PlaybackState } from '../types/playback';
import PlayerSettings from './PlayerSettings';
import { UserSettings } from './UserProvider';

interface MixerPanelProps {
  playback: PlaybackState;
  controls: PlaybackControls;
  settings: UserSettings;
}

/** Interim Mixer slot hosting the existing player settings unchanged; sub-project 6 replaces its contents. */
export default function MixerPanel({ playback, controls, settings }: MixerPanelProps) {
  return (
    <div className="LabSlot">
      <PlayerSettings
        ejected={playback.ejected}
        tempo={playback.tempo}
        numVoices={playback.numVoices}
        voiceMask={playback.voiceMask}
        voiceNames={playback.voiceNames}
        voiceGroups={playback.voiceGroups}
        onVoiceMaskChange={controls.setVoiceMask}
        onTempoChange={(e: any) =>
          controls.setTempo(parseFloat(e && e.target ? e.target.value : e))
        }
        paramDefs={playback.paramDefs as any}
        paramValues={playback.paramValues}
        onParamChange={controls.setParam}
        onPinParam={controls.pinParam}
        persistedSettings={settings}
        hasPlayer={playback.playerKey !== null}
        playerKey={playback.playerKey}
      />
    </div>
  );
}
