import React from 'react';
import { StageSliderDef, displayValue } from './stageControls';

interface StageSliderProps {
  def: StageSliderDef;
  /** The stored setting value (not the slider position). */
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

/** One Stage slider: label, range, live value and the line that explains it. */
export default function StageSlider({ def, value, disabled = false, onChange }: StageSliderProps) {
  const inputId = `stage-${def.id}`;
  const explanationId = `${inputId}-explanation`;
  const shown = displayValue(def, value);
  return (
    <div className={`StageControl${disabled ? ' is-disabled' : ''}`}>
      <div className="StageControl-row">
        <label htmlFor={inputId} className="StageControl-label">
          {def.label}
        </label>
        <input
          id={inputId}
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={def.toSlider(value)}
          disabled={disabled}
          aria-describedby={explanationId}
          aria-valuetext={shown}
          onChange={(e) => onChange(def.fromSlider(parseFloat(e.target.value)))}
        />
        <output htmlFor={inputId} className="StageControl-value">
          {shown}
        </output>
      </div>
      <p id={explanationId} className="StageControl-explain">
        {def.explanation}
      </p>
    </div>
  );
}
