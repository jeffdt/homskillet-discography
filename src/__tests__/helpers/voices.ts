import { VoiceInfo } from '../../audio/data/contract';

/** A heard, unmuted 2A03 voice at full volume, centered and dry; overrides replace any field. */
export function voiceInfo(
  index: number,
  name: string,
  overrides: Partial<VoiceInfo> = {}
): VoiceInfo {
  return {
    index,
    name,
    chip: '2A03',
    muted: false,
    soloed: false,
    audible: true,
    volume: 1,
    pan: 0,
    reverb: 0,
    ...overrides,
  };
}
