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
          className="Settings-subsection Settings-subsection-collapsible"
          onClick={() => userContext.updateSettings({ sliderSparksExpanded: !persistedSettings.sliderSparksExpanded })}
        >
          <span className={`Settings-subsection-arrow ${persistedSettings.sliderSparksExpanded ? 'expanded' : ''}`}>▸</span>
          Slider Sparks
          <button
            className="Settings-reset-button"
            onClick={(e) => {
              e.stopPropagation();
              userContext.updateSettings({
                particleSpawnRate: 40,
                particleLifespan: 600,
                particleMaxCount: 15,
                particleSpeedX: 1.1,
                particleSpeedY: 2.0,
                particleHueVariation: 30,
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
              max="1200"
              step="100"
              value={persistedSettings.particleLifespan ?? 600}
              onChange={(e) => userContext.updateSettings({ particleLifespan: parseInt(e.target.value) })}
            />
            <span>{persistedSettings.particleLifespan ?? 600}ms</span>
          </div>

          <div className="Settings-param">
            <label>Max Count</label>
            <input
              type="range"
              min="5"
              max="30"
              value={persistedSettings.particleMaxCount ?? 15}
              onChange={(e) => userContext.updateSettings({ particleMaxCount: parseInt(e.target.value) })}
            />
            <span>{persistedSettings.particleMaxCount ?? 15}</span>
          </div>

          <div className="Settings-param">
            <label>Horizontal Speed</label>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={persistedSettings.particleSpeedX ?? 1.1}
              onChange={(e) => userContext.updateSettings({ particleSpeedX: parseFloat(e.target.value) })}
            />
            <span>{(persistedSettings.particleSpeedX ?? 1.1).toFixed(1)}×</span>
          </div>

          <div className="Settings-param">
            <label>Vertical Spread</label>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={persistedSettings.particleSpeedY ?? 2.0}
              onChange={(e) => userContext.updateSettings({ particleSpeedY: parseFloat(e.target.value) })}
            />
            <span>{(persistedSettings.particleSpeedY ?? 2.0).toFixed(1)}×</span>
          </div>

          <div className="Settings-param">
            <label>Color Variation</label>
            <input
              type="range"
              min="0"
              max="60"
              value={persistedSettings.particleHueVariation ?? 30}
              onChange={(e) => userContext.updateSettings({ particleHueVariation: parseInt(e.target.value) })}
            />
            <span>{persistedSettings.particleHueVariation ?? 30}°</span>
          </div>
        </div>
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
