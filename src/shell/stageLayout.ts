export const ANALYZER_WIDTH = 64;

export interface CanvasBox {
  left: number;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
}

export interface StageLayout {
  spectrogram: CanvasBox;
  analyzer: CanvasBox;
}

/** Lays out the spectrogram and the right-edge analyzer; the spectrogram overlaps by 1px so no seam can show (#70). */
export function computeStageLayout(
  width: number,
  height: number,
  renderScale: number
): StageLayout {
  const w = Math.max(Math.floor(width), ANALYZER_WIDTH + 1);
  const h = Math.max(Math.floor(height), 1);
  const analyzerLeft = w - ANALYZER_WIDTH;
  const pixelHeight = Math.max(1, Math.round(h * renderScale));
  const spectrogramWidth = analyzerLeft + 1;
  return {
    spectrogram: {
      left: 0,
      width: spectrogramWidth,
      height: h,
      pixelWidth: Math.max(1, Math.round(spectrogramWidth * renderScale)),
      pixelHeight,
    },
    analyzer: {
      left: analyzerLeft,
      width: ANALYZER_WIDTH,
      height: h,
      pixelWidth: Math.max(1, Math.round(ANALYZER_WIDTH * renderScale)),
      pixelHeight,
    },
  };
}
