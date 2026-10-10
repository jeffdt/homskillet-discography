import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { VoiceInfo } from '../audio/data/contract';
import Stage from '../components/Stage';
import { channelPaletteById } from '../config/channelPalettes';
import { SCOPE_DEFAULTS, SCOPE_PRESETS } from '../config/stageSettings';
import { UI_PALETTES } from '../config/uiPalettes';
import { channelColors } from '../visuals/channelColors';
import { spectrumGradientById } from '../config/spectrumGradients';
import { parseHexColor, unpackPixel } from '../visuals/color';
import { SHADE_KNEE } from '../visuals/spectrogramMath';
import { AdditivePainter, AveragePainter, GradientPainter } from '../visuals/spectrumPainters';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

const { RendererMock, ScopeRendererMock } = vi.hoisted(() => {
  const RendererMock = vi.fn(function (this: any, _canvases: unknown, layout: unknown) {
    this.layout = layout;
    this.setPeakDecayRate = vi.fn();
    this.setPeakQuantization = vi.fn();
    this.resize = vi.fn();
    this.draw = vi.fn();
  });
  const ScopeRendererMock = vi.fn(function (
    this: any,
    canvas: unknown,
    bloomCanvas: unknown,
    renderScale: unknown,
    coreColor: unknown
  ) {
    this.canvas = canvas;
    this.bloomCanvas = bloomCanvas;
    this.renderScale = renderScale;
    this.coreColor = coreColor;
    this.setColors = vi.fn();
    this.setVoices = vi.fn();
    this.setSpan = vi.fn();
    this.setAutoGain = vi.fn();
    this.setLayout = vi.fn();
    this.setEffects = vi.fn();
    this.setMotion = vi.fn();
    this.resize = vi.fn();
    this.clear = vi.fn();
    this.draw = vi.fn();
  });
  return { RendererMock, ScopeRendererMock };
});

vi.mock('../visuals/SpectrogramRenderer', () => ({ SpectrogramRenderer: RendererMock }));
vi.mock('../visuals/ScopeRenderer', () => ({ ScopeRenderer: ScopeRendererMock }));

/** The most recently built scope renderer. */
function latestScope(): any {
  const instances = ScopeRendererMock.mock.instances;
  return instances[instances.length - 1];
}

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

/** Bin 50's pure channel color (value index at the shade knee) from the last draw's painter. */
function bin50(renderer: any): number[] {
  const calls = renderer.draw.mock.calls;
  const painter = calls[calls.length - 1][1];
  return unpackPixel(painter.pixel(50, SHADE_KNEE)).slice(0, 3);
}

