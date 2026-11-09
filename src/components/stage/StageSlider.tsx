import React from 'react';
import { useControlHelp } from '../ControlHelp';
import { StageSliderDef, displayValue } from './stageControls';

interface StageSliderProps {
  def: StageSliderDef;
  /** The stored setting value (not the slider position). */
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

/** One Stage slider: label, range, live value and any help text. */
export default function StageSlider({ def, value, disabled = false, onChange }: StageSliderProps) {
  const inputId = `stage-${def.id}`;
  const help = useControlHelp(
    inputId,
    def.label,
    'StageControl-explain',
    def.explanation,
    def.info
  );
  const shown = displayValue(def, value);
  return (
    <div className={`StageControl${disabled ? ' is-disabled' : ''}`}>
      <div className="StageControl-row">
        <span className="StageControl-name">
          <label htmlFor={inputId} className="StageControl-label">
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
          value={def.toSlider(value)}
          disabled={disabled}
          aria-describedby={help.describedBy}
          aria-valuetext={shown}
          onChange={(e) => onChange(def.fromSlider(parseFloat(e.target.value)))}
        />
        <output htmlFor={inputId} className="StageControl-value">
          {shown}
        </output>
      </div>
      {help.text}
    </div>
  );
}
