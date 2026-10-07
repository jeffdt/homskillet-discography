import {
  SCOPE_SPANS,
  STAGE_DEFAULTS,
  StageSettingKey,
  scopeSpanOf,
} from '../../config/stageSettings';

/** A Stage panel slider: the setting it writes, how slider positions map to it, and its explanation. */
export interface StageSliderDef {
  /** Unique; the input's DOM id is `stage-${id}`. */
  id: string;
  key: StageSettingKey;
  label: string;
  /** One plain-language line, always visible under the slider. */
  explanation: string;
  min: number;
  max: number;
  step: number;
  /** Slider position for a stored value, always within min..max. */
  toSlider(value: number): number;
  /** Stored value for a slider position. */
  fromSlider(position: number): number;
  /** The stored value as the panel shows it. */
  format(value: number): string;
}

/** A Stage panel switch: the setting it writes and its explanation. */
export interface StageToggleDef {
  id: string;
  key: StageSettingKey;
  label: string;
  explanation: string;
  /** Whether a stored value means on. */
  isOn(value: unknown): boolean;
  /** The value to store for on or off. */
  toValue(on: boolean): boolean | string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Index of the value closest to value; ties go to the earlier one. */
export function nearestIndex(values: readonly number[], value: number): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - value) < Math.abs(values[best] - value)) best = i;
  }
  return best;
}

/** Mapping for a slider whose position is the stored value. */
export function direct(min: number, max: number, decimals: number) {
  return {
    min,
    max,
    toSlider: (value: number) => clamp(value, min, max),
    fromSlider: (position: number) => roundTo(position, decimals),
  };
}

/** Mapping for a slider whose positions 0..n-1 pick from a list of stored values. */
function stepped(values: readonly number[]) {
  return {
    min: 0,
    max: values.length - 1,
    toSlider: (value: number) => nearestIndex(values, value),
    fromSlider: (position: number) => values[clamp(Math.round(position), 0, values.length - 1)],
  };
}

const PEAK_DECAY_VALUES = [0.92, 0.935, 0.95, 0.965, 0.98, 0.995];
const PEAK_QUANTIZATION_VALUES = [1, 2, 4, 8];
const PEAK_QUANTIZATION_NAMES = ['Off', 'Low', 'Medium', 'High'];
const SPAWN_VALUES = [200, 180, 160, 140, 120, 100, 80, 60, 40, 20];
const SPEED_VARIANCE_VALUES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
const TAP_SAMPLES_PER_MS = 24;

/** How long the spectrum peak markers hang before falling. */
export const PEAK_DECAY: StageSliderDef = {
  id: 'peak-decay',
  key: 'peakDecayRate',
  label: 'Peak decay',
  explanation:
    'The thin markers at the tip of each bar remember recent peaks. Higher numbers let them hang longer before they fall.',
  step: 1,
  ...stepped(PEAK_DECAY_VALUES),
  format: (value) => `${nearestIndex(PEAK_DECAY_VALUES, value) + 1}/${PEAK_DECAY_VALUES.length}`,
};

/** How coarsely the falling peak markers snap to steps. */
export const PEAK_QUANTIZATION: StageSliderDef = {
  id: 'peak-quantization',
  key: 'peakQuantization',
  label: 'Peak quantization',
  explanation:
    'Snaps the falling peak markers to coarse steps, for a chunky, pixel-art fall. Off lets them glide.',
  step: 1,
  ...stepped(PEAK_QUANTIZATION_VALUES),
  format: (value) => PEAK_QUANTIZATION_NAMES[nearestIndex(PEAK_QUANTIZATION_VALUES, value)],
};

