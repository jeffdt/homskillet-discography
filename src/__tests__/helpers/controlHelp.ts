import { expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

interface HelpDef {
  label: string;
  explanation?: string;
  info?: string;
}

/** Checks a control's help: an explanation shows, info opens from its "i" button, and none means no button. */
export function expectControlHelp(def: HelpDef) {
  const button = screen.queryByRole('button', { name: `About ${def.label}` });
  if (def.explanation) {
    expect(screen.getByText(def.explanation).hidden).toBe(false);
    expect(button).toBeNull();
  } else if (def.info) {
    const text = screen.getByText(def.info);
    expect(text.hidden).toBe(true);
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(button!.getAttribute('aria-expanded')).toBe('true');
    expect(text.hidden).toBe(false);
  } else {
    expect(button).toBeNull();
  }
}

/** Help text must be plain and short, with no em dashes. */
export function expectPlainHelp(def: HelpDef) {
  expect(def.explanation && def.info).toBeFalsy();
  [def.explanation, def.info].forEach((text) => {
    if (text === undefined) return;
    expect(text.length).toBeGreaterThan(10);
    expect(text).not.toMatch(new RegExp(String.fromCharCode(0x2014)));
  });
}
