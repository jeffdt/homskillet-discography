import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { ShortcutHandlers, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

function Harness({ handlers }: { handlers: ShortcutHandlers }) {
  useKeyboardShortcuts(handlers);
  return <input aria-label="search" type="text" />;
}

describe('useKeyboardShortcuts', () => {
  it('dispatches actions and prevents the default browser behavior', () => {
    const togglePause = vi.fn();
    render(<Harness handlers={{ togglePause }} />);
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(togglePause).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not prevent default when a handler returns false', () => {
    render(<Harness handlers={{ closeTopmost: () => false }} />);
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores keys typed into a text input', () => {
    const toggleAlbums = vi.fn();
    const { getByLabelText } = render(<Harness handlers={{ toggleAlbums }} />);
    fireEvent.keyDown(getByLabelText('search'), { key: 'a' });
    expect(toggleAlbums).not.toHaveBeenCalled();
  });

  it('always calls the latest handlers', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Harness handlers={{ nextTrack: first }} />);
    rerender(<Harness handlers={{ nextTrack: second }} />);
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
