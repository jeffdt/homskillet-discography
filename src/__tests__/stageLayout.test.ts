import { describe, it, expect } from 'vitest';
import { ANALYZER_WIDTH, computeStageLayout } from '../shell/stageLayout';

describe('computeStageLayout', () => {
  it('pins the analyzer to the right edge and tucks the spectrogram 1px under it', () => {
    const { spectrogram, analyzer } = computeStageLayout(1280, 800, 1);
    expect(analyzer.left).toBe(1280 - ANALYZER_WIDTH);
    expect(analyzer.width).toBe(ANALYZER_WIDTH);
    expect(spectrogram.left).toBe(0);
    expect(spectrogram.left + spectrogram.width).toBe(analyzer.left + 1);
  });

  it('gives both canvases the same backing height so frequency rows line up', () => {
    const { spectrogram, analyzer } = computeStageLayout(1000, 777, 1);
    expect(spectrogram.pixelHeight).toBe(777);
    expect(analyzer.pixelHeight).toBe(777);
  });

  it('scales backing stores, not CSS boxes, for low-power rendering', () => {
    const { spectrogram, analyzer } = computeStageLayout(1000, 600, 0.5);
    expect(spectrogram.width).toBe(937);
    expect(spectrogram.pixelWidth).toBe(469);
    expect(analyzer.pixelWidth).toBe(32);
    expect(analyzer.pixelHeight).toBe(300);
  });

  it('floors fractional sizes and clamps tiny windows', () => {
    const tiny = computeStageLayout(10.7, 0, 1);
    expect(tiny.analyzer.left).toBe(1);
    expect(tiny.spectrogram.pixelWidth).toBeGreaterThanOrEqual(1);
    expect(tiny.spectrogram.pixelHeight).toBe(1);
  });

  it('gives the full-window canvas the whole container at the render scale', () => {
    const { full } = computeStageLayout(1000.6, 600, 0.5);
    expect(full).toEqual({ left: 0, width: 1000, height: 600, pixelWidth: 500, pixelHeight: 300 });
  });
});