/** How many samples each channel scope trace shows. */
export const SCOPE_ZOOM: StageSliderDef = {
  id: 'scope-zoom',
  key: 'scopeSpan',
  label: 'Scope zoom',
  explanation:
    'How much time each trace shows. Zoom in to see the shape of single waves; zoom out to watch notes change. Phase portraits ignore it.',
  step: 1,
  ...stepped(SCOPE_SPANS),
  toSlider: (value) => SCOPE_SPANS.indexOf(scopeSpanOf(value)),
  format: (value) => `${Math.round(value / TAP_SAMPLES_PER_MS)} ms`,
};

/** How strongly the dock, play button and logo react to the music. */
export const REACTIVE_STRENGTH: StageSliderDef = {
  id: 'reactive-strength',
  key: 'reactiveStrength',
  label: 'Reactive UI strength',
  explanation:
    'How big the glow on the dock and play button and the swell of the logo get when the music hits. At 100% it is easy to see; turn it down for a calmer screen.',
  step: 10,
  ...direct(0, 150, 0),
  format: (value) => (value === 0 ? 'Off' : `${value}%`),
};

/** Strength of the film grain overlay. */
export const FILM_GRAIN: StageSliderDef = {
  id: 'film-grain',
  key: 'filmGrainAmount',
  label: 'Film grain',
  explanation:
    'A layer of random specks over everything, like old film. It is drawn once and only jiggles, so it costs the visualizer nothing.',
  step: 5,
  ...direct(0, 100, 0),
  format: (value) => (value === 0 ? 'Off' : `${value}%`),
};

/** How often sparks spawn off the progress bar. */
export const SPARK_SPAWN: StageSliderDef = {
  id: 'spark-spawn',
  key: 'particleSpawnRate',
  label: 'Spawn frequency',
  explanation: 'How often new sparks fly off the progress bar. Higher is busier.',
  step: 1,
  ...stepped(SPAWN_VALUES),
  format: (value) => `${nearestIndex(SPAWN_VALUES, value) + 1}`,
};

/** How long each spark lives. */
export const SPARK_LIFESPAN: StageSliderDef = {
  id: 'spark-lifespan',
  key: 'particleLifespan',
  label: 'Lifespan',
  explanation: 'How long each spark lives before it disappears.',
  step: 200,
  ...direct(200, 2400, 0),
  format: (value) => `${(value / 1000).toFixed(1)} s`,
};

/** The direction sparks fly. */
export const SPARK_ANGLE: StageSliderDef = {
  id: 'spark-angle',
  key: 'particleBaseAngle',
  label: 'Spray angle',
  explanation: 'The direction sparks fly: 0° is right, 90° down, 180° left and 270° up.',
  step: 15,
  ...direct(0, 360, 0),
  format: (value) => `${value}°`,
};

/** How far sparks may stray from the spray angle. */
export const SPARK_CONE: StageSliderDef = {
  id: 'spark-cone',
  key: 'particleAngleSpread',
  label: 'Spray cone',
  explanation: 'How far each spark may stray from the spray angle, either way.',
  step: 1,
  ...direct(0, 90, 0),
  format: (value) => `±${value}°`,
};

/** How fast sparks leave the bar. */
export const SPARK_SPEED: StageSliderDef = {
  id: 'spark-speed',
  key: 'particleSpeed',
  label: 'Speed',
  explanation: 'How fast sparks leave the bar.',
  step: 0.1,
  ...direct(0.5, 3, 1),
  format: (value) => `${value.toFixed(1)}×`,
};

/** How much spark speeds differ from each other. */
export const SPARK_SPEED_VARIANCE: StageSliderDef = {
  id: 'spark-speed-variance',
  key: 'particleSpeedVariance',
  label: 'Speed variance',
  explanation: "How much each spark's speed differs from the others.",
  step: 1,
  ...stepped(SPEED_VARIANCE_VALUES),
  format: (value) => `${SPEED_VARIANCE_VALUES[nearestIndex(SPEED_VARIANCE_VALUES, value)]}%`,
};

