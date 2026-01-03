import React, { memo, useContext } from 'react';
import PlayerParams, { ParamDef } from './PlayerParams';
import { UserContext } from './UserProvider';
import { UI_PALETTES } from '../config/uiPalettes';

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
    <div className="Settings">
      <div className="Settings-section">
        <h3>UI Effects</h3>
        <label className="Settings-toggle">
          <input
            type="checkbox"
            checked={persistedSettings.audioReactivePulse ?? true}
            onChange={(e) => {
              userContext.updateSettings({
                audioReactivePulse: e.target.checked,
              });
            }}
          />
          <span>Reactive UI</span>
        </label>

        <h4
          className="Settings-subsection Settings-subsection-collapsible"
          onClick={() =>
            userContext.updateSettings({
              uiPaletteSelectorExpanded: !persistedSettings.uiPaletteSelectorExpanded,
            })
          }
        >
          <span
            className={`Settings-subsection-arrow ${
              persistedSettings.uiPaletteSelectorExpanded ? 'expanded' : ''
            }`}
          >
            ▸
          </span>
          Palette
        </h4>

        <div
          className={`Settings-collapsible-content ${
            persistedSettings.uiPaletteSelectorExpanded ? 'expanded' : ''
          }`}
        >
          <div className="UIPalette-grid">
            {UI_PALETTES.map((palette, i) => (
              <div
                key={`ui-palette-${i}`}
                className={`UIPalette-card ${
                  (persistedSettings.uiPalette ?? 0) === i ? 'selected' : ''
                }`}
                onClick={() => userContext.updateSettings({ uiPalette: i })}
              >
                <div className="UIPalette-swatch">
                  <div
                    className="UIPalette-color"
                    style={{ backgroundColor: palette.accentDark }}
                  />
                  <div className="UIPalette-color" style={{ backgroundColor: palette.accent }} />
                </div>
                <span className="UIPalette-label">{palette.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="Settings-param">
          <label>Peak Decay</label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={Math.round(((persistedSettings.peakDecayRate ?? 0.95) - 0.92) / 0.015)}
            onChange={(e) =>
              userContext.updateSettings({
                peakDecayRate: 0.92 + parseInt(e.target.value) * 0.015,
              })
            }
          />
          <span>{Math.round(((persistedSettings.peakDecayRate ?? 0.95) - 0.92) / 0.015)}</span>
        </div>

        <div className="Settings-param">
          <label>Decay Pixelation</label>
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={(() => {
              const q = persistedSettings.peakQuantization ?? 4;
              return q === 1 ? 0 : q === 2 ? 1 : q === 4 ? 2 : 3;
            })()}
            onChange={(e) => {
              const slider = parseInt(e.target.value);
              const quantization = slider === 0 ? 1 : slider === 1 ? 2 : slider === 2 ? 4 : 8;
              userContext.updateSettings({ peakQuantization: quantization });
            }}
          />
          <span>
            {(() => {
              const q = persistedSettings.peakQuantization ?? 4;
              return q === 1 ? 'Off' : q === 2 ? 'Low' : q === 4 ? 'Med' : 'High';
            })()}
          </span>
        </div>

        <h4
          className="Settings-subsection Settings-subsection-collapsible Settings-subsection-with-toggle"
          onClick={() =>
            userContext.updateSettings({
              sliderSparksExpanded: !persistedSettings.sliderSparksExpanded,
            })
          }
        >
          <input
            type="checkbox"
            checked={persistedSettings.sliderSparksEnabled ?? true}
            onChange={(e) => {
              e.stopPropagation();
              userContext.updateSettings({
                sliderSparksEnabled: e.target.checked,
              });
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span
            className={`Settings-subsection-arrow ${persistedSettings.sliderSparksExpanded ? 'expanded' : ''}`}
          >
            ▸
          </span>
          Slider Sparks
          <button
            className="Settings-reset-button"
            onClick={(e) => {
              e.stopPropagation();
              userContext.updateSettings({
                particleSpawnRate: 20,
                particleLifespan: 600,
                particleBaseAngle: 180,
                particleAngleSpread: 30,
                particleSpeed: 1.7,
                particleSpeedVariance: 20,
                particleGravity: 0.0,
              });
            }}
            title="Reset to defaults"
          >
            ↺
          </button>
        </h4>

        <div
          className={`Settings-collapsible-content ${persistedSettings.sliderSparksExpanded ? 'expanded' : ''}`}
        >
          <div className="Settings-param">
            <label>Spawn Rate</label>
            <input
              type="range"
              min="20"
              max="200"
              value={persistedSettings.particleSpawnRate ?? 20}
              onChange={(e) =>
                userContext.updateSettings({
                  particleSpawnRate: parseInt(e.target.value),
                })
              }
            />
            <span>{persistedSettings.particleSpawnRate ?? 20}ms</span>
          </div>

          <div className="Settings-param">
            <label>Lifespan</label>
            <input
              type="range"
              min="200"
              max="2400"
              step="100"
              value={persistedSettings.particleLifespan ?? 600}
              onChange={(e) =>
                userContext.updateSettings({
                  particleLifespan: parseInt(e.target.value),
                })
              }
            />
            <span>{persistedSettings.particleLifespan ?? 600}ms</span>
          </div>

          <div className="Settings-param">
            <label>Spray Angle</label>
            <input
              type="range"
              min="0"
              max="360"
              value={persistedSettings.particleBaseAngle ?? 180}
              onChange={(e) =>
                userContext.updateSettings({
                  particleBaseAngle: parseInt(e.target.value),
                })
              }
            />
            <span>{persistedSettings.particleBaseAngle ?? 180}°</span>
          </div>

          <div className="Settings-param">
            <label>Spray cone</label>
            <input
              type="range"
              min="0"
              max="90"
              value={persistedSettings.particleAngleSpread ?? 30}
              onChange={(e) =>
                userContext.updateSettings({
                  particleAngleSpread: parseInt(e.target.value),
                })
              }
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
              value={persistedSettings.particleSpeed ?? 1.7}
              onChange={(e) =>
                userContext.updateSettings({
                  particleSpeed: parseFloat(e.target.value),
                })
              }
            />
            <span>{(persistedSettings.particleSpeed ?? 1.7).toFixed(1)}×</span>
          </div>

          <div className="Settings-param">
            <label>Speed Variance</label>
            <input
              type="range"
              min="0"
              max="50"
              value={persistedSettings.particleSpeedVariance ?? 20}
              onChange={(e) =>
                userContext.updateSettings({
                  particleSpeedVariance: parseInt(e.target.value),
                })
              }
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
              value={persistedSettings.particleGravity ?? 0.0}
              onChange={(e) =>
                userContext.updateSettings({
                  particleGravity: parseFloat(e.target.value),
                })
              }
            />
            <span>{(persistedSettings.particleGravity ?? 0.0).toFixed(1)}×</span>
          </div>

          <label className="Settings-toggle">
            <input
              type="checkbox"
              checked={persistedSettings.particleFadeMode === 'fade'}
              onChange={(e) => {
                userContext.updateSettings({
                  particleFadeMode: e.target.checked ? 'fade' : 'instant',
                });
              }}
            />
            <span>Alpha fade</span>
          </label>
        </div>
      </div>

      <h3>Music Settings</h3>
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
  );
}

export default memo(Settings);
