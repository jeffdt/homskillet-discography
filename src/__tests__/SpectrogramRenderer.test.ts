import { describe, expect, it, vi } from 'vitest';
import { createSpectrumLayout } from '../audio/data/spectrumLayout';
import { Rgb } from '../visuals/color';
import { SpectrogramRenderer } from '../visuals/SpectrogramRenderer';
import {
  SHADE_KNEE,
  aWeightingLut,
  buildShadeTable,
  peakDecayFactor,
} from '../visuals/spectrogramMath';

const BACKGROUND: Rgb = [16, 16, 16];
const HIGHLIGHT: Rgb = [254, 254, 254];
const BLUE: Rgb = [86, 180, 233];
const YELLOW: Rgb = [240, 228, 66];
const layout = createSpectrumLayout();
const weighting = aWeightingLut(layout.frequencies);

interface FakeImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** A canvas whose 2D context records calls and makes real pixel buffers (jsdom has no canvas). */
function fakeCanvas(width: number, height: number) {
  const ctx = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    putImageData: vi.fn(),
    createImageData: (w: number, h: number): FakeImage => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
  };
  const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

function setup(height = 448) {
  const analyzer = fakeCanvas(64, height);
  const spectrogram = fakeCanvas(800, height);
  const scratch = fakeCanvas(0, 0);
  const renderer = new SpectrogramRenderer(
    { analyzer: analyzer.canvas, spectrogram: spectrogram.canvas },
    layout,
    { background: BACKGROUND, highlight: HIGHLIGHT },
    () => scratch.canvas
  );
  const binColors = new Float32Array(layout.bins * 3).fill(195);
  return { renderer, analyzer, spectrogram, scratch, binColors };
}

/** A spectrum value that lands bin b on value index `index` after A-weighting. */
function valueFor(index: number, b: number): number {
  return (index + 0.5) / 255 / weighting[b];
}

function setColor(binColors: Float32Array, b: number, rgb: Rgb): void {
  binColors.set(rgb, b * 3);
}

function lastImage(ctx: { putImageData: ReturnType<typeof vi.fn> }): FakeImage {
  const calls = ctx.putImageData.mock.calls;
  return calls[calls.length - 1][0];
}

function pixelAt(image: FakeImage, x: number, y: number): number[] {
  const i = (y * image.width + x) * 4;
  return Array.from(image.data.subarray(i, i + 4));
}

const BG_PIXEL = [...BACKGROUND, 255];

