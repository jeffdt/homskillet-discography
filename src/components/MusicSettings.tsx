import React, { memo } from 'react';
import PlayerParams, { ParamDef } from './PlayerParams';

interface MusicSettingsProps {
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
  sequencer: any;
}

function MusicSettings(props: MusicSettingsProps) {
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
    <>
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
    </>
  );
}

export default memo(MusicSettings);
