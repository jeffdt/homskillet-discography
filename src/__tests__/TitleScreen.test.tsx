import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TitleScreen from '../components/TitleScreen';

function renderTitle(props: Partial<React.ComponentProps<typeof TitleScreen>> = {}) {
  const onStart = vi.fn();
  const onBrowse = vi.fn();
  const utils = render(
    <TitleScreen
      ready
      tagline="NES music by Homskillet"
      albumCount={7}
      sharedTrack={null}
      onStart={onStart}
      onBrowse={onBrowse}
      {...props}
    />
  );
  return { ...utils, onStart, onBrowse };
}

describe('TitleScreen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('offers one primary action and a browse link', () => {
    const { onStart, onBrowse } = renderTitle();
    expect(screen.getByText('HOMSKILLET')).toBeTruthy();
    expect(screen.getByText('NES music by Homskillet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /start listening/i }));
    fireEvent.click(screen.getByRole('button', { name: 'or browse 7 albums' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });

  it('plays exactly once even when clicked twice', () => {
    const { onStart } = renderTitle();
    const button = screen.getByRole('button', { name: /start listening/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows a loading state when pressed early, then starts once ready', () => {
    const { onStart, rerender, onBrowse } = renderTitle({ ready: false });
    fireEvent.click(screen.getByRole('button', { name: /start listening/i }));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Loading…' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Loading…' }));
    rerender(
      <TitleScreen
        ready
        tagline="t"
        albumCount={7}
        sharedTrack={null}
        onStart={onStart}
        onBrowse={onBrowse}
      />
    );
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('names the shared track on the primary button', () => {
    renderTitle({ sharedTrack: { title: 'Groove', albumTitle: 'Bazaar' } });
    expect(screen.getByRole('button', { name: '▶ Play Groove' })).toBeTruthy();
    expect(screen.getByText('Groove · Bazaar')).toBeTruthy();
  });

  it('words the browse link without a count before the catalog loads', () => {
    renderTitle({ albumCount: 0 });
    expect(screen.getByRole('button', { name: 'or browse albums' })).toBeTruthy();
  });
});
