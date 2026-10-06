import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StageSlider from '../components/stage/StageSlider';
import StageToggle from '../components/stage/StageToggle';
import SwatchPicker from '../components/stage/SwatchPicker';
import { PEAK_QUANTIZATION, SPARK_LIFESPAN } from '../components/stage/stageControls';

describe('StageSlider', () => {
  it('labels the slider and shows its formatted value and explanation', () => {
    render(<StageSlider def={SPARK_LIFESPAN} value={600} onChange={() => {}} />);
    const input = screen.getByLabelText('Lifespan') as HTMLInputElement;
    expect(input.type).toBe('range');
    expect(input.value).toBe('600');
    expect([input.min, input.max, input.step]).toEqual(['200', '2400', '200']);
    expect(input.getAttribute('aria-valuetext')).toBe('0.6 s');
    expect(screen.getByText('0.6 s')).toBeTruthy();
    const explanation = screen.getByText(SPARK_LIFESPAN.explanation);
    expect(input.getAttribute('aria-describedby')).toBe(explanation.id);
  });

  it('shows slider positions and reports stored values', () => {
    const onChange = vi.fn();
    render(<StageSlider def={PEAK_QUANTIZATION} value={4} onChange={onChange} />);
    const input = screen.getByLabelText('Peak quantization') as HTMLInputElement;
    expect(input.value).toBe('2');
    expect(screen.getByText('Medium')).toBeTruthy();
    fireEvent.change(input, { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('can be disabled', () => {
    render(<StageSlider def={SPARK_LIFESPAN} value={600} disabled onChange={() => {}} />);
    expect((screen.getByLabelText('Lifespan') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('StageToggle', () => {
  it('is a labeled switch with its explanation', () => {
    const onChange = vi.fn();
    render(
      <StageToggle
        id="demo"
        label="Demo"
        explanation="Turns the demo on."
        checked
        onChange={onChange}
      />
    );
    const toggle = screen.getByRole('switch', { name: 'Demo' }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(toggle.getAttribute('aria-describedby')).toBe(screen.getByText('Turns the demo on.').id);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('can be disabled', () => {
    render(
      <StageToggle
        id="demo"
        label="Demo"
        explanation="x"
        checked={false}
        disabled
        onChange={() => {}}
      />
    );
    expect((screen.getByRole('switch', { name: 'Demo' }) as HTMLInputElement).disabled).toBe(true);
  });
});

const OPTIONS = [
  { id: 'a', label: 'Alpha', colors: ['#111111', '#222222'] },
  { id: 'b', label: 'Bravo', colors: ['#333333'] },
  { id: 'c', label: 'Charlie' },
];

function renderPicker(selectedId = 'a') {
  const onSelect = vi.fn();
  render(
    <SwatchPicker label="Things" options={OPTIONS} selectedId={selectedId} onSelect={onSelect} />
  );
  const radios = screen.getAllByRole('radio');
  return { onSelect, radios };
}

describe('SwatchPicker', () => {
  it('is a named radio group with one checked, tabbable card', () => {
    const { radios } = renderPicker('b');
    expect(screen.getByRole('radiogroup', { name: 'Things' })).toBeTruthy();
    expect(radios.map((r) => r.textContent)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false']);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('draws one swatch pixel per color', () => {
    const { radios } = renderPicker();
    expect(radios[0].querySelectorAll('.SwatchPicker-pixel')).toHaveLength(2);
    expect(radios[2].querySelector('.SwatchPicker-swatch')).toBeNull();
  });

  it('selects on click', () => {
    const { onSelect, radios } = renderPicker();
    fireEvent.click(radios[2]);
    expect(onSelect).toHaveBeenCalledWith('c');
  });

  it('moves selection and focus with the arrow keys, wrapping at the ends', () => {
    const { onSelect, radios } = renderPicker('a');
    radios[0].focus();
    expect(fireEvent.keyDown(radios[0], { key: 'ArrowRight' })).toBe(false);
    expect(onSelect).toHaveBeenLastCalledWith('b');
    expect(document.activeElement).toBe(radios[1]);
    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenLastCalledWith('c');
    expect(document.activeElement).toBe(radios[2]);
    fireEvent.keyDown(radios[2], { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith('a');
    fireEvent.keyDown(radios[1], { key: 'ArrowUp' });
    expect(onSelect).toHaveBeenLastCalledWith('a');
  });

  it('leaves arrow keys with Ctrl, Meta or Alt to the browser', () => {
    const { onSelect, radios } = renderPicker('b');
    expect(fireEvent.keyDown(radios[1], { key: 'ArrowRight', metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(radios[1], { key: 'ArrowLeft', altKey: true })).toBe(true);
    expect(fireEvent.keyDown(radios[1], { key: 'ArrowRight', ctrlKey: true })).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(radios[1], { key: 'ArrowRight' })).toBe(false);
    expect(onSelect).toHaveBeenCalledWith('c');
  });

  it('jumps to the first and last card with Home and End and ignores other keys', () => {
    const { onSelect, radios } = renderPicker('b');
    fireEvent.keyDown(radios[1], { key: 'End' });
    expect(onSelect).toHaveBeenLastCalledWith('c');
    fireEvent.keyDown(radios[1], { key: 'Home' });
    expect(onSelect).toHaveBeenLastCalledWith('a');
    onSelect.mockClear();
    expect(fireEvent.keyDown(radios[1], { key: 'x' })).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('checks the first card when the selected id is unknown', () => {
    const { radios } = renderPicker('zzz');
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[0].tabIndex).toBe(0);
  });
});
