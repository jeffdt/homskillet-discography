import { ENGINE_PARAM_DEFS, PLAYER_KEY } from '../../players/EnginePlayer';
import { PlaybackState } from '../../types/playback';

/** The Mixer's sliders: tempo plus the engine's two parameters. */
export type MixerSliderId = 'tempo' | 'subbass' | 'stereoWidth';

/** A Mixer slider: what it changes, its range, its settings key and the line that explains it. */
export interface MixerSliderDef {
  id: MixerSliderId;
  label: string;
  explanation: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** User-settings key that keeps the value for every song. */
  settingKey: string;
}

function engineSlider(
  id: 'subbass' | 'stereoWidth',
  label: string,
  explanation: string
): MixerSliderDef {
  const def = ENGINE_PARAM_DEFS.find((candidate) => candidate.id === id)!;
  return {
    id,
    label,
    explanation,
    min: def.min!,
    max: def.max!,
    step: def.step!,
    defaultValue: def.defaultValue,
    settingKey: `${PLAYER_KEY}.${id}`,
  };
}

/** Speed, Bass boost and Stereo width, in display order. */
export const MIXER_SLIDERS: MixerSliderDef[] = [
  {
    id: 'tempo',
    label: 'Speed',
    explanation:
      "Runs the song's music code faster or slower. Notes keep their pitch; only the tempo changes.",
    min: 0.3,
    max: 2,
    step: 0.05,
    defaultValue: 1,
    settingKey: 'tempo',
  },
  engineSlider(
    'subbass',
    'Bass boost',
    'Follows the bass line and adds a synthesized tone one octave below it, deeper than the NES could play.'
  ),
  engineSlider(
    'stereoWidth',
    'Stereo width',
    'The NES plays in mono. The emulator pans the channels apart and adds a little echo; 0% is mono.'
  ),
];

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** The value a slider shows: the playing value, else the saved one, else the default. */
export function sliderValue(
  def: MixerSliderDef,
  playback: Pick<PlaybackState, 'playerKey' | 'tempo' | 'paramValues'>,
  settings: Record<string, any>
): number {
  const playing =
    playback.playerKey === null
      ? undefined
      : def.id === 'tempo'
        ? playback.tempo
        : playback.paramValues[def.id];
  return toNumber(playing) ?? toNumber(settings[def.settingKey]) ?? def.defaultValue;
}

/** A slider value as the Mixer shows it: 1.25 as "125%". */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
