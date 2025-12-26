import React, { memo, useContext } from 'react';
import PlayerParams, { ParamDef } from './PlayerParams';
import { UserContext } from './UserProvider';

interface SettingsProps {
  ejected: boolean;
  tempo: number;
  numVoices: number;
  voiceMask: number[];
  voiceNames: string[];
  voiceGroups?: number[][];
  onVoiceMaskChange: (voiceMask: number[]) => void;
  onTempoChange: (tempo: number) => void;
  paramDefs: ParamDef[];
  paramValues: Record<string, number>;
  onParamChange: (paramKey: string, value: number) => void;
  onPinParam: (paramKey: string) => void;
  persistedSettings: Record<string, any>;
  sequencer: any; // TODO: Type Sequencer when migrated to TS
}

function Settings(props: SettingsProps) {
  const {
    ejected,
    tempo,
    numVoices,
    voiceMask,
    voiceNames,
    voiceGroups,
    onVoiceMaskChange,
    onTempoChange,
    paramDefs,
    paramValues,
    onParamChange,
    onPinParam,
    persistedSettings,
    sequencer,
  } = props;

  const userContext = useContext(UserContext);

  return (
    <div className='Settings'>
      <div className="Settings-section">
        <h3>UI Effects</h3>
        <label className="Settings-toggle">
          <input
            type="checkbox"
            checked={persistedSettings.audioReactivePulse ?? true}
            onChange={(e) => {
              userContext.updateSettings({ audioReactivePulse: e.target.checked });
            }}
          />
          <span>Audio-Reactive Pulse</span>
        </label>
        <p className="Settings-hint">
          Pulse borders in sync with music (play/pause button and song row)
        </p>
      </div>

      <h3>{sequencer?.getPlayer()?.name || 'Player'} Settings</h3>
      {sequencer?.getPlayer() ?
        <PlayerParams
          ejected={ejected}
          tempo={tempo}
          numVoices={numVoices}
          voiceMask={voiceMask}
          voiceNames={voiceNames}
          voiceGroups={voiceGroups}
          onTempoChange={onTempoChange}
          onVoiceMaskChange={onVoiceMaskChange}
          paramDefs={paramDefs}
          paramValues={paramValues}
          onParamChange={onParamChange}
          onPinParam={onPinParam}
          persistedSettings={persistedSettings}
          playerKey={sequencer?.getPlayer()?.playerKey}
        />
        :
        <div>(No active player)</div>}
    </div>
  );
}

export default memo(Settings);
