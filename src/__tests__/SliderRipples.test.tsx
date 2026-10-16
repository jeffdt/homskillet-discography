import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import SliderRipples from '../components/SliderRipples';
import { DEFAULT_RIPPLE_SETTINGS, RippleSettings } from '../visuals/ripples';
import { createTestAudioData, withAudioData } from './helpers/audioDataHarness';

const FRAME_MS = 1000 / 60;

/** A canvas context that records the calls the ripple drawing makes. */
function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 0,
    lineCap: '',
    strokeStyle: '',
  };
}

function sizedDiv(width: number): HTMLDivElement {
  const div = document.createElement('div');
  Object.defineProperty(div, 'offsetWidth', { value: width });
  Object.defineProperty(div, 'clientWidth', { value: width });
  return div;
}

function setup(settings: RippleSettings | null = DEFAULT_RIPPLE_SETTINGS, active = true) {
  const ctx = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D
  );
  const data = createTestAudioData();
  data.frameLoop.setPlaying(true);
  const host = { current: sizedDiv(300) };
  const fill = { current: sizedDiv(200) };
  const ui = (s: RippleSettings | null, a: boolean) =>
    withAudioData(data.value, <SliderRipples host={host} fill={fill} settings={s} active={a} />);
  const view = render(ui(settings, active));
  let now = 0;
  const frames = (count: number) =>
    act(() => {
      for (let i = 0; i < count; i++) data.scheduler.tick((now += FRAME_MS));
    });
  const setLevel = (value: number) => data.source.frame.mixSpectrum.fill(value);
  return {
    ctx,
    data,
    host: host.current,
    frames,
    setLevel,
    rerender: (s: RippleSettings | null, a: boolean) => view.rerender(ui(s, a)),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('SliderRipples', () => {
  it('leaves the flat fill showing while the music is steady', () => {
    const { host, frames, ctx } = setup();
    frames(30);
    expect(host.classList.contains('is-rippling')).toBe(false);
    expect(ctx.lineTo).not.toHaveBeenCalled();
  });

  it('draws a wavy bar over the played part on a hit, then hands back to the fill', () => {
    const { host, frames, setLevel, ctx } = setup();
    frames(30);
    setLevel(0.4);
    frames(1);
    expect(host.classList.contains('is-rippling')).toBe(true);
    const xs = ctx.lineTo.mock.calls.map(([x]) => x as number);
    expect(Math.max(...xs)).toBe(200);
    const ys = new Set(ctx.lineTo.mock.calls.map(([, y]) => Math.round((y as number) * 10)));
    expect(ys.size).toBeGreaterThan(1);
    setLevel(0);
    frames(240);
    expect(host.classList.contains('is-rippling')).toBe(false);
  });

  it('registers nothing while ripples are off', () => {
    const { data } = setup(null);
    expect(data.frameLoop.isRunning()).toBe(false);
  });

  it('registers nothing when the viewer prefers reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes('reduce'),
        addListener: () => {},
        removeListener: () => {},
      }),
    });
    const { data } = setup();
    expect(data.frameLoop.isRunning()).toBe(false);
  });

  it('clears live ripples when it goes inactive', () => {
    const { host, frames, setLevel, rerender } = setup();
    frames(30);
    setLevel(0.4);
    frames(1);
    rerender(DEFAULT_RIPPLE_SETTINGS, false);
    expect(host.classList.contains('is-rippling')).toBe(false);
  });
});
