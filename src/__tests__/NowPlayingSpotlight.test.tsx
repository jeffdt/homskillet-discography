import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import NowPlayingSpotlight from '../components/NowPlayingSpotlight';

describe('NowPlayingSpotlight', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const visible = (container: HTMLElement) =>
    container.querySelector('.Spotlight')!.classList.contains('is-visible');

  it('shows on track change for 4 seconds', () => {
    const { container, rerender } = render(
      <NowPlayingSpotlight trackId="A/a.nsf" title="A" albumTitle="Album" blurb={null} />
    );
    expect(visible(container)).toBe(true);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(visible(container)).toBe(false);

    rerender(
      <NowPlayingSpotlight trackId="A/b.nsf" title="B" albumTitle="Album" blurb="Why I wrote it." />
    );
    expect(visible(container)).toBe(true);
    expect(container.textContent).toContain('Why I wrote it.');
  });

  it('hides blurb markup when there is no blurb', () => {
    const { container } = render(
      <NowPlayingSpotlight trackId="A/a.nsf" title="A" albumTitle="Album" blurb={null} />
    );
    expect(container.querySelector('.Spotlight-blurb')).toBeNull();
  });
});
