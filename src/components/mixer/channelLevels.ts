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
    explanation:
      'Scales this channel on top of its own level in the song: 100% is as written, 200% twice as loud.',
    min: 0,
    max: VOICE_VOLUME_MAX,
    step: 0.05,
    defaultValue: DEFAULT_VOICE_VOLUME,
    format: formatPercent,
  },
  {
    id: 'pan',
    label: 'Pan',
    explanation:
      'Moves this channel left or right. C keeps where the emulator put it; R100 sends all of it to the right speaker.',
    min: -1,
    max: 1,
    step: 0.05,
    defaultValue: DEFAULT_VOICE_PAN,
    format: formatPan,
  },
  {
    id: 'reverb',
    label: 'Verb',
    explanation:
      'Sends this channel into a shared reverb, a simulated room built from echoing delay lines (Freeverb). More send, more room.',
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: DEFAULT_VOICE_REVERB,
    format: formatPercent,
  },
];
