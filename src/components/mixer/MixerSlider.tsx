import React from 'react';
import { MixerSliderDef, formatPercent } from './mixerControls';

interface MixerSliderProps {
  def: MixerSliderDef;
  value: number;
  pinned: boolean;
  disabled: boolean;
  onChange: (value: number) => void;
  onTogglePin: () => void;
}

/** One Mixer slider: label, range, live value, a pin that keeps it for every song, and its explanation. */
export default function MixerSlider({
  def,
  value,
  pinned,
  disabled,
  onChange,
  onTogglePin,
}: MixerSliderProps) {
  const inputId = `mixer-${def.id}`;
  const explanationId = `${inputId}-explanation`;
  return (
    <div className="MixerSlider">
      <div className="MixerSlider-row">
        <label htmlFor={inputId} className="MixerSlider-label">
          {def.label}
        </label>
        <input
          id={inputId}
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          disabled={disabled}
          aria-describedby={explanationId}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <output htmlFor={inputId} className="MixerSlider-value">
          {formatPercent(value)}
        </output>
        <button
          type="button"
          className="MixerSlider-pin"
          aria-label={`Keep ${def.label} for every song`}
          aria-pressed={pinned}
          title={pinned ? 'Pinned: kept for every song' : 'Pin: keep this value for every song'}
          onClick={onTogglePin}
        >
          <span
            className={`inline-icon ${pinned ? 'icon-pin-down' : 'icon-pin-up'}`}
            aria-hidden="true"
          />
        </button>
      </div>
      <p id={explanationId} className="Mixer-explain">
        {def.explanation}
      </p>
    </div>
  );
}
