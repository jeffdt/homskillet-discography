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
          <span>Reactive UI</span>
        </label>

        <h4
          className="Settings-subsection Settings-subsection-collapsible Settings-subsection-with-toggle"
          onClick={() => userContext.updateSettings({ sliderSparksExpanded: !persistedSettings.sliderSparksExpanded })}
        >
          <input
            type="checkbox"
            checked={persistedSettings.sliderSparksEnabled ?? true}
            onChange={(e) => {
              e.stopPropagation();
              userContext.updateSettings({ sliderSparksEnabled: e.target.checked });
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className={`Settings-subsection-arrow ${persistedSettings.sliderSparksExpanded ? 'expanded' : ''}`}>▸</span>
          Slider Sparks
          <button
            className="Settings-reset-button"
            onClick={(e) => {
              e.stopPropagation();
              userContext.updateSettings({
                particleSpawnRate: 40,
                particleLifespan: 600,
                particleBaseAngle: 180,
                particleAngleSpread: 30,
                particleSpeed: 1.0,
                particleSpeedVariance: 20,
                particleGravity: 0.5,
              });
            }}
            title="Reset to defaults"
          >
            ↺
          </button>
        </h4>

        <div className={`Settings-collapsible-content ${persistedSettings.sliderSparksExpanded ? 'expanded' : ''}`}>
          <div className="Settings-param">
            <label>Spawn Rate</label>
            <input
              type="range"
              min="20"
              max="200"
              value={persistedSettings.particleSpawnRate ?? 40}
              onChange={(e) => userContext.updateSettings({ particleSpawnRate: parseInt(e.target.value) })}
            />
            <span>{persistedSettings.particleSpawnRate ?? 40}ms</span>
          </div>

          <div className="Settings-param">
            <label>Lifespan</label>
            <input
              type="range"
              min="200"
              max="2400"
              step="100"
              value={persistedSettings.particleLifespan ?? 600}
              onChange={(e) => userContext.updateSettings({ particleLifespan: parseInt(e.target.value) })}
            />
            <span>{persistedSettings.particleLifespan ?? 600}ms</span>
          </div>

          <div className="Settings-param">
            <label>Base Angle</label>
            <input
              type="range"
              min="0"
              max="360"
              value={persistedSettings.particleBaseAngle ?? 180}
              onChange={(e) => userContext.updateSettings({ particleBaseAngle: parseInt(e.target.value) })}
            />
            <span>{persistedSettings.particleBaseAngle ?? 180}°</span>
          </div>

          <div className="Settings-param">
            <label>Angle Spread</label>
            <input
              type="range"
              min="0"
              max="90"
              value={persistedSettings.particleAngleSpread ?? 30}
              onChange={(e) => userContext.updateSettings({ particleAngleSpread: parseInt(e.target.value) })}
            />
            <span>{persistedSettings.particleAngleSpread ?? 30}°</span>
          </div>

          <div className="Settings-param">
            <label>Speed</label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={persistedSettings.particleSpeed ?? 1.0}
              onChange={(e) => userContext.updateSettings({ particleSpeed: parseFloat(e.target.value) })}
            />
            <span>{(persistedSettings.particleSpeed ?? 1.0).toFixed(1)}×</span>
          </div>

          <div className="Settings-param">
            <label>Speed Variance</label>
            <input
              type="range"
              min="0"
              max="50"
              value={persistedSettings.particleSpeedVariance ?? 20}
              onChange={(e) => userContext.updateSettings({ particleSpeedVariance: parseInt(e.target.value) })}
            />
            <span>{persistedSettings.particleSpeedVariance ?? 20}%</span>
          </div>

          <div className="Settings-param">
            <label>Gravity</label>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.1"
              value={persistedSettings.particleGravity ?? 0.5}
              onChange={(e) => userContext.updateSettings({ particleGravity: parseFloat(e.target.value) })}
            />
            <span>{(persistedSettings.particleGravity ?? 0.5).toFixed(1)}×</span>
          </div>
        </div>
      </div>

      <h3>Music Settings</h3>
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
