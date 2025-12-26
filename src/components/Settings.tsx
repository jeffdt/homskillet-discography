import React, { memo, useContext, useState } from 'react';
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
  const [showParticleTuning, setShowParticleTuning] = useState(false);

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
          Pulse borders in sync with music (slider sparks and chisel)
        </p>

        {persistedSettings.audioReactivePulse && (
          <div className="Settings-subsection">
            <button
              className="Settings-expand-button"
              onClick={() => setShowParticleTuning(!showParticleTuning)}
            >
              {showParticleTuning ? '▼' : '▶'} Particle Tuning
            </button>

            {showParticleTuning && (
              <div className="Settings-particle-tuning">
                <label>
                  <span>Max Particles: {persistedSettings.particleMaxCount ?? 20}</span>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={persistedSettings.particleMaxCount ?? 20}
                    onChange={(e) => {
                      userContext.updateSettings({ particleMaxCount: parseInt(e.target.value) });
                    }}
                  />
                </label>

                <label>
                  <span>Speed Range: {(persistedSettings.particleMinSpeed ?? 0.8).toFixed(2)}x - {(persistedSettings.particleMaxSpeed ?? 1.65).toFixed(2)}x</span>
                  <div className="Settings-dual-slider">
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={persistedSettings.particleMinSpeed ?? 0.8}
                      onChange={(e) => {
                        userContext.updateSettings({ particleMinSpeed: parseFloat(e.target.value) });
                      }}
                    />
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.05"
                      value={persistedSettings.particleMaxSpeed ?? 1.65}
                      onChange={(e) => {
                        userContext.updateSettings({ particleMaxSpeed: parseFloat(e.target.value) });
                      }}
                    />
                  </div>
                </label>

                <label>
                  <span>Max Intensity Spawn Rate: {persistedSettings.particleIntenseInterval ?? 15}ms</span>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={persistedSettings.particleIntenseInterval ?? 15}
                    onChange={(e) => {
                      userContext.updateSettings({ particleIntenseInterval: parseInt(e.target.value) });
                    }}
                  />
                </label>

                <label>
                  <span>Min Intensity Spawn Rate: {persistedSettings.particleQuietInterval ?? 100}ms</span>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="10"
                    value={persistedSettings.particleQuietInterval ?? 100}
                    onChange={(e) => {
                      userContext.updateSettings({ particleQuietInterval: parseInt(e.target.value) });
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        )}
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
