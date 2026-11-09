import React, { useState } from 'react';

interface InfoButtonProps {
  /** What the button explains, read as "About <label>". */
  label: string;
  /** Id of the text it shows and hides. */
  controls: string;
  open: boolean;
  onToggle: () => void;
}

/** A small "i" button that shows or hides an explanation. Works on tap and keyboard, not hover. */
export function InfoButton({ label, controls, open, onToggle }: InfoButtonProps) {
  return (
    <button
      type="button"
      className="InfoButton"
      aria-label={`About ${label}`}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="4.75" r="1.1" fill="currentColor" />
        <rect x="7.1" y="6.75" width="1.8" height="5" rx="0.9" fill="currentColor" />
      </svg>
    </button>
  );
}

/**
 * Help text for one control. `explanation` is always shown; `info` hides behind an InfoButton.
 * Either can be missing. The text stays the control's accessible description even while hidden.
 */
export function useControlHelp(
  id: string,
  label: string,
  className: string,
  explanation?: string,
  info?: string
) {
  const [open, setOpen] = useState(false);
  const text = explanation || info;
  const helpId = `${id}-explanation`;
  const behindButton = !explanation && !!info;
  return {
    describedBy: text ? helpId : undefined,
    button: behindButton ? (
      <InfoButton
        label={label}
        controls={helpId}
        open={open}
        onToggle={() => setOpen((was) => !was)}
      />
    ) : null,
    text: text ? (
      <p id={helpId} className={className} hidden={behindButton && !open}>
        {text}
      </p>
    ) : null,
  };
}
