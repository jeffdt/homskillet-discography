import {
  DEFAULT_VOICE_PAN,
  DEFAULT_VOICE_REVERB,
  DEFAULT_VOICE_VOLUME,
  VOICE_VOLUME_MAX,
} from '../../audio/render/voiceGains';
import { formatPercent } from './mixerControls';
import { VoiceLevel } from './voiceMix';

/** One of a channel strip's level controls: range, default, how it reads, and what it does. */
export interface ChannelLevelDef {
  id: VoiceLevel;
  label: string;
  /** Tooltip: what the control does, in a sentence. */
  explanation: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format: (value: number) => string;
}

/** A pan position as the strip shows it: "C" in the middle, "L40" or "R100" off it. */
export function formatPan(value: number): string {
  const amount = Math.round(Math.abs(value) * 100);
  if (amount === 0) return 'C';
  return `${value < 0 ? 'L' : 'R'}${amount}`;
}

/** Volume, Pan and Reverb, in strip order. */
export const CHANNEL_LEVELS: ChannelLevelDef[] = [
  {
    id: 'volume',
    label: 'Vol',
    explanation: "This channel's volume. 100% is as written.",
    min: 0,
    max: VOICE_VOLUME_MAX,
    step: 0.05,
    defaultValue: DEFAULT_VOICE_VOLUME,
    format: formatPercent,
  },
  {
    id: 'pan',
    label: 'Pan',
    explanation: 'Moves this channel left or right. C is the original position.',
    min: -1,
    max: 1,
    step: 0.05,
    defaultValue: DEFAULT_VOICE_PAN,
    format: formatPan,
  },
  {
    id: 'reverb',
    label: 'Verb',
    explanation: 'How much of this channel goes into the shared reverb.',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: DEFAULT_VOICE_REVERB,
    format: formatPercent,
  },
];
