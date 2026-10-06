import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import LevelIndicator from '../components/LevelIndicator';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

describe('LevelIndicator', () => {
  it('follows the audio pulse while active and rests at 0 otherwise', () => {
    const data = createTestAudioData();
    data.source.frame.mixSpectrum.fill(0.4);
    data.frameLoop.setPlaying(true);
    const { container, rerender } = render(withAudioData(data.value, <LevelIndicator active />));
    act(() => {
      for (let i = 0; i < 30; i++) data.scheduler.tick((i * 1000) / 60);
    });
    const bars = container.querySelector('.LevelIndicator') as HTMLElement;
    expect(Number(bars.style.getPropertyValue('--level'))).toBeGreaterThan(0.9);
    rerender(withAudioData(data.value, <LevelIndicator active={false} />));
    expect(bars.style.getPropertyValue('--level')).toBe('0');
  });
});
