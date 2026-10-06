import { VoiceInfo } from '../../audio/data/contract';

/** A heard, unmuted 2A03 voice; overrides replace any field. */
export function voiceInfo(
  index: number,
  name: string,
  overrides: Partial<VoiceInfo> = {}
): VoiceInfo {
  return { index, name, chip: '2A03', muted: false, soloed: false, audible: true, ...overrides };
}
