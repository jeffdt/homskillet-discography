import { DEFAULT_CHANNEL_PALETTE_ID } from './channelPalettes';
import { DEFAULT_SPECTRUM_GRADIENT_ID } from './spectrumGradients';

/** How the stage draws the music. */
export type VisualizerStyleId = 'spectrum' | 'scopes';

/** A visualizer style the Visualizer panel offers. */
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

/** How the Spectrum style colors its bands. */
export type SpectrumColoringId = 'additive' | 'average' | 'unified';

/** A spectrum coloring the Visualizer panel offers. */
export interface SpectrumColoring {
  /** Stable key persisted in settings.spectrumColoring. Never rename or reuse one. */
  id: SpectrumColoringId;
  label: string;
  /** Shown under the coloring picker. */
  description: string;
}

/** Every spectrum coloring, default first. */
export const SPECTRUM_COLORINGS: readonly SpectrumColoring[] = [
  {
    id: 'additive',
    label: 'Add light',
    description:
      'Each channel shines its own color, as bright as it is loud. Where channels overlap, their light adds up like colored stage lights.',
  },
  {
    id: 'average',
    label: 'Average',
    description:
      'Each band takes a blend of the channels playing in it, leaning toward the loudest, so overlaps mix like paint.',
  },
  {
    id: 'unified',
    label: 'Unified',
    description:
      'Colors come from how loud each band is, not which channel plays it, using one gradient you pick below: quiet sounds take its left end, loud ones its right.',
  },
];

/** The coloring new visitors see, and the fallback for unknown ids. */
export const DEFAULT_SPECTRUM_COLORING: SpectrumColoringId = 'additive';

/** The spectrum coloring with this id, or the default. */
export function spectrumColoringById(id?: unknown): SpectrumColoring {
  return (
    SPECTRUM_COLORINGS.find((coloring) => coloring.id === id) ||
    (SPECTRUM_COLORINGS.find(
      (coloring) => coloring.id === DEFAULT_SPECTRUM_COLORING
    ) as SpectrumColoring)
  );
}

/** Where the channel scopes put each voice's trace. */
export type ScopeLayoutId = 'stacked' | 'overlaid' | 'rings' | 'phase';

/** A scope layout the Visualizer panel offers. */
export interface ScopeLayout {
  /** Stable key persisted in settings.scopeLayout. Never rename or reuse one. */
  id: ScopeLayoutId;
  label: string;
  /** Shown under the layout picker. */
  description: string;
}

/** Every scope layout, in panel order. */
export const SCOPE_LAYOUTS: readonly ScopeLayout[] = [
  { id: 'stacked', label: 'Stacked', description: 'One lane per channel, top to bottom.' },
  {
    id: 'overlaid',
    label: 'Overlaid',
    description: 'Every channel on one shared line. Where traces cross, their light adds up.',
  },
  {
    id: 'rings',
    label: 'Rings',
    description: 'Each channel wraps around a slowly turning circle, the first channel innermost.',
  },
  {
    id: 'phase',
    label: 'Phase portraits',
    description:
      'Each channel plotted against itself a millisecond earlier, like an X-Y oscilloscope. Square waves draw boxes, the triangle draws a loop, and noise draws a cloud.',
  },
];

/** How the channel scopes color their traces. */
export type ScopeColoringId = 'channel' | 'unified';

/** A scope trace coloring the Visualizer panel offers. */
export interface ScopeColoring {
  /** Stable key persisted in settings.scopeColoring. Never rename or reuse one. */
  id: ScopeColoringId;
  label: string;
  /** Shown under the trace color picker. */
  description: string;
}

/** Every scope trace coloring, in panel order. */
export const SCOPE_COLORINGS: readonly ScopeColoring[] = [
  {
    id: 'channel',
    label: 'By channel',
    description: 'Each channel in its own palette color, to tell the voices apart.',
  },
  {
    id: 'unified',
    label: 'Accent color',
    description:
      'Every trace in your accent color (set in the Interface panel), like a one-color phosphor screen.',
  },
];

