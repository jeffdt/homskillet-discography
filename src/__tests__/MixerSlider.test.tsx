import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MixerSlider from '../components/mixer/MixerSlider';
import { MIXER_SLIDERS } from '../components/mixer/mixerControls';

const BASS = MIXER_SLIDERS[1];

function renderSlider(props: Partial<React.ComponentProps<typeof MixerSlider>> = {}) {
  const onChange = vi.fn();
  render(<MixerSlider def={BASS} value={0.5} onChange={onChange} {...props} />);
  return { onChange };
}

describe('MixerSlider', () => {
  it('labels the slider, shows its value and its explanation', () => {
    renderSlider();
    const input = screen.getByLabelText('Bass boost') as HTMLInputElement;
    expect(input.type).toBe('range');
    expect(input.value).toBe('0.5');
    expect([input.min, input.max, input.step]).toEqual(['0', '2', '0.01']);
    expect(screen.getByText('50%')).toBeTruthy();
    const explanation = screen.getByText(BASS.explanation);
    expect(input.getAttribute('aria-describedby')).toBe(explanation.id);
  });

  it('reports new values as numbers', () => {
    const { onChange } = renderSlider();
    fireEvent.change(screen.getByLabelText('Bass boost'), { target: { value: '1.2' } });
    expect(onChange).toHaveBeenCalledWith(1.2);
  });

  it('has no pin button', () => {
    renderSlider();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
