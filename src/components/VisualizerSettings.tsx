import React, { memo, useContext, useState } from 'react';
import { UserContext } from './UserProvider';
import Tooltip from './Tooltip';

interface VisualizerSettingsProps {
  persistedSettings: Record<string, any>;
}

function VisualizerSettings({ persistedSettings }: VisualizerSettingsProps) {
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
      <div className="Settings-param">
        <label>Peak Decay</label>
        <input
          type="range"
          min="0"
          max="5"
          step="1"
          value={Math.round(((persistedSettings.peakDecayRate ?? 0.98) - 0.92) / 0.015)}
          onChange={(e) => {
            userContext.updateSettings({
              peakDecayRate: 0.92 + parseInt(e.target.value) * 0.015,
            });
            flashValue('peakDecayRate');
          }}
        />
        <span className={flashingSetting === 'peakDecayRate' ? 'Settings-value-flash' : ''}>
          {Math.round(((persistedSettings.peakDecayRate ?? 0.98) - 0.92) / 0.015)}
        </span>
        <InfoIcon tooltip="How fast spectrogram peaks fall" />
      </div>

      <div className="Settings-param">
        <label>Peak quantization</label>
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
            flashValue('peakQuantization');
          }}
        />
        <span className={flashingSetting === 'peakQuantization' ? 'Settings-value-flash' : ''}>
          {(() => {
            const q = persistedSettings.peakQuantization ?? 4;
            return q === 1 ? 'Off' : q === 2 ? 'Low' : q === 4 ? 'Med' : 'High';
          })()}
        </span>
        <InfoIcon tooltip="Quantize peak heights for pixelated effect" />
      </div>
    </>
  );
}

export default memo(VisualizerSettings);
