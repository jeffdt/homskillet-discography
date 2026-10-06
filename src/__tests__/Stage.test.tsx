import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { VoiceInfo } from '../audio/data/contract';
import Stage from '../components/Stage';
import { channelPaletteById } from '../config/channelPalettes';
import { channelColors } from '../visuals/channelColors';
import { parseHexColor } from '../visuals/color';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

const { RendererMock } = vi.hoisted(() => {
  const RendererMock = vi.fn(function (
    this: any,
    _canvases: unknown,
    layout: unknown,
    shades: unknown
  ) {
    this.layout = layout;
    this.shades = shades;
    this.setPeakDecayRate = vi.fn();
    this.setPeakQuantization = vi.fn();
    this.resize = vi.fn();
    this.draw = vi.fn();
  });
  return { RendererMock };
});

vi.mock('../visuals/SpectrogramRenderer', () => ({ SpectrogramRenderer: RendererMock }));

const CHROMATIC = channelPaletteById('chromatic').channels;

function voice(index: number, name: string, audible = true): VoiceInfo {
  return { index, name, chip: '2A03', muted: !audible, soloed: false, audible };
}

function renderStage(settings = {}, renderScale = 1) {
  const data = createTestAudioData();
  const utils = render(
    withAudioData(data.value, <Stage settings={settings} renderScale={renderScale} />)
  );
  const renderer = RendererMock.mock.instances[0] as any;
  return { data, utils, renderer };
}

/** Gives the listed voices equal energy at bin 50. */
function sound(data: ReturnType<typeof createTestAudioData>, voices: number[]): void {
  const frame = data.source.frame;
  frame.voiceCount = Math.max(...voices) + 1;
  voices.forEach((v) => {
    frame.voices[v].rms = 0.5;
    frame.voices[v].spectrum[50] = 1;
  });
  frame.mixSpectrum[50] = 1;
}

/** Bin 50's color in the last draw call, rounded. */
function bin50(renderer: any): number[] {
  const calls = renderer.draw.mock.calls;
  const colors: Float32Array = calls[calls.length - 1][1];
  return Array.from(colors.subarray(150, 153)).map(Math.round);
}

describe('Stage', () => {
  beforeEach(() => {
    RendererMock.mockClear();
    channelColors.set(CHROMATIC);
  });

  afterEach(() => {
    channelColors.set(CHROMATIC);
  });

  it('renders two canvases and builds one renderer on the shared spectrum layout', () => {
    const { utils, renderer, data } = renderStage();
    expect(utils.container.querySelectorAll('canvas')).toHaveLength(2);
    expect(RendererMock).toHaveBeenCalledTimes(1);
    expect(renderer.layout).toBe(data.source.layout);
    expect(renderer.shades.background).toEqual([16, 16, 16]);
  });

  it('applies the peak settings', () => {
    const { renderer } = renderStage({ peakDecayRate: 0.95, peakQuantization: 8 });
    expect(renderer.setPeakDecayRate).toHaveBeenLastCalledWith(0.95);
    expect(renderer.setPeakQuantization).toHaveBeenLastCalledWith(8);
  });

  it('draws the mix spectrum with per-bin channel colors while playing', () => {
    const { data, renderer } = renderStage();
    act(() => data.source.setVoices([voice(0, 'Square 1'), voice(1, 'Square 2')]));
    sound(data, [0]);
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    const [spectrum, colors, dtMs, speed] = renderer.draw.mock.calls[0];
    expect(spectrum).toBe(data.source.frame.mixSpectrum);
    expect(colors).toHaveLength(data.source.layout.bins * 3);
    expect(dtMs).toBe(0);
    expect(speed).toBe(120);
    expect(bin50(renderer)).toEqual([...parseHexColor(CHROMATIC[0])!]);
  });

  it("drops a muted voice's color from the bins it shares", () => {
    const { data, renderer } = renderStage();
    act(() => data.source.setVoices([voice(0, 'Square 1', false), voice(1, 'Square 2')]));
    sound(data, [0, 1]);
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(bin50(renderer)).toEqual([...parseHexColor(CHROMATIC[1])!]);
  });

  it('moves to a new palette while playing', () => {
    const { data, renderer } = renderStage();
    act(() => data.source.setVoices([voice(0, 'Square 1')]));
    sound(data, [0]);
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    const gameBoy = channelPaletteById('game-boy').channels;
    act(() => channelColors.set(gameBoy));
    act(() => {
      for (let i = 1; i <= 30; i++) data.scheduler.tick((i * 1000) / 60);
    });
    expect(bin50(renderer)).toEqual([...parseHexColor(gameBoy[0])!]);
  });

  it('scales the scroll speed with the backing-store scale', () => {
    const { data, renderer } = renderStage({}, 0.5);
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(renderer.draw.mock.calls[0][3]).toBe(60);
  });

  it('does not draw while paused', () => {
    const { data, renderer } = renderStage();
    expect(data.scheduler.scheduled).toBe(0);
    act(() => data.scheduler.tick(0));
    expect(renderer.draw).not.toHaveBeenCalled();
  });
});
