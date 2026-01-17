import React, { memo } from 'react';
import PlayerParams, { ParamDef } from './PlayerParams';

interface PlayerSettingsProps {
  ejected: boolean;
  tempo: number;
  numVoices: number;
  voiceMask: boolean[];
  voiceNames: string[];
  voiceGroups?: number[][];
  onVoiceMaskChange: (voiceMask: boolean[]) => void;
  onTempoChange: (tempo: number) => void;
  paramDefs: ParamDef[];
  paramValues: Record<string, number>;
  onParamChange: (paramKey: string, value: number) => void;
  onPinParam: (paramKey: string, currentValue: any) => void;
  persistedSettings: Record<string, any>;
  sequencer: any;
}

function PlayerSettings(props: PlayerSettingsProps) {
  const {
    ejected,
    tempo,
    numVoices,
    voiceMask,
    voiceNames,
    voiceGroups,
    onTempoChange,
    onVoiceMaskChange,
    paramDefs,
    paramValues,
    onParamChange,
    onPinParam,
    persistedSettings,
    sequencer,
  } = props;

  return (
    <div className="Settings">
      <div className="Settings-section">
        <h3>Music Player</h3>
        {sequencer?.getPlayer() ? (
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
        ) : (
          <div>(No active player)</div>
        )}
      </div>
    </div>
  );
}

export default memo(PlayerSettings);
