import React from 'react';
import { SCOPE_PRESETS, ScopePreset, matchingScopePreset } from '../../config/stageSettings';

interface ScopePresetsProps {
  settings: Record<string, unknown>;
  onApply: (preset: ScopePreset) => void;
}

/** Preset buttons for the channel scopes; the one matching every current value shows as pressed. */
export default function ScopePresets({ settings, onApply }: ScopePresetsProps) {
  const match = matchingScopePreset(settings);
  return (
    <div className="StagePresets" role="group" aria-label="Scope presets">
      <div className="StagePresets-row">
        {SCOPE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="StagePresets-button"
            aria-pressed={match?.id === preset.id}
            onClick={() => onApply(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
