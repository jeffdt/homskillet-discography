import React from 'react';
import { MixerSliderDef, formatPercent } from './mixerControls';

interface MixerSliderProps {
  def: MixerSliderDef;
  value: number;
  onChange: (value: number) => void;
}

/** One Mixer slider: label, range, live value, and its explanation. */
export default function MixerSlider({ def, value, onChange }: MixerSliderProps) {
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
          aria-describedby={explanationId}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <output htmlFor={inputId} className="MixerSlider-value">
          {formatPercent(value)}
        </output>
      </div>
      <p id={explanationId} className="Mixer-explain">
        {def.explanation}
      </p>
    </div>
  );
}
