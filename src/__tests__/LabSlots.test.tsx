import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VisualizerPaletteSettings from '../components/VisualizerPaletteSettings';
import { VISUALIZER_PALETTES } from '../config/visualizerPalettes';

describe('interim lab slots', () => {
  it('palette picker selects by index', () => {
    const onSelect = vi.fn();
    render(<VisualizerPaletteSettings selected={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(VISUALIZER_PALETTES[3].label));
    expect(onSelect).toHaveBeenCalledWith(3);
    expect(
      screen.getByText(VISUALIZER_PALETTES[0].label).closest('button')!.getAttribute('aria-pressed')
    ).toBe('true');
  });
});
