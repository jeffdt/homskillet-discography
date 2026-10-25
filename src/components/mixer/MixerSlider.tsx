import React from 'react';
import { useControlHelp } from '../ControlHelp';
import { MixerSliderDef, formatPercent } from './mixerControls';

interface MixerSliderProps {
  def: MixerSliderDef;
  value: number;
  onChange: (value: number) => void;
}

/** One Mixer slider: label, range, live value, and any help text. */
export default function MixerSlider({ def, value, onChange }: MixerSliderProps) {
  const inputId = `mixer-${def.id}`;
  const help = useControlHelp(inputId, def.label, 'Mixer-explain', def.explanation, def.info);
  return (
    <div className="MixerSlider">
      <div className="MixerSlider-row">
        <span className="MixerSlider-name">
          <label htmlFor={inputId} className="MixerSlider-label">
            {def.label}
          </label>
          {help.button}
        </span>
        <input
          id={inputId}
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          aria-describedby={help.describedBy}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <output htmlFor={inputId} className="MixerSlider-value">
          {formatPercent(value)}
        </output>
      </div>
      {help.text}
    </div>
  );
}
