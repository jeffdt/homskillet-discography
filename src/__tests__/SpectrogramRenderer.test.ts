import { describe, expect, it, vi } from 'vitest';
import { createSpectrumLayout } from '../audio/data/spectrumLayout';
import { SpectrogramRenderer } from '../visuals/SpectrogramRenderer';

/** A canvas whose 2D context records calls (jsdom has no canvas). */
function fakeCanvas(width: number, height: number) {
  const ctx = { fillStyle: '', fillRect: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn() };
  const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

function setup(analyzerWidth = 64) {
  const layout = createSpectrumLayout();
  const analyzer = fakeCanvas(analyzerWidth, 448);
  const spectrogram = fakeCanvas(800, 448);
  const scratch = fakeCanvas(0, 0);
  const renderer = new SpectrogramRenderer(
    { analyzer: analyzer.canvas, spectrogram: spectrogram.canvas },
    layout,
    '#101010',
    () => scratch.canvas
  );
  const loud = new Float32Array(layout.bins).fill(0.5);
  return { renderer, analyzer, spectrogram, scratch, loud };
}

/** fillRect calls that drew a new waterfall column (the right edge of the spectrogram). */
function columnCalls(ctx: { fillRect: ReturnType<typeof vi.fn> }) {
  return ctx.fillRect.mock.calls.filter(([x]) => x >= 790);
}

describe('SpectrogramRenderer', () => {
  it('scrolls by speed times elapsed time, not per frame', () => {
    const { renderer, spectrogram, scratch, loud } = setup();
    renderer.draw(loud, 1000 / 60, 120);
    const at60 = columnCalls(spectrogram.ctx);
    expect(at60.length).toBe(448);
    expect(at60[0][0]).toBe(798);
    expect(at60[0][2]).toBe(2);
    expect(scratch.ctx.drawImage).toHaveBeenCalledWith(spectrogram.canvas, -2, 0);
    spectrogram.ctx.fillRect.mockClear();
    renderer.draw(loud, 1000 / 120, 120);
    expect(columnCalls(spectrogram.ctx)[0][2]).toBe(1);
  });

  it('leaves the waterfall alone on a frame shorter than one pixel', () => {
    const { renderer, spectrogram, scratch, loud } = setup();
    spectrogram.ctx.drawImage.mockClear();
    scratch.ctx.drawImage.mockClear();
    renderer.draw(loud, 1000 / 120, 60);
    expect(scratch.ctx.drawImage).not.toHaveBeenCalled();
    expect(columnCalls(spectrogram.ctx)).toHaveLength(0);
    renderer.draw(loud, 1000 / 120, 60);
    expect(columnCalls(spectrogram.ctx)).toHaveLength(448);
  });

  it('draws no bars or column for a silent spectrum but still clears the analyzer', () => {
    const { renderer, analyzer, spectrogram } = setup();
    analyzer.ctx.fillRect.mockClear();
    renderer.draw(new Float32Array(448), 1000 / 60, 120);
    expect(analyzer.ctx.fillRect).toHaveBeenCalledTimes(1); // the background
    expect(columnCalls(spectrogram.ctx)).toHaveLength(0);
  });

  it('decays the peak hold by elapsed time, not by frame count', () => {
    const peakXAfter = (fps: number) => {
      const { renderer, analyzer, loud } = setup(2560);
      renderer.setPeakQuantization(1);
      renderer.draw(
        Float32Array.from(loud, (_, i) => (i === 0 ? 1 : 0)),
        1000 / fps,
        0
      );
      const fading = new Float32Array(loud.length);
      fading[1] = 1e-6; // non-zero so the bins are drawn, but bin 0 contributes no new peak
      for (let i = 0; i < fps / 2; i++) {
        analyzer.ctx.fillRect.mockClear();
        renderer.draw(fading, 1000 / fps, 0);
      }
      const peakCall = analyzer.ctx.fillRect.mock.calls[2]; // background, bar, then bin 0's peak
      return peakCall[0];
    };
    const at30 = peakXAfter(30);
    const at60 = peakXAfter(60);
    expect(at60).toBeGreaterThan(0);
    expect(Math.abs(at30 - at60)).toBeLessThanOrEqual(2);
  });

  it('keeps decaying the peak hold through silence', () => {
    const { renderer, analyzer, loud } = setup(2560);
    renderer.setPeakQuantization(1);
    renderer.draw(
      Float32Array.from(loud, (_, i) => (i === 0 ? 1 : 0)),
      1000 / 60,
      0
    );
    const silentPeakX = () => {
      analyzer.ctx.fillRect.mockClear();
      renderer.draw(new Float32Array(loud.length), 1000 / 60, 0);
      return analyzer.ctx.fillRect.mock.calls[1][0]; // after the background: bin 0's peak
    };
    const first = silentPeakX();
    for (let i = 0; i < 30; i++) silentPeakX();
    const later = silentPeakX();
    expect(first).toBeGreaterThan(0);
    expect(later).toBeLessThan(first);
  });

  it('does nothing without 2D contexts', () => {
    const none = { width: 10, height: 10, getContext: () => null } as unknown as HTMLCanvasElement;
    const renderer = new SpectrogramRenderer(
      { analyzer: none, spectrogram: none },
      createSpectrumLayout(),
      '#101010',
      () => none
    );
    expect(() => renderer.draw(new Float32Array(448).fill(1), 16, 120)).not.toThrow();
  });
});
