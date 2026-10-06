import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { VISUALIZER_PALETTES, visualizerPaletteColors } from '../config/visualizerPalettes';
import Stage from '../components/Stage';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

const { RendererMock } = vi.hoisted(() => {
  const RendererMock = vi.fn(function (this: any, _canvases: unknown, layout: unknown) {
    this.layout = layout;
    this.setColorPalette = vi.fn();
    this.setPeakDecayRate = vi.fn();
    this.setPeakQuantization = vi.fn();
    this.resize = vi.fn();
    this.draw = vi.fn();
  });
  return { RendererMock };
});

vi.mock('../visuals/SpectrogramRenderer', () => ({ SpectrogramRenderer: RendererMock }));

function renderStage(settings = {}, renderScale = 1) {
  const data = createTestAudioData();
  const utils = render(
    withAudioData(data.value, <Stage settings={settings} renderScale={renderScale} />)
  );
  const renderer = RendererMock.mock.instances[0] as any;
  return { data, utils, renderer };
}

describe('Stage', () => {
  beforeEach(() => {
    RendererMock.mockClear();
  });

  it('renders two canvases and builds one renderer on the shared spectrum layout', () => {
    const { utils, renderer, data } = renderStage();
    expect(utils.container.querySelectorAll('canvas')).toHaveLength(2);
    expect(RendererMock).toHaveBeenCalledTimes(1);
    expect(renderer.layout).toBe(data.source.layout);
    expect(renderer.layout.bins).toBe(448);
  });

  it('applies the palette and peak settings', () => {
    const { renderer } = renderStage({
      visualizerTheme: 2,
      peakDecayRate: 0.95,
      peakQuantization: 8,
    });
    expect(renderer.setColorPalette).toHaveBeenLastCalledWith(VISUALIZER_PALETTES[2].colors);
    expect(renderer.setPeakDecayRate).toHaveBeenLastCalledWith(0.95);
    expect(renderer.setPeakQuantization).toHaveBeenLastCalledWith(8);
  });

  it('draws the mix spectrum each frame while playing, scrolled by elapsed time', () => {
    const { data, renderer } = renderStage();
    data.frameLoop.setPlaying(true);
    act(() => {
      data.scheduler.tick(0);
      data.scheduler.tick(1000 / 60);
    });
    expect(renderer.draw).toHaveBeenCalledTimes(2);
    expect(renderer.draw.mock.calls[0]).toEqual([data.source.frame.mixSpectrum, 0, 120]);
    expect(renderer.draw.mock.calls[1][1]).toBeCloseTo(1000 / 60, 9);
  });

  it('scales the scroll speed with the backing-store scale', () => {
    const { data, renderer } = renderStage({}, 0.5);
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(renderer.draw.mock.calls[0][2]).toBe(60);
  });

  it('does not draw while paused', () => {
    const { data, renderer } = renderStage();
    expect(data.scheduler.scheduled).toBe(0);
    act(() => data.scheduler.tick(0));
    expect(renderer.draw).not.toHaveBeenCalled();
  });

  it('falls back to the first palette for unknown indexes', () => {
    expect(visualizerPaletteColors(999)).toBe(VISUALIZER_PALETTES[0].colors);
  });
});
