import React from 'react';

interface StageToggleProps {
  /** Unique; the input's DOM id is `stage-${id}`. */
  id: string;
  label: string;
  explanation: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** One Stage on/off switch with the line that explains it. */
export default function StageToggle({
  id,
  label,
  explanation,
  checked,
  disabled = false,
  onChange,
}: StageToggleProps) {
  const inputId = `stage-${id}`;
  const explanationId = `${inputId}-explanation`;
  return (
    <div className={`StageControl${disabled ? ' is-disabled' : ''}`}>
      <label htmlFor={inputId} className="StageToggle">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={explanationId}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="StageControl-label">{label}</span>
      </label>
      <p id={explanationId} className="StageControl-explain">
        {explanation}
      </p>
    </div>
  );
}
