import React, { useRef } from 'react';

/** One card in a SwatchPicker. */
export interface SwatchOption {
  id: string;
  label: string;
  /** Colors drawn as a strip of pixels above the label; omit for a text-only card. */
  colors?: readonly string[];
}

interface SwatchPickerProps {
  /** Accessible name of the group. */
  label: string;
  options: readonly SwatchOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Id of visible text describing the group. */
  describedBy?: string;
}

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

/**
 * A radio group of cards (palettes, accents, styles). Tab reaches the selected card; arrow keys,
 * Home and End select and focus another, as in any radio group. An unknown selectedId checks the
 * first card so the group always has one tab stop.
 */
export default function SwatchPicker({
  label,
  options,
  selectedId,
  onSelect,
  describedBy,
}: SwatchPickerProps) {
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === selectedId)
  );

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = options.length - 1;
    let target: number | null = null;
    if (NEXT_KEYS.includes(e.key)) target = index === last ? 0 : index + 1;
    else if (PREVIOUS_KEYS.includes(e.key)) target = index === 0 ? last : index - 1;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = last;
    if (target === null) return;
    e.preventDefault();
    onSelect(options[target].id);
    const card = cards.current[target];
    if (card) card.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
      className="SwatchPicker"
    >
      {options.map((option, i) => {
        const checked = i === selectedIndex;
        return (
          <button
            key={option.id}
            ref={(element) => {
              cards.current[i] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={`SwatchPicker-card${checked ? ' is-selected' : ''}`}
            onClick={() => onSelect(option.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {option.colors && option.colors.length > 0 && (
              <span className="SwatchPicker-swatch" aria-hidden="true">
                {option.colors.map((color, c) => (
                  <span key={c} className="SwatchPicker-pixel" style={{ backgroundColor: color }} />
                ))}
              </span>
            )}
            <span className="SwatchPicker-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