describe('SpectrogramRenderer', () => {
  it('scrolls by speed times elapsed time, not per frame', () => {
    const { renderer, spectrogram, binColors } = setup();
    const loud = new Float32Array(layout.bins).fill(0.5);
    renderer.draw(loud, binColors, 1000 / 60, 120);
    expect(spectrogram.ctx.putImageData).toHaveBeenCalledTimes(1);
    let [image, x] = spectrogram.ctx.putImageData.mock.calls[0];
    expect(x).toBe(798);
    expect(image.width).toBe(2);
    renderer.draw(loud, binColors, 1000 / 120, 120);
    [image, x] = spectrogram.ctx.putImageData.mock.calls[1];
    expect(x).toBe(799);
    expect(image.width).toBe(1);
  });

  it('leaves the waterfall alone on a frame shorter than one pixel', () => {
    const { renderer, spectrogram, scratch, binColors } = setup();
    const loud = new Float32Array(layout.bins).fill(0.5);
    scratch.ctx.drawImage.mockClear();
    renderer.draw(loud, binColors, 1000 / 120, 60);
    expect(scratch.ctx.drawImage).not.toHaveBeenCalled();
    expect(spectrogram.ctx.putImageData).not.toHaveBeenCalled();
    renderer.draw(loud, binColors, 1000 / 120, 60);
    expect(spectrogram.ctx.putImageData).toHaveBeenCalledTimes(1);
  });

  it('paints only the background for a silent spectrum', () => {
    const { renderer, analyzer, spectrogram, binColors } = setup();
    renderer.draw(new Float32Array(layout.bins), binColors, 1000 / 60, 120);
    expect(analyzer.ctx.putImageData).toHaveBeenCalledTimes(1);
    const image = lastImage(analyzer.ctx);
    for (let y = 0; y < image.height; y += 37) {
      for (let x = 0; x < image.width; x += 9) expect(pixelAt(image, x, y)).toEqual(BG_PIXEL);
    }
    expect(spectrogram.ctx.putImageData).not.toHaveBeenCalled();
  });

  it('colors each row with its bin color at the knee, in the bars and the waterfall', () => {
    const { renderer, analyzer, spectrogram, binColors } = setup();
    const spectrum = new Float32Array(layout.bins);
    spectrum[100] = valueFor(SHADE_KNEE, 100);
    setColor(binColors, 100, BLUE);
    renderer.draw(spectrum, binColors, 1000 / 60, 120);
    const row = 447 - 100;
    const bars = lastImage(analyzer.ctx);
    const barWidth = Math.floor((SHADE_KNEE * 64) / 256);
    expect(pixelAt(bars, 0, row)).toEqual([...BLUE, 255]);
    expect(pixelAt(bars, barWidth - 1, row)).toEqual([...BLUE, 255]);
    expect(pixelAt(bars, barWidth, row)).toEqual(BG_PIXEL);
    expect(pixelAt(bars, 0, row - 1)).toEqual(BG_PIXEL);
    const column = lastImage(spectrogram.ctx);
    expect(pixelAt(column, 0, row)).toEqual([...BLUE, 255]);
    expect(pixelAt(column, 1, row)).toEqual([...BLUE, 255]);
    expect(pixelAt(column, 0, row - 1)[3]).toBe(0);
  });

  it('shades the loudest values toward the highlight', () => {
    const { renderer, analyzer, binColors } = setup();
    const spectrum = new Float32Array(layout.bins);
    spectrum[100] = 10;
    setColor(binColors, 100, BLUE);
    renderer.draw(spectrum, binColors, 1000 / 60, 120);
    const { channel, highlight } = buildShadeTable();
    const c = channel[255];
    const h = highlight[255];
    const expected = [0, 1, 2].map(
      (i) => (BACKGROUND[i] * (1 - c - h) + BLUE[i] * c + HIGHLIGHT[i] * h + 0.5) | 0
    );
    expect(pixelAt(lastImage(analyzer.ctx), 0, 447 - 100)).toEqual([...expected, 255]);
  });

  it('takes the loudest bin when rows are fewer than bins', () => {
    const { renderer, analyzer, binColors } = setup(224);
    const spectrum = new Float32Array(layout.bins);
    spectrum[100] = valueFor(60, 100);
    spectrum[101] = valueFor(SHADE_KNEE, 101);
    setColor(binColors, 100, BLUE);
    setColor(binColors, 101, YELLOW);
    renderer.draw(spectrum, binColors, 1000 / 60, 120);
    const row = 223 - 50; // the row covering bins 100 and 101
    expect(pixelAt(lastImage(analyzer.ctx), 0, row)).toEqual([...YELLOW, 255]);
  });

  it('keeps a peak marker where the bar was and lets it fall with time', () => {
    const { renderer, analyzer, binColors } = setup();
    const spectrum = new Float32Array(layout.bins);
    setColor(binColors, 100, BLUE);
    spectrum[100] = valueFor(SHADE_KNEE, 100);
    renderer.draw(spectrum, binColors, 1000 / 60, 120);
    spectrum[100] = valueFor(8, 100);
    renderer.draw(spectrum, binColors, 1000 / 60, 120);
    const peak = SHADE_KNEE * peakDecayFactor(0.98, 1000 / 60);
    const peakWidth = Math.floor(Math.floor((peak * 64) / 256) / 4) * 4;
    const bars = lastImage(analyzer.ctx);
    const row = 447 - 100;
    expect(pixelAt(bars, 0, row)).not.toEqual(BG_PIXEL); // the quiet bar, 2 px wide
    expect(pixelAt(bars, peakWidth - 1, row)).not.toEqual(BG_PIXEL);
    expect(pixelAt(bars, peakWidth - 1, row)[3]).toBe(255);
    expect(pixelAt(bars, peakWidth - 3, row)).toEqual(BG_PIXEL);
  });

  it('keeps decaying the peak hold through silence without reviving it when sound returns', () => {
    const { renderer, analyzer, binColors } = setup();
    const spectrum = new Float32Array(layout.bins);
    const silence = new Float32Array(layout.bins);
    const row = 447 - 100;
    setColor(binColors, 100, BLUE);
    spectrum[100] = valueFor(255, 100);
    renderer.draw(spectrum, binColors, 1000 / 60, 120);
    const initialPeakWidth = Math.floor(Math.floor((255 * 64) / 256) / 4) * 4;
    expect(pixelAt(lastImage(analyzer.ctx), initialPeakWidth - 1, row)[3]).toBe(255);

    const silentFrames = 10;
    for (let i = 0; i < silentFrames; i++) renderer.draw(silence, binColors, 1000 / 60, 120);
    const afterOneFrame = lastImage(analyzer.ctx);
    const fallenPeak = 255 * peakDecayFactor(0.98, 1000 / 60) ** silentFrames;
    const fallenWidth = Math.floor(Math.floor((fallenPeak * 64) / 256) / 4) * 4;
    expect(fallenWidth).toBeLessThan(initialPeakWidth);
    expect(pixelAt(afterOneFrame, fallenWidth - 1, row)).not.toEqual(BG_PIXEL);
    expect(pixelAt(afterOneFrame, initialPeakWidth - 1, row)).toEqual(BG_PIXEL);

    for (let i = 0; i < 600; i++) renderer.draw(silence, binColors, 1000 / 60, 120);
    spectrum[100] = valueFor(8, 100);
    renderer.draw(spectrum, binColors, 1000 / 60, 120);
    const resumed = lastImage(analyzer.ctx);
    for (let x = 4; x < resumed.width; x++) expect(pixelAt(resumed, x, row)).toEqual(BG_PIXEL);
  });

  it('rebuilds rows and images on resize', () => {
    const { renderer, analyzer, spectrogram, binColors } = setup(448);
    (analyzer.canvas as { height: number }).height = 224;
    (spectrogram.canvas as { height: number }).height = 224;
    renderer.resize();
    const spectrum = new Float32Array(layout.bins);
    spectrum[101] = valueFor(SHADE_KNEE, 101);
    setColor(binColors, 101, YELLOW);
    renderer.draw(spectrum, binColors, 1000 / 60, 120);
    const bars = lastImage(analyzer.ctx);
    expect(bars.height).toBe(224);
    expect(pixelAt(bars, 0, 223 - 50)).toEqual([...YELLOW, 255]);
  });

  it('does nothing without 2D contexts', () => {
    const none = { width: 10, height: 10, getContext: () => null } as unknown as HTMLCanvasElement;
    const renderer = new SpectrogramRenderer(
      { analyzer: none, spectrogram: none },
      layout,
      { background: BACKGROUND, highlight: HIGHLIGHT },
      () => none
    );
    const binColors = new Float32Array(layout.bins * 3);
    expect(() => renderer.draw(new Float32Array(448).fill(1), binColors, 16, 120)).not.toThrow();
  });
});
