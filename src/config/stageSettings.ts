import { DEFAULT_CHANNEL_PALETTE_ID } from './channelPalettes';

/** How the stage draws the music. */
export type VisualizerStyleId = 'spectrum' | 'scopes';

/** A visualizer style the Stage panel offers. */
export interface VisualizerStyle {
  /** Stable key persisted in settings.visualizerStyle. Never rename or reuse one. */
  id: VisualizerStyleId;
  label: string;
  /** Shown under the style picker: what you are looking at. */
  description: string;
}

/** Every visualizer style, default first. */
export const VISUALIZER_STYLES: readonly VisualizerStyle[] = [
  {
    id: 'spectrum',
    label: 'Spectrum',
    description:
      'Pitch runs from low at the bottom to high at the top while time scrolls right to left. Each band takes the colors of the channels playing it.',
  },
  {
    id: 'scopes',
    label: 'Channel scopes',
    description:
      'One oscilloscope per sound channel: the wave each voice of the chip is drawing right now. Square waves look square, the triangle looks like a triangle, and noise looks like noise.',
  },
];

/** The style new visitors see, and the fallback for unknown ids. */
export const DEFAULT_VISUALIZER_STYLE: VisualizerStyleId = 'spectrum';

/** The style with this id, or the spectrum when the id is missing or unknown. */
export function visualizerStyleById(id?: string | null): VisualizerStyle {
  return (
    VISUALIZER_STYLES.find((style) => style.id === id) ||
    (VISUALIZER_STYLES.find((style) => style.id === DEFAULT_VISUALIZER_STYLE) as VisualizerStyle)
  );
}

/**
 * Samples per channel scope trace the zoom offers: about 11, 21 and 32 ms at the 24 kHz tap rate.
 * The largest leaves 256 of the 1024 tap samples free to search for a trigger.
 */
export const SCOPE_SPANS: readonly number[] = [256, 512, 768];

/** The zoom new visitors see. */
export const DEFAULT_SCOPE_SPAN = 512;

/** A stored scope span if it is one the zoom offers, else the default. */
export function scopeSpanOf(value: unknown): number {
  return typeof value === 'number' && SCOPE_SPANS.includes(value) ? value : DEFAULT_SCOPE_SPAN;
}

/** Spark tuning defaults, written by "Reset sparks"; the sparks on/off switch is separate. */
export const SPARK_DEFAULTS = {
  particleSpawnRate: 20,
  particleLifespan: 600,
  particleBaseAngle: 180,
  particleAngleSpread: 30,
  particleSpeed: 1.7,
  particleSpeedVariance: 20,
  particleGravity: 0,
  particleFadeMode: 'fade' as string,
};

/** Every Stage panel setting and its default. "Reset stage" writes exactly these. */
export const STAGE_DEFAULTS = {
  visualizerStyle: DEFAULT_VISUALIZER_STYLE as string,
  scopeSpan: DEFAULT_SCOPE_SPAN,
  channelPalette: DEFAULT_CHANNEL_PALETTE_ID,
  uiPalette: 0,
  peakDecayRate: 0.98,
  peakQuantization: 4,
  audioReactivePulse: true,
  reactiveStrength: 100,
  filmGrainAmount: 50,
  sliderSparksEnabled: false,
  ...SPARK_DEFAULTS,
};

/** A user-settings key the Stage panel owns. */
export type StageSettingKey = keyof typeof STAGE_DEFAULTS;