/** Everything the channel scopes draw with; every key is a persisted setting. */
export interface ScopeSettings {
  scopeLayout: ScopeLayoutId;
  scopeColoring: ScopeColoringId;
  /** 0..SCOPE_TRAILS_MAX: share of the picture kept per 60 fps frame. */
  scopeTrails: number;
  /** 0..1 */
  scopeGlow: number;
  /** 0..1: opacity of the blurred copy. */
  scopeBloom: number;
  /** 0..1 */
  scopeReactivity: number;
  /** CSS pixels, SCOPE_LINE_WIDTH_MIN..SCOPE_LINE_WIDTH_MAX. */
  scopeLineWidth: number;
  scopeCore: boolean;
  scopeFill: boolean;
  scopeCrt: boolean;
  /** One of SCOPE_SPANS. */
  scopeSpan: number;
  /** Each trace scales to its own wave's peak (on) or one fixed gain (off). */
  scopeAutoGain: boolean;
}

/** Trails stop short of 1 so the picture always fades. */
export const SCOPE_TRAILS_MAX = 0.9;
/** Thinnest scope line in CSS pixels. */
export const SCOPE_LINE_WIDTH_MIN = 1;
/** Thickest scope line in CSS pixels. */
export const SCOPE_LINE_WIDTH_MAX = 5;

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

/** The scope settings a preset sets: every look setting; Auto gain is a measuring mode, not a look. */
export type ScopeLookSettings = Omit<ScopeSettings, 'scopeAutoGain'>;

/** A named set of every scope look setting, offered as a starting point in the panel. */
export interface ScopePreset {
  id: string;
  label: string;
  settings: ScopeLookSettings;
}

/** Plain lines with no effects: the base every other preset builds on. */
const PLAIN_SCOPES: ScopeLookSettings = {
  scopeLayout: 'stacked',
  scopeColoring: 'channel',
  scopeTrails: 0,
  scopeGlow: 0,
  scopeBloom: 0,
  scopeReactivity: 0,
  scopeLineWidth: 2,
  scopeCore: false,
  scopeFill: false,
  scopeCrt: false,
  scopeSpan: DEFAULT_SCOPE_SPAN,
};

