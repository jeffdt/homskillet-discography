import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { visualizerPaletteColors, VISUALIZER_PALETTES } from '../config/visualizerPalettes';

import Stage from '../components/Stage';

const { SpectrogramMock } = vi.hoisted(() => {
  const SpectrogramMock = vi.fn(function (
    this: any,
    _core: unknown,
    _ctx: unknown,
    _node: unknown,
    freqCanvas: HTMLCanvasElement
  ) {
    this.binsAtConstruction = freqCanvas.width;
    this.setWeighting = vi.fn();
    this.setSpeed = vi.fn();
    this.setColorPalette = vi.fn();
    this.setPeakDecayRate = vi.fn();
    this.setPeakQuantization = vi.fn();
    this.setHorizontal = vi.fn();
    this.setPaused = vi.fn();
  });
  return { SpectrogramMock };
});

vi.mock('../Spectrogram', () => ({
  default: SpectrogramMock,
  DEFAULT_COLOR_PALETTE: ['#101010', '#202020'],
}));

const graph = { audioCtx: {} as AudioContext, sourceNode: {} as AudioNode, chipCore: {} };

describe('Stage', () => {
  beforeEach(() => {
    SpectrogramMock.mockClear();
  });

  it('renders canvases without an audio graph', () => {
    const { container } = render(<Stage audioGraph={null} paused settings={{}} renderScale={1} />);
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(SpectrogramMock).not.toHaveBeenCalled();
  });

  it('builds the spectrogram at full CQT width, then switches to horizontal layout', () => {
    render(
      <Stage
        audioGraph={graph}
        paused={false}
        settings={{ visualizerTheme: 2, peakDecayRate: 0.95 }}
        renderScale={1}
      />
    );
    const instance = SpectrogramMock.mock.instances[0] as any;
    expect(instance.binsAtConstruction).toBe(448);
    expect(instance.setHorizontal).toHaveBeenCalledWith(true);
    expect(instance.setColorPalette).toHaveBeenLastCalledWith(VISUALIZER_PALETTES[2].colors);
    expect(instance.setPeakDecayRate).toHaveBeenLastCalledWith(0.95);
    expect(instance.setPaused).toHaveBeenLastCalledWith(false);
  });

  it('falls back to the first palette for unknown indexes', () => {
    expect(visualizerPaletteColors(999)).toBe(VISUALIZER_PALETTES[0].colors);
  });
});
