import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled)';

/** The dialog's Tab stops in order; an unchecked radio is skipped, as the browser does. */
function tabStops(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !(el instanceof HTMLInputElement && el.type === 'radio' && !el.checked)
  );
}

/** Moves Tab focus around inside the dialog instead of out into the page. */
function trapTab(dialog: HTMLElement, e: KeyboardEvent) {
  const stops = tabStops(dialog);
  if (stops.length === 0) return;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const active = document.activeElement;
  if (!dialog.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Modal keyboard handling, on document in the capture phase so the dialog sees every key before
 * the page's shortcuts, wherever focus is: Escape closes, Tab stays inside, and nothing reaches
 * the page.
 */
export function useDialogKeys(dialogRef: RefObject<HTMLElement>, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      } else if (e.key === 'Tab') {
        trapTab(dialog, e);
      } else if (!dialog.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [dialogRef]);
}