/** How strongly gravity pulls sparks down. */
export const SPARK_GRAVITY: StageSliderDef = {
  id: 'spark-gravity',
  key: 'particleGravity',
  label: 'Gravity',
  explanation: 'Pulls sparks downward as they fly. At 0 they fly straight.',
  step: 0.1,
  ...direct(0, 2, 1),
  format: (value) => `${value.toFixed(1)}×`,
};

/** Shown with the Spectrum style. */
export const PEAK_SLIDERS: readonly StageSliderDef[] = [PEAK_DECAY, PEAK_QUANTIZATION];
/** Always visible in the Sparks section. */
export const SPARK_SLIDERS: readonly StageSliderDef[] = [SPARK_SPAWN, SPARK_LIFESPAN];
/** Inside "More spark settings". */
export const MORE_SPARK_SLIDERS: readonly StageSliderDef[] = [
  SPARK_ANGLE,
  SPARK_CONE,
  SPARK_SPEED,
  SPARK_SPEED_VARIANCE,
  SPARK_GRAVITY,
];
/** Every Stage slider, in panel order. */
export const ALL_STAGE_SLIDERS: readonly StageSliderDef[] = [
  ...PEAK_SLIDERS,
  SCOPE_ZOOM,
  REACTIVE_STRENGTH,
  FILM_GRAIN,
  ...SPARK_SLIDERS,
  ...MORE_SPARK_SLIDERS,
];

/** Switch for the audio-reactive play button and logo. */
export const REACTIVE_UI: StageToggleDef = {
  id: 'reactive-ui',
  key: 'audioReactivePulse',
  label: 'Reactive UI',
  explanation: 'The dock and play button glow and the logo swells with the music.',
  isOn: (value) => value !== false,
  toValue: (on) => on,
};

/** Switch for sparks on the progress bar. */
export const SPARKS: StageToggleDef = {
  id: 'sparks',
  key: 'sliderSparksEnabled',
  label: 'Sparks',
  explanation:
    'Sparks fly off the progress bar while music plays. Just for fun; slow devices may prefer them off.',
  isOn: (value) => value === true,
  toValue: (on) => on,
};

/** Switch for fading sparks out as they age. */
export const SPARK_FADE: StageToggleDef = {
  id: 'spark-fade',
  key: 'particleFadeMode',
  label: 'Fade out',
  explanation: 'Sparks fade away as they age instead of vanishing all at once.',
  isOn: (value) => value !== 'instant',
  toValue: (on) => (on ? 'fade' : 'instant'),
};

/** Every Stage switch, in panel order. */
export const STAGE_TOGGLES: readonly StageToggleDef[] = [REACTIVE_UI, SPARKS, SPARK_FADE];

/** Panel text that is not tied to one control. */
export const STAGE_COPY = {
  channelColors:
    "Each sound channel of the chip gets its own color: in the Mixer, in the spectrum's By channel colorings, and in the scopes' By channel traces.",
  accent:
    'The color of buttons, highlights and the play button glow. It leaves the channel colors alone.',
  reset: 'Puts everything in this panel back the way the site starts.',
  noVoices: 'Play something to see which color is which channel.',
};

/** A slider's stored value as a number, or its default when it is missing or not a number. */
export function sliderSetting(settings: Record<string, any>, def: StageSliderDef): number {
  const stored = settings[def.key];
  const value = stored === null || stored === undefined || stored === '' ? NaN : Number(stored);
  return Number.isFinite(value) ? value : (STAGE_DEFAULTS[def.key] as number);
}

/** Whether a switch is on, using its default when nothing is stored. */
export function toggleSetting(settings: Record<string, any>, def: StageToggleDef): boolean {
  const stored = settings[def.key];
  return def.isOn(stored === undefined || stored === null ? STAGE_DEFAULTS[def.key] : stored);
}

/** The value text for a stored setting, shown from the snapped or clamped slider position so stale values read true. */
export function displayValue(def: StageSliderDef, stored: number): string {
  return def.format(def.fromSlider(def.toSlider(stored)));
}
