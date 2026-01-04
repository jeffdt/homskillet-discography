import React, { memo, useContext, useState } from 'react';
import { UserContext } from './UserProvider';
import { UI_PALETTES } from '../config/uiPalettes';
import Tooltip from './Tooltip';

interface UISettingsProps {
  persistedSettings: Record<string, any>;
}

function UISettings({ persistedSettings }: UISettingsProps) {
  const userContext = useContext(UserContext);

  // Track which setting is currently flashing
  const [flashingSetting, setFlashingSetting] = useState<string | null>(null);

  // Helper to trigger flash effect on value change
  const flashValue = (settingKey: string) => {
    setFlashingSetting(settingKey);
    setTimeout(() => setFlashingSetting(null), 500);
  };

  const InfoIcon = ({ tooltip }: { tooltip: string }) => (
    <Tooltip content={tooltip} side="right">
      <span className="Settings-info-icon">?</span>
    </Tooltip>
  );

  return (
    <>
      <div className="Settings-row">
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
        <InfoIcon tooltip="UI elements pulse and glow in response to audio" />
      </div>

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
                <div className="UIPalette-color" style={{ backgroundColor: palette.accentDark }} />
                <div className="UIPalette-color" style={{ backgroundColor: palette.accent }} />
              </div>
              <span className="UIPalette-label">{palette.label}</span>
            </div>
          ))}
        </div>
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
          <label>Spawn Freq</label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={(220 - (persistedSettings.particleSpawnRate ?? 20)) / 20}
            onChange={(e) => {
              userContext.updateSettings({
                particleSpawnRate: 220 - parseInt(e.target.value) * 20,
              });
              flashValue('particleSpawnRate');
            }}
          />
          <span className={flashingSetting === 'particleSpawnRate' ? 'Settings-value-flash' : ''}>
            {(220 - (persistedSettings.particleSpawnRate ?? 20)) / 20}
          </span>
          <InfoIcon tooltip="How often sparks spawn" />
        </div>

        <div className="Settings-param">
          <label>Lifespan</label>
          <input
            type="range"
            min="200"
            max="2400"
            step="200"
            value={persistedSettings.particleLifespan ?? 600}
            onChange={(e) => {
              userContext.updateSettings({
                particleLifespan: parseInt(e.target.value),
              });
              flashValue('particleLifespan');
            }}
          />
          <span className={flashingSetting === 'particleLifespan' ? 'Settings-value-flash' : ''}>
            {(persistedSettings.particleLifespan ?? 600) / 200}
          </span>
          <InfoIcon tooltip="How long sparks live before disappearing" />
        </div>

        <div className="Settings-param">
          <label>Spray Angle</label>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={persistedSettings.particleBaseAngle ?? 180}
            onChange={(e) => {
              userContext.updateSettings({
                particleBaseAngle: parseInt(e.target.value),
              });
              flashValue('particleBaseAngle');
            }}
          />
          <span className={flashingSetting === 'particleBaseAngle' ? 'Settings-value-flash' : ''}>
            {persistedSettings.particleBaseAngle ?? 180}°
          </span>
          <InfoIcon tooltip="Direction sparks fire (180°=left)" />
        </div>

        <div className="Settings-param">
          <label>Spray cone</label>
          <input
            type="range"
            min="0"
            max="90"
            value={persistedSettings.particleAngleSpread ?? 30}
            onChange={(e) => {
              userContext.updateSettings({
                particleAngleSpread: parseInt(e.target.value),
              });
              flashValue('particleAngleSpread');
            }}
          />
          <span className={flashingSetting === 'particleAngleSpread' ? 'Settings-value-flash' : ''}>
            {persistedSettings.particleAngleSpread ?? 30}°
          </span>
          <InfoIcon tooltip="Randomization range around spray angle (±degrees)" />
        </div>

        <div className="Settings-param">
          <label>Speed</label>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={persistedSettings.particleSpeed ?? 1.7}
            onChange={(e) => {
              userContext.updateSettings({
                particleSpeed: parseFloat(e.target.value),
              });
              flashValue('particleSpeed');
            }}
          />
          <span className={flashingSetting === 'particleSpeed' ? 'Settings-value-flash' : ''}>
            {(persistedSettings.particleSpeed ?? 1.7).toFixed(1)}×
          </span>
          <InfoIcon tooltip="Base spark speed" />
        </div>

        <div className="Settings-param">
          <label>Speed Variance</label>
          <input
            type="range"
            min="0"
            max="9"
            step="1"
            value={(persistedSettings.particleSpeedVariance ?? 20) / 10}
            onChange={(e) => {
              userContext.updateSettings({
                particleSpeedVariance: parseInt(e.target.value) * 10,
              });
              flashValue('particleSpeedVariance');
            }}
          />
          <span
            className={flashingSetting === 'particleSpeedVariance' ? 'Settings-value-flash' : ''}
          >
            {(persistedSettings.particleSpeedVariance ?? 20) / 10}
          </span>
          <InfoIcon tooltip="Random speed variation applied per spark" />
        </div>

        <div className="Settings-param">
          <label>Gravity</label>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.1"
            value={persistedSettings.particleGravity ?? 0.0}
            onChange={(e) => {
              userContext.updateSettings({
                particleGravity: parseFloat(e.target.value),
              });
              flashValue('particleGravity');
            }}
          />
          <span className={flashingSetting === 'particleGravity' ? 'Settings-value-flash' : ''}>
            {(persistedSettings.particleGravity ?? 0.0).toFixed(1)}×
          </span>
          <InfoIcon tooltip="Downward spark acceleration" />
        </div>

        <div className="Settings-row">
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
          <InfoIcon tooltip="Gradually fade out particles vs. instantly disappear" />
        </div>
      </div>
    </>
  );
}

export default memo(UISettings);
