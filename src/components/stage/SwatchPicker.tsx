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

const ROW_TOLERANCE_PX = 2;

/**
 * The card one grid row above (direction -1) or below (+1) the card at `index`, in the nearest
 * column by horizontal center. Wraps to the opposite end row at the edges; stays put in one row.
 */
function adjacentRowTarget(cards: Array<HTMLElement | null>, index: number, direction: 1 | -1) {
  const boxes = cards.map((card) => card?.getBoundingClientRect());
  const current = boxes[index];
  if (!current) return index;
  const rowTops: number[] = [];
  boxes.forEach((box) => {
    if (box && !rowTops.some((top) => Math.abs(top - box.top) <= ROW_TOLERANCE_PX)) {
      rowTops.push(box.top);
    }
  });
  rowTops.sort((a, b) => a - b);
  if (rowTops.length < 2) return index;
  const currentRow = rowTops.findIndex((top) => Math.abs(top - current.top) <= ROW_TOLERANCE_PX);
  const targetTop = rowTops[(currentRow + direction + rowTops.length) % rowTops.length];
  const centerX = current.left + current.width / 2;
  let best = index;
  let bestDistance = Infinity;
  boxes.forEach((box, i) => {
    if (!box || Math.abs(box.top - targetTop) > ROW_TOLERANCE_PX) return;
    const distance = Math.abs(box.left + box.width / 2 - centerX);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * A radio group of cards (palettes, accents, styles). Tab reaches the selected card. Left and Right
 * walk the order, Up and Down move between grid rows, and Home and End jump to the ends; each
 * selects and focuses its card, as in any radio group. An unknown selectedId checks the first card
 * so the group always has one tab stop.
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
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const last = options.length - 1;
    let target: number | null = null;
    if (e.key === 'ArrowRight') target = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') target = index === 0 ? last : index - 1;
    else if (e.key === 'ArrowDown') target = adjacentRowTarget(cards.current, index, 1);
    else if (e.key === 'ArrowUp') target = adjacentRowTarget(cards.current, index, -1);
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
