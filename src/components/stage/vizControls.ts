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
  info: 'How long old traces take to fade.',
  step: 0.05,
  ...direct(0, SCOPE_TRAILS_MAX, 2),
  format: percent,
};

/** Soft halo around each scope line. */
export const SCOPE_GLOW: StageSliderDef = {
  id: 'scope-glow',
  key: 'scopeGlow',
  label: 'Glow',
  step: 0.05,
  ...direct(0, 1, 2),
  format: percent,
};

/** Light bleeding past the scope lines. */
export const SCOPE_BLOOM: StageSliderDef = {
  id: 'scope-bloom',
  key: 'scopeBloom',
  label: 'Bloom',
  info: 'Light spilling past the lines. Off on slower devices.',
  step: 0.05,
  ...direct(0, 1, 2),
  format: percent,
};

/** How much scope lines follow each channel's loudness. */
export const SCOPE_REACTIVITY: StageSliderDef = {
  id: 'scope-reactivity',
  key: 'scopeReactivity',
  label: 'Reacts to loudness',
  info: 'Louder channels draw thicker, brighter lines, and new notes flash.',
  step: 0.05,
  ...direct(0, 1, 2),
  format: percent,
};

/** Scope line thickness. */
export const SCOPE_LINE_WIDTH: StageSliderDef = {
  id: 'scope-line-width',
  key: 'scopeLineWidth',
  label: 'Line width',
  step: 0.5,
  ...direct(SCOPE_LINE_WIDTH_MIN, SCOPE_LINE_WIDTH_MAX, 1),
  format: (value) => `${value.toFixed(1)} px`,
};

const flag = { isOn: (value: unknown) => value === true, toValue: (on: boolean) => on };

/** A white line inside each trace. */
export const SCOPE_CORE: StageToggleDef = {
  id: 'scope-core',
  key: 'scopeCore',
  label: 'White-hot core',
  info: 'A thin white line down the middle of each trace.',
  ...flag,
};

/** Shading between each wave and its center line. */
export const SCOPE_FILL: StageToggleDef = {
  id: 'scope-fill',
  key: 'scopeFill',
  label: 'Fill under the wave',
  info: 'Shades under each wave. Stacked and Overlaid only.',
  ...flag,
};

/** Scale each scope trace to its own wave, or show every channel at one fixed gain. */
export const SCOPE_AUTO_GAIN: StageToggleDef = {
  id: 'scope-auto-gain',
  key: 'scopeAutoGain',
  label: 'Auto-size traces',
  explanation:
    'Scales each trace to fill its space. Turn off to compare how loud the channels are.',
  ...flag,
};

/** Always visible with the Scopes style, in panel order. */
export const SCOPE_EFFECT_SLIDERS: readonly StageSliderDef[] = [
  SCOPE_TRAILS,
  SCOPE_GLOW,
  SCOPE_BLOOM,
  SCOPE_REACTIVITY,
];
/** Inside "More scope settings", after the zoom. */
export const MORE_SCOPE_SLIDERS: readonly StageSliderDef[] = [SCOPE_LINE_WIDTH];
/** Inside "More scope settings", after the sliders. */
export const MORE_SCOPE_TOGGLES: readonly StageToggleDef[] = [
  SCOPE_AUTO_GAIN,
  SCOPE_CORE,
  SCOPE_FILL,
];

/** Visualizer panel text for the spectrum colorings and scope presets. */
export const VIZ_COPY = {
  scopesIgnoreChannels:
    'The scopes are using the accent color, so these colors only show in the Mixer.',
  colorScopesByChannel: 'Color the scopes by channel',
  spectrumIgnoresChannels:
    'The Unified coloring uses a gradient, so these colors only show in the Mixer.',
  colorSpectrumByChannel: 'Color the spectrum by channel',
  gradient: 'Left is quiet, right is loud.',
};
