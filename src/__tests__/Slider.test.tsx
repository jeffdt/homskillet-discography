import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import Slider from '../components/Slider';
import { DEFAULT_RIPPLE_SETTINGS } from '../visuals/ripples';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

describe('Slider', () => {
  it('maps a click to a fraction of the rail measured in viewport coordinates', () => {
    const onChange = vi.fn();
    const { container } = render(<Slider pos={0} onDrag={() => {}} onChange={onChange} />);
    const rail = container.querySelector('.Slider') as HTMLElement;
    // offsetLeft stays 0 in jsdom, like a slider whose positioned ancestor sits mid-page.
    rail.getBoundingClientRect = () =>
      ({ left: 400, width: 200, top: 0, right: 600, bottom: 10, height: 10 }) as DOMRect;

    fireEvent.mouseDown(rail, { clientX: 450 });
    fireEvent.mouseUp(document, { clientX: 450 });

    expect(onChange).toHaveBeenCalledWith(0.25);
  });

  it('drops its ripples while the knob is being dragged', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const data = createTestAudioData();
    data.frameLoop.setPlaying(true);
    const { container } = render(
      withAudioData(
        data.value,
        <Slider
          pos={0.5}
          onDrag={() => {}}
          onChange={() => {}}
          ripples={DEFAULT_RIPPLE_SETTINGS}
          rippling
        />
      )
    );
    const slider = container.querySelector('.Slider') as HTMLElement;
    slider.classList.add('is-rippling');
    fireEvent.mouseDown(slider, { clientX: 0 });
    expect(slider.classList.contains('is-rippling')).toBe(false);
    act(() => data.scheduler.tick(16));
    expect(data.frameLoop.isRunning()).toBe(false);
    vi.restoreAllMocks();
  });
});
