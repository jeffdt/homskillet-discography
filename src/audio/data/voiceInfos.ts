import { LoadedTrack, VoiceMix } from '../types';
import { VoiceInfo } from './contract';

/** VoiceInfo for each voice of a loaded track; audible follows the same rule as computeVoiceGains. */
export function buildVoiceInfos(track: LoadedTrack | null, mix: VoiceMix): VoiceInfo[] {
  if (!track) return [];
  const anySolo = mix.soloed.some(Boolean);
  return track.info.voices.map((voice) => {
    const muted = !!mix.muted[voice.index];
    const soloed = !!mix.soloed[voice.index];
    return {
      index: voice.index,
      name: voice.name,
      chip: track.voiceChips[voice.index] || 'Expansion',
      muted,
      soloed,
      audible: !muted && (!anySolo || soloed),
    };
  });
}
