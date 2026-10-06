import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import TimeSlider from '../components/TimeSlider';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

function renderSlider(position: { ms: number }, props: { looping?: boolean } = {}) {
  const data = createTestAudioData();
  const utils = render(
    withAudioData(
      data.value,
      <TimeSlider
        paused={false}
        currentSongDurationMs={180000}
        getCurrentPositionMs={() => position.ms}
        onChange={() => {}}
        particleEnabled={false}
        {...props}
      />
    )
  );
  return { data, utils };
}

describe('TimeSlider', () => {
  it('shows the position as soon as it mounts', () => {
    renderSlider({ ms: 8000 });
    expect(screen.getByText('0:08')).toBeTruthy();
    expect(screen.getByText('3:00')).toBeTruthy();
  });

  it('moves the elapsed time and knob on each frame while playing', () => {
    const position = { ms: 8000 };
    const { data, utils } = renderSlider(position);
    data.frameLoop.setPlaying(true);
    position.ms = 90000;
    act(() => data.scheduler.tick(0));
    expect(screen.getByText('1:30')).toBeTruthy();
    const knob = utils.container.querySelector('.Slider-knob') as HTMLElement;
    expect(knob.style.left).toBe('50%');
  });

  it('stays still while the frame loop is paused', () => {
    const position = { ms: 8000 };
    const { data } = renderSlider(position);
    position.ms = 90000;
    act(() => data.scheduler.tick(0));
    expect(data.scheduler.scheduled).toBe(0);
    expect(screen.getByText('0:08')).toBeTruthy();
  });

  it('counts past the duration and shows infinity while looping', () => {
    renderSlider({ ms: 200000 }, { looping: true });
    expect(screen.getByText('3:20')).toBeTruthy();
    expect(screen.getByText('∞')).toBeTruthy();
  });

  it('leaves the frame loop when it unmounts', () => {
    const { data, utils } = renderSlider({ ms: 8000 });
    data.frameLoop.setPlaying(true);
    expect(data.frameLoop.isRunning()).toBe(true);
    utils.unmount();
    expect(data.frameLoop.isRunning()).toBe(false);
  });
});