describe('Stage', () => {
  beforeEach(() => {
    RendererMock.mockClear();
    ScopeRendererMock.mockClear();
    channelColors.set(CHROMATIC);
  });

  afterEach(() => {
    channelColors.set(CHROMATIC);
  });

  it('renders four canvases and builds one renderer on the shared spectrum layout', () => {
    const { utils, renderer, data } = renderStage();
    expect(utils.container.querySelectorAll('canvas')).toHaveLength(4);
    expect(RendererMock).toHaveBeenCalledTimes(1);
    expect(renderer.layout).toBe(data.source.layout);
  });

  it('colors the spectrum by adding channel light by default', () => {
    const { data, renderer } = renderStage();
    act(() => data.source.setVoices([voice(0, 'Square 1')]));
    sound(data, [0]);
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    const painter = renderer.draw.mock.calls[0][1];
    expect(painter).toBeInstanceOf(AdditivePainter);
    expect(unpackPixel(painter.pixel(50, 0)).slice(0, 3)).not.toEqual([16, 16, 16]);
  });

  it('colors the spectrum from the chosen gradient in the unified coloring', () => {
    const { data, renderer, utils } = renderStage({
      spectrumColoring: 'unified',
      spectrumGradient: 'bz-negative',
    });
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    const painter = renderer.draw.mock.calls[0][1];
    expect(painter).toBeInstanceOf(GradientPainter);
    expect(unpackPixel(painter.pixel(0, 0)).slice(0, 3)).toEqual([224, 224, 224]);
    utils.rerender(
      withAudioData(
        data.value,
        <Stage
          settings={{ spectrumColoring: 'unified', spectrumGradient: 'midnight' }}
          renderScale={1}
        />
      )
    );
    act(() => data.scheduler.tick(1000 / 60));
    const after = renderer.draw.mock.calls[renderer.draw.mock.calls.length - 1][1];
    expect(unpackPixel(after.pixel(0, 0)).slice(0, 3)).toEqual([2, 0, 36]);
    expect(spectrumGradientById('midnight').stops[0]).toBe('#020024');
  });

  it('falls back to adding light for an unknown coloring', () => {
    const { data, renderer } = renderStage({ spectrumColoring: 'rainbow' });
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(renderer.draw.mock.calls[0][1]).toBeInstanceOf(AdditivePainter);
  });

  it('applies the peak settings', () => {
    const { renderer } = renderStage({ peakDecayRate: 0.95, peakQuantization: 8 });
    expect(renderer.setPeakDecayRate).toHaveBeenLastCalledWith(0.95);
    expect(renderer.setPeakQuantization).toHaveBeenLastCalledWith(8);
  });

  it('draws the mix spectrum with per-bin channel colors while playing', () => {
    const { data, renderer } = renderStage({ spectrumColoring: 'average' });
    act(() => data.source.setVoices([voice(0, 'Square 1'), voice(1, 'Square 2')]));
    sound(data, [0]);
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    const [spectrum, painter, dtMs, speed] = renderer.draw.mock.calls[0];
    expect(spectrum).toBe(data.source.frame.mixSpectrum);
    expect(painter).toBeInstanceOf(AveragePainter);
    expect(dtMs).toBe(0);
    expect(speed).toBe(120);
    expect(bin50(renderer)).toEqual([...parseHexColor(CHROMATIC[0])!]);
  });

  it("drops a muted voice's color from the bins it shares", () => {
    const { data, renderer } = renderStage({ spectrumColoring: 'average' });
    act(() => data.source.setVoices([voice(0, 'Square 1', false), voice(1, 'Square 2')]));
    sound(data, [0, 1]);
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(bin50(renderer)).toEqual([...parseHexColor(CHROMATIC[1])!]);
  });

  it('moves to a new palette while playing', () => {
    const { data, renderer } = renderStage({ spectrumColoring: 'average' });
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

  it('turns scope auto gain on by default and off when the setting says so', () => {
    renderStage({ visualizerStyle: 'scopes' });
    expect(latestScope().setAutoGain).toHaveBeenLastCalledWith(true);
    cleanup();
    renderStage({ visualizerStyle: 'scopes', scopeAutoGain: false });
    expect(latestScope().setAutoGain).toHaveBeenLastCalledWith(false);
  });

  it('draws channel scopes instead of the spectrum in the scopes style', () => {
    const { data, utils, renderer } = renderStage({
      visualizerStyle: 'scopes',
      scopeSpan: 256,
      scopeColoring: 'channel',
    });
    const voices = [voice(0, 'Square 1'), voice(2, 'Triangle', false)];
    act(() => data.source.setVoices(voices));
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    const scope = latestScope();
    expect(scope.draw).toHaveBeenCalledWith(data.source.frame, 0);
    expect(renderer.draw).not.toHaveBeenCalled();
    expect(scope.setSpan).toHaveBeenLastCalledWith(256);
    expect(scope.setVoices).toHaveBeenLastCalledWith(voices);
    expect(scope.setColors).toHaveBeenLastCalledWith(CHROMATIC);
    expect(scope.renderScale).toBe(1);
    expect(scope.bloomCanvas).toBe(utils.container.querySelector('.Stage-scopeBloom'));
    expect(utils.container.querySelector('.Stage')!.getAttribute('data-style')).toBe('scopes');
  });

  it('labels each scope lane with its channel and ghosts the silent ones', () => {
    const { data, utils } = renderStage({ visualizerStyle: 'scopes' });
    act(() => data.source.setVoices([voice(0, 'Square 1'), voice(2, 'Triangle', false)]));
    const square = utils.getByText('Square 1');
    const triangle = utils.getByText('Triangle');
    expect(square.getAttribute('data-channel')).toBe('0');
    expect(square.style.top).toBe('0%');
    expect(square.className).not.toContain('is-silent');
    expect(triangle.getAttribute('data-channel')).toBe('2');
    expect(triangle.style.top).toBe('50%');
    expect(triangle.className).toContain('is-silent');
  });

  it('shows no lane labels and draws the spectrum in the spectrum style', () => {
    const { data, utils, renderer } = renderStage();
    act(() => data.source.setVoices([voice(0, 'Square 1')]));
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(utils.queryByText('Square 1')).toBeNull();
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(latestScope().draw).not.toHaveBeenCalled();
    expect(utils.container.querySelector('.Stage')!.getAttribute('data-style')).toBe('spectrum');
  });

  it('falls back to the spectrum for an unknown style', () => {
    const { data, utils, renderer } = renderStage({ visualizerStyle: 'milkdrop' });
    data.frameLoop.setPlaying(true);
    act(() => data.scheduler.tick(0));
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(utils.container.querySelector('.Stage')!.getAttribute('data-style')).toBe('spectrum');
  });

  it('clears the spectrogram when switching back to it', () => {
    const { data, utils, renderer } = renderStage({ visualizerStyle: 'scopes' });
    const before = renderer.resize.mock.calls.length;
    utils.rerender(
      withAudioData(
        data.value,
        <Stage settings={{ visualizerStyle: 'spectrum' }} renderScale={1} />
      )
    );
    expect(renderer.resize.mock.calls.length).toBeGreaterThan(before);
  });

  it('passes the render scale to the scope renderer', () => {
    renderStage({ visualizerStyle: 'scopes' }, 0.5);
    expect(latestScope().renderScale).toBe(0.5);
  });

  it('starts the scopes as Green CRT in the accent color', () => {
    const { utils } = renderStage({ visualizerStyle: 'scopes' });
    const scope = latestScope();
    expect(scope.setColors).toHaveBeenLastCalledWith(new Array(8).fill(UI_PALETTES[0].accent));
    expect(scope.setLayout).toHaveBeenLastCalledWith('stacked');
    expect(scope.setEffects).toHaveBeenLastCalledWith({
      trails: SCOPE_DEFAULTS.scopeTrails,
      glow: SCOPE_DEFAULTS.scopeGlow,
      bloom: SCOPE_DEFAULTS.scopeBloom,
      reactivity: SCOPE_DEFAULTS.scopeReactivity,
      lineWidth: SCOPE_DEFAULTS.scopeLineWidth,
      core: true,
      fill: false,
    });
    expect(utils.container.querySelector('.Stage-crt')).not.toBeNull();
    expect(utils.container.querySelector('.Stage')!.getAttribute('data-scope-coloring')).toBe(
      'unified'
    );
  });

  it('recolors unified traces when the accent changes', () => {
    const { data, utils } = renderStage({ visualizerStyle: 'scopes', uiPalette: 0 });
    utils.rerender(
      withAudioData(
        data.value,
        <Stage settings={{ visualizerStyle: 'scopes', uiPalette: 2 }} renderScale={1} />
      )
    );
    expect(latestScope().setColors).toHaveBeenLastCalledWith(
      new Array(8).fill(UI_PALETTES[2].accent)
    );
  });

  it('applies a preset\u2019s layout and effects, and drops the CRT overlay when off', () => {
    const halo = SCOPE_PRESETS.find((p) => p.id === 'halo')!.settings;
    const { utils } = renderStage({ visualizerStyle: 'scopes', ...halo });
    const scope = latestScope();
    expect(scope.setLayout).toHaveBeenLastCalledWith('rings');
    expect(scope.setSpan).toHaveBeenLastCalledWith(768);
    expect(scope.setColors).toHaveBeenLastCalledWith(CHROMATIC);
    const lastEffects = scope.setEffects.mock.calls[scope.setEffects.mock.calls.length - 1][0];
    expect(lastEffects).toMatchObject({ glow: 0.5, bloom: 0.4 });
    expect(utils.container.querySelector('.Stage-crt')).toBeNull();
    const bloom = utils.container.querySelector('.Stage-scopeBloom') as HTMLCanvasElement;
    expect(bloom.style.opacity).toBe('0.4');
  });

  it('hides the bloom layer in low power and the CRT overlay outside the scopes', () => {
    const low = renderStage({ visualizerStyle: 'scopes' }, 0.5);
    expect(
      (low.utils.container.querySelector('.Stage-scopeBloom') as HTMLCanvasElement).style.opacity
    ).toBe('0');
    low.utils.unmount();
    const spectrum = renderStage({ visualizerStyle: 'spectrum', scopeCrt: true });
    expect(spectrum.utils.container.querySelector('.Stage-crt')).toBeNull();
  });

  it('stops the rings turning under reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    try {
      renderStage({ visualizerStyle: 'scopes' });
      expect(latestScope().setMotion).toHaveBeenLastCalledWith(false);
    } finally {
      window.matchMedia = original;
    }
  });

  it('labels lanes only in stacked and phase layouts', () => {
    const voices = [voice(0, 'Square 1'), voice(1, 'Square 2'), voice(2, 'Triangle')];
    const rings = renderStage({ visualizerStyle: 'scopes', scopeLayout: 'rings' });
    act(() => rings.data.source.setVoices(voices));
    expect(rings.utils.queryByText('Square 1')).toBeNull();
    rings.utils.unmount();
    const phase = renderStage({ visualizerStyle: 'scopes', scopeLayout: 'phase' });
    act(() => phase.data.source.setVoices(voices));
    // jsdom has no layout size, so the grid is one column: lane 2 sits in row 3 of 3.
    const triangle = phase.utils.getByText('Triangle');
    expect(triangle.style.top).toBe(`${(2 / 3) * 100}%`);
    expect(triangle.style.right).toBe('0%');
  });
});
