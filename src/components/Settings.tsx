import React, { memo } from 'react';
import { ParamDef } from './PlayerParams';
import UISettings from './UISettings';
import PlayerSettings from './PlayerSettings';

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
  return (
    <>
      <UISettings persistedSettings={props.persistedSettings} />
      <PlayerSettings {...props} />
    </>
  );
}

export default memo(Settings);
