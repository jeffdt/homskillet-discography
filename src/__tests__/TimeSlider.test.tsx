import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import TimeSlider from '../components/TimeSlider';

describe('TimeSlider', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('tracks position when mounted while already playing', () => {
    render(
      <TimeSlider
        paused={false}
        currentSongDurationMs={180000}
        getCurrentPositionMs={() => 8000}
        onChange={() => {}}
        particleEnabled={false}
      />
    );
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByText('0:08')).toBeTruthy();
    expect(screen.getByText('3:00')).toBeTruthy();
  });

  it('counts past the duration and shows infinity while looping', () => {
    render(
      <TimeSlider
        paused={false}
        currentSongDurationMs={180000}
        getCurrentPositionMs={() => 200000}
        onChange={() => {}}
        looping
        particleEnabled={false}
      />
    );
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByText('3:20')).toBeTruthy();
    expect(screen.getByText('∞')).toBeTruthy();
  });
});
