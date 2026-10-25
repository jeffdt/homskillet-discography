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
      i
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
