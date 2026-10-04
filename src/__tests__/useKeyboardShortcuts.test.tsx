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

  it('skips repeats of toggle keys and already prevented events', () => {
    const togglePause = vi.fn();
    const seekForward = vi.fn();
    render(<Harness handlers={{ togglePause, seekForward }} />);
    fireEvent.keyDown(document.body, { key: ' ', repeat: true });
    fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true, repeat: true });
    expect(togglePause).not.toHaveBeenCalled();
    expect(seekForward).toHaveBeenCalledTimes(1);

    const handled = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    document.body.addEventListener('keydown', (ev) => ev.preventDefault(), { once: true });
    document.body.dispatchEvent(handled);
    expect(togglePause).not.toHaveBeenCalled();
  });

  it('ignores composing keys and role=slider arrows', () => {
    const nextTrack = vi.fn();
    const closeTopmost = vi.fn();
    const { container } = render(
      <>
        <Harness handlers={{ nextTrack, closeTopmost }} />
        <div role="slider" tabIndex={0} data-testid="s" />
      </>
    );
    fireEvent.keyDown(document.body, { key: 'Escape', isComposing: true });
    fireEvent.keyDown(container.querySelector('[role=slider]') as Element, { key: 'ArrowRight' });
    expect(closeTopmost).not.toHaveBeenCalled();
    expect(nextTrack).not.toHaveBeenCalled();
  });
});
