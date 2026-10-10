import {
  SCOPE_LINE_WIDTH_MAX,
  SCOPE_LINE_WIDTH_MIN,
  SCOPE_TRAILS_MAX,
} from '../../config/stageSettings';
import { StageSliderDef, StageToggleDef, direct } from './stageControls';

const percent = (value: number) => (value === 0 ? 'Off' : `${Math.round(value * 100)}%`);

/** How long old scope traces linger. */
export const SCOPE_TRAILS: StageSliderDef = {
  id: 'scope-trails',
  key: 'scopeTrails',
  label: 'Trails',
  explanation:
    'How long the old trace lingers before it fades, like the phosphor on a real oscilloscope screen.',
  step: 0.05,
  ...direct(0, SCOPE_TRAILS_MAX, 2),
  format: percent,
};

/** Soft halo around each scope line. */
export const SCOPE_GLOW: StageSliderDef = {
  id: 'scope-glow',
  key: 'scopeGlow',
  label: 'Glow',
  explanation: 'A soft halo around each line, drawn as wider, fainter copies of it.',
  step: 0.05,
  ...direct(0, 1, 2),
  format: percent,
};

/** Light bleeding past the scope lines. */
export const SCOPE_BLOOM: StageSliderDef = {
  id: 'scope-bloom',
  key: 'scopeBloom',
  label: 'Bloom',
  explanation:
    'Light bleeding past the lines: a small blurred copy of the picture laid over it. Off on slower devices.',
  step: 0.05,
  ...direct(0, 1, 2),
  format: percent,
};

/** How much scope lines follow each channel's loudness. */
export const SCOPE_REACTIVITY: StageSliderDef = {
  id: 'scope-reactivity',
  key: 'scopeReactivity',
  label: 'Reacts to loudness',
  explanation: 'Loud channels draw thicker, brighter lines, and every new note flashes.',
  step: 0.05,
  ...direct(0, 1, 2),
  format: percent,
};

/** Scope line thickness. */
export const SCOPE_LINE_WIDTH: StageSliderDef = {
  id: 'scope-line-width',
  key: 'scopeLineWidth',
  label: 'Line width',
  explanation: 'How thick each trace is.',
  step: 0.5,
  ...direct(SCOPE_LINE_WIDTH_MIN, SCOPE_LINE_WIDTH_MAX, 1),
  format: (value) => `${value.toFixed(1)} px`,
};

const flag = { isOn: (value: unknown) => value === true, toValue: (on: boolean) => on };

/** Scanlines and vignette over the scopes. */
export const SCOPE_CRT: StageToggleDef = {
  id: 'scope-crt',
  key: 'scopeCrt',
  label: 'CRT screen',
  explanation: 'Scanlines and a dark vignette, like an old TV.',
  ...flag,
};

/** A white line inside each trace. */
export const SCOPE_CORE: StageToggleDef = {
  id: 'scope-core',
  key: 'scopeCore',
  label: 'White-hot core',
  explanation: 'A thin white line inside each trace, the way the brightest phosphor looks.',
  ...flag,
};

/** Shading between each wave and its center line. */
export const SCOPE_FILL: StageToggleDef = {
  id: 'scope-fill',
  key: 'scopeFill',
  label: 'Fill under the wave',
  explanation: 'Shades the area between each wave and its center line. Stacked and Overlaid only.',
  ...flag,
};

/** Always visible with the Channel scopes style, in panel order. */
export const SCOPE_EFFECT_SLIDERS: readonly StageSliderDef[] = [
  SCOPE_TRAILS,
  SCOPE_GLOW,
  SCOPE_BLOOM,
  SCOPE_REACTIVITY,
];
/** Inside "More scope settings", after the zoom. */
export const MORE_SCOPE_SLIDERS: readonly StageSliderDef[] = [SCOPE_LINE_WIDTH];
/** Inside "More scope settings", after the sliders. */
export const MORE_SCOPE_TOGGLES: readonly StageToggleDef[] = [SCOPE_CORE, SCOPE_FILL];

/** Visuals panel text for the spectrum colorings and scope presets. */
export const VIZ_COPY = {
  scopesIgnoreChannels:
    'The scopes are set to Accent color, so every trace takes the accent from Interface below and these colors do not show there. The Mixer still uses them.',
  colorScopesByChannel: 'Color the scopes by channel',
  spectrumIgnoresChannels:
    'The Unified spectrum takes its colors from its gradient, so these colors do not show there. The Mixer still uses them.',
  colorSpectrumByChannel: 'Color the spectrum by channel',
  gradient:
    'The gradients the site had before channel colors. Quiet sounds take the left color, the loudest take the right.',
  presets: 'Starting points. Pick one, then change anything below.',
  custom: 'Custom: your own mix of the settings below.',
};
