import { describe, expect, it, vi } from 'vitest';
import { createSpectrumLayout } from '../audio/data/spectrumLayout';
import { SpectrogramRenderer } from '../visuals/SpectrogramRenderer';

/** A canvas whose 2D context records calls (jsdom has no canvas). */
function fakeCanvas(width: number, height: number) {
  const ctx = { fillStyle: '', fillRect: vi.fn(), clearRect: vi.fn(), drawImage: vi.fn() };
  const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

function setup() {
  const layout = createSpectrumLayout();
  const analyzer = fakeCanvas(64, 448);
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
    const { renderer, spectrogram, loud } = setup();
    renderer.draw(loud, 1000 / 60, 120);
    const at60 = columnCalls(spectrogram.ctx);
    expect(at60.length).toBe(448);
    expect(at60[0][0]).toBe(798);
    expect(at60[0][2]).toBe(2);
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
