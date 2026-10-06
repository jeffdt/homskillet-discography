import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import SliderParticles from '../components/SliderParticles';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

function visibleSparks(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.SliderParticle')).filter(
    (el) => el.style.display !== 'none'
  );
}

describe('SliderParticles', () => {
  it('moves pooled sparks from the anchor each frame and clears them when spawning stops', () => {
    const data = createTestAudioData();
    data.frameLoop.setPlaying(true);
    const anchorElement = document.createElement('div');
    anchorElement.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 4, height: 4, right: 104, bottom: 54 }) as DOMRect;
    const anchor = { current: anchorElement };
    const { rerender } = render(
      withAudioData(data.value, <SliderParticles anchor={anchor} shouldSpawn spawnRate={10} />)
    );
    act(() => {
      for (let i = 0; i < 12; i++) data.scheduler.tick((i * 1000) / 60);
    });
    const sparks = visibleSparks();
    expect(sparks.length).toBeGreaterThan(0);
    expect(sparks[0].style.transform).toMatch(/^translate\(/);
    rerender(withAudioData(data.value, <SliderParticles anchor={anchor} shouldSpawn={false} />));
    expect(visibleSparks()).toHaveLength(0);
    expect(data.frameLoop.isRunning()).toBe(false);
  });
});