/** The scope presets, in panel order. Values chosen with the owner in the viz lab (spec 4.4). */
export const SCOPE_PRESETS: readonly ScopePreset[] = [
  {
    id: 'green-crt',
    label: 'Green CRT',
    settings: {
      ...PLAIN_SCOPES,
      scopeColoring: 'unified',
      scopeTrails: 0.8,
      scopeGlow: 0.6,
      scopeBloom: 0.45,
      scopeReactivity: 0.25,
      scopeLineWidth: 1.5,
      scopeCore: true,
      scopeCrt: true,
    },
  },
  {
    id: 'halo',
    label: 'Halo',
    settings: {
      ...PLAIN_SCOPES,
      scopeLayout: 'rings',
      scopeTrails: 0.6,
      scopeGlow: 0.5,
      scopeBloom: 0.4,
      scopeReactivity: 0.55,
      scopeCore: true,
      scopeSpan: 768,
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    settings: {
      ...PLAIN_SCOPES,
      scopeLayout: 'overlaid',
      scopeTrails: 0.45,
      scopeGlow: 0.6,
      scopeBloom: 0.45,
      scopeReactivity: 0.5,
      scopeLineWidth: 2.5,
      scopeCore: true,
    },
  },
  {
    id: 'phosphor',
    label: 'Phosphor',
    settings: {
      ...PLAIN_SCOPES,
      scopeTrails: 0.85,
      scopeGlow: 0.5,
      scopeBloom: 0.3,
      scopeReactivity: 0.3,
      scopeCore: true,
    },
  },
  {
    id: 'xy',
    label: 'X-Y',
    settings: {
      ...PLAIN_SCOPES,
      scopeLayout: 'phase',
      scopeTrails: 0.88,
      scopeGlow: 0.6,
      scopeBloom: 0.4,
      scopeReactivity: 0.4,
      scopeLineWidth: 1.5,
      scopeCore: true,
    },
  },
  { id: 'plain', label: 'Plain', settings: PLAIN_SCOPES },
];

/** What the channel scopes look like until the visitor changes them: the Green CRT preset (owner's choice). */
export const SCOPE_DEFAULTS: ScopeSettings = { ...SCOPE_PRESETS[0].settings, scopeAutoGain: true };

/** The scope layout with this id, or the default layout. */
export function scopeLayoutById(id?: unknown): ScopeLayout {
  return (
    SCOPE_LAYOUTS.find((layout) => layout.id === id) ||
    (SCOPE_LAYOUTS.find((layout) => layout.id === SCOPE_DEFAULTS.scopeLayout) as ScopeLayout)
  );
}

/** The scope trace coloring with this id, or the default coloring. */
export function scopeColoringById(id?: unknown): ScopeColoring {
  return (
    SCOPE_COLORINGS.find((coloring) => coloring.id === id) ||
    (SCOPE_COLORINGS.find(
      (coloring) => coloring.id === SCOPE_DEFAULTS.scopeColoring
    ) as ScopeColoring)
  );
}

function rangeOf(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function flagOf(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Every scope setting from stored settings, each one valid: junk and missing values take the default. */
export function scopeSettingsOf(settings: Record<string, unknown>): ScopeSettings {
  const d = SCOPE_DEFAULTS;
  return {
    scopeLayout: scopeLayoutById(settings.scopeLayout).id,
    scopeColoring: scopeColoringById(settings.scopeColoring).id,
    scopeTrails: rangeOf(settings.scopeTrails, 0, SCOPE_TRAILS_MAX, d.scopeTrails),
    scopeGlow: rangeOf(settings.scopeGlow, 0, 1, d.scopeGlow),
    scopeBloom: rangeOf(settings.scopeBloom, 0, 1, d.scopeBloom),
    scopeReactivity: rangeOf(settings.scopeReactivity, 0, 1, d.scopeReactivity),
    scopeLineWidth: rangeOf(
      settings.scopeLineWidth,
      SCOPE_LINE_WIDTH_MIN,
      SCOPE_LINE_WIDTH_MAX,
      d.scopeLineWidth
    ),
    scopeCore: flagOf(settings.scopeCore, d.scopeCore),
    scopeFill: flagOf(settings.scopeFill, d.scopeFill),
    scopeCrt: flagOf(settings.scopeCrt, d.scopeCrt),
    scopeSpan: scopeSpanOf(settings.scopeSpan),
    scopeAutoGain: flagOf(settings.scopeAutoGain, d.scopeAutoGain),
  };
}

/** The preset whose every value matches the stored settings, or null for a custom mix. */
export function matchingScopePreset(settings: Record<string, unknown>): ScopePreset | null {
  const current = scopeSettingsOf(settings);
  return (
    SCOPE_PRESETS.find((preset) =>
      (Object.keys(preset.settings) as Array<keyof ScopeLookSettings>).every((key) => {
        const want = preset.settings[key];
        const have = current[key];
        return typeof want === 'number' ? Math.abs(want - (have as number)) < 1e-6 : want === have;
      })
    ) || null
  );
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

/** Every Visualizer panel setting and its default. "Reset visualizer" writes exactly these. */
export const VISUALIZER_DEFAULTS = {
  visualizerStyle: DEFAULT_VISUALIZER_STYLE as string,
  spectrumColoring: DEFAULT_SPECTRUM_COLORING as string,
  spectrumGradient: DEFAULT_SPECTRUM_GRADIENT_ID as string,
  ...SCOPE_DEFAULTS,
  channelPalette: DEFAULT_CHANNEL_PALETTE_ID,
  peakDecayRate: 0.98,
  peakQuantization: 4,
};

/** Every Interface panel setting and its default. "Reset interface" writes exactly these. */
export const INTERFACE_DEFAULTS = {
  uiPalette: 0,
  audioReactivePulse: true,
  reactiveStrength: 100,
  filmGrainAmount: 50,
  sliderSparksEnabled: false,
  ...SPARK_DEFAULTS,
};

/** Every setting the Visualizer and Interface panels own, with its default. */
export const STAGE_DEFAULTS = { ...VISUALIZER_DEFAULTS, ...INTERFACE_DEFAULTS };

/** A user-settings key the Visualizer or Interface panel owns. */
export type StageSettingKey = keyof typeof STAGE_DEFAULTS;
