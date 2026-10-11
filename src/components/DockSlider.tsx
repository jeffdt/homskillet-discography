import React, { memo } from 'react';

interface DockSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** The value text shown beside the label. */
  format: (value: number) => string;
  onChange: (value: number) => void;
  /** Double-click or right-click puts the slider back here. */
  resetValue: number;
}

/** A small labeled slider in the player bar (volume, speed); double-click or right-click resets it. */
function DockSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  resetValue,
}: DockSliderProps) {
  const reset = (e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(resetValue);
  };
  return (
    <div className="DockSlider">
      <input
        type="range"
        aria-label={label}
        title={`${label} (double-click to reset)`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={reset}
        onContextMenu={reset}
      />
      <div className="DockSlider-labels">
        <div>{label}</div>
        <div>{format(value)}</div>
      </div>
    </div>
  );
}

export default memo(DockSlider);
