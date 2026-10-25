import React from 'react';
import { useControlHelp } from '../ControlHelp';

interface StageToggleProps {
  /** Unique; the input's DOM id is `stage-${id}`. */
  id: string;
  label: string;
  /** Always shown under the switch. */
  explanation?: string;
  /** Shown when the visitor taps the switch's "i" button. */
  info?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** One Stage on/off switch with any help text. */
export default function StageToggle({
  id,
  label,
  explanation,
  info,
  checked,
  disabled = false,
  onChange,
}: StageToggleProps) {
  const inputId = `stage-${id}`;
  const help = useControlHelp(inputId, label, 'StageControl-explain', explanation, info);
  return (
    <div className={`StageControl${disabled ? ' is-disabled' : ''}`}>
      <div className="StageControl-row">
        <label htmlFor={inputId} className="StageToggle">
          <input
            id={inputId}
            type="checkbox"
            role="switch"
            checked={checked}
            disabled={disabled}
            aria-describedby={help.describedBy}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="StageControl-label">{label}</span>
        </label>
        {help.button}
      </div>
      {help.text}
    </div>
  );
}
