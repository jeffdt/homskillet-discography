import { VOICE_PAIRS } from '../../audio/constants';
import { VoiceInfo } from '../../audio/data/contract';
import {
  DEFAULT_VOICE_PAN,
  DEFAULT_VOICE_REVERB,
  DEFAULT_VOICE_VOLUME,
} from '../../audio/render/voiceGains';
import { VoiceMix } from '../../audio/types';

/** One plain-language line per sound chip, shown above its channel strips. "Expansion" has none. */
export const CHIP_DESCRIPTIONS: Record<string, string> = {
  '2A03': "The NES's own sound chip: two pulse waves, a triangle, noise and samples.",
  VRC6: "Konami's expansion chip: two more pulse waves and a sawtooth.",
  VRC7: "Konami's FM synthesis chip.",
  FDS: "The Famicom Disk System's wavetable voice.",
  MMC5: "Nintendo's expansion chip: two more pulse waves.",
  N163: "Namco's wavetable chip, with up to eight voices.",
  'FME-7': "Sunsoft's chip: three more square waves.",
};

/** A channel's continuous mixer settings, each with its own control on the strip. */
export type VoiceLevel = 'volume' | 'pan' | 'reverb';

/** The mix the voices show, as arrays of VOICE_PAIRS entries. */
export function mixOf(voices: readonly VoiceInfo[]): Required<VoiceMix> {
  const muted = new Array<boolean>(VOICE_PAIRS).fill(false);
  const soloed = new Array<boolean>(VOICE_PAIRS).fill(false);
  const volume = new Array<number>(VOICE_PAIRS).fill(DEFAULT_VOICE_VOLUME);
  const pan = new Array<number>(VOICE_PAIRS).fill(DEFAULT_VOICE_PAN);
  const reverb = new Array<number>(VOICE_PAIRS).fill(DEFAULT_VOICE_REVERB);
  voices.forEach((voice) => {
    muted[voice.index] = voice.muted;
    soloed[voice.index] = voice.soloed;
    volume[voice.index] = voice.volume;
    pan[voice.index] = voice.pan;
    reverb[voice.index] = voice.reverb;
  });
  return { muted, soloed, volume, pan, reverb };
}

/** The mix with one of voice index's levels set and everything else unchanged. */
export function setVoiceLevel(
  voices: readonly VoiceInfo[],
  index: number,
  level: VoiceLevel,
  value: number
): VoiceMix {
  const mix = mixOf(voices);
  mix[level][index] = value;
  return mix;
}

/** The mix with voice index's mute flipped and everything else unchanged. */
export function toggleMute(voices: readonly VoiceInfo[], index: number): VoiceMix {
  const mix = mixOf(voices);
  mix.muted[index] = !mix.muted[index];
  return mix;
}

/** The mix with voice index's solo flipped; other solos stay, so several voices can be soloed. */
export function toggleSolo(voices: readonly VoiceInfo[], index: number): VoiceMix {
  const mix = mixOf(voices);
  mix.soloed[index] = !mix.soloed[index];
  return mix;
}

/*
 * Clicking a scope uses the two helpers below, which keep only mutes and clear every solo (levels
 * such as volume and reverb stay as they are): a click
 * flips whether you hear that voice, so it always does something even while voices are soloed,
 * and clicking the last voice you hear goes silent.
 *
 * The alternative we weighed: keep solo. While anything is soloed a click adds or removes that
 * voice from the solo (toggleSolo), otherwise it mutes (toggleMute); shift-click soloes only that
 * voice. The Mixer then shows solos, and mutes set before soloing come back when the solo ends,
 * but removing the last soloed voice suddenly plays every voice instead of going silent.
 */

/** The mix that flips whether voice index is heard, as mutes only: any solo becomes mutes. */
export function toggleHeard(voices: readonly VoiceInfo[], index: number): VoiceMix {
  const mix = withoutMuteOrSolo(voices);
  voices.forEach((voice) => {
    const heard = voice.index === index ? !voice.audible : voice.audible;
    mix.muted[voice.index] = !heard;
  });
  return mix;
}

/** The mix that plays only voice index, as mutes; if it already plays alone, every voice plays. */
export function hearOnly(voices: readonly VoiceInfo[], index: number): VoiceMix {
  const mix = withoutMuteOrSolo(voices);
  const alone = voices.every((voice) => voice.audible === (voice.index === index));
  if (alone) return mix;
  voices.forEach((voice) => {
    mix.muted[voice.index] = voice.index !== index;
  });
  return mix;
}

function withoutMuteOrSolo(voices: readonly VoiceInfo[]): Required<VoiceMix> {
  const mix = mixOf(voices);
  mix.muted.fill(false);
  mix.soloed.fill(false);
  return mix;
}

/** Nothing muted or soloed, every voice at full volume, centered and dry. */
export function clearedVoiceMix(): Required<VoiceMix> {
  return mixOf([]);
}

/** The voices of one sound chip. */
export interface ChipGroup {
  chip: string;
  voices: VoiceInfo[];
}

/** Voices grouped by chip, groups in order of each chip's first voice, voices in track order. */
export function groupByChip(voices: readonly VoiceInfo[]): ChipGroup[] {
  const groups: ChipGroup[] = [];
  voices.forEach((voice) => {
    let group = groups.find((candidate) => candidate.chip === voice.chip);
    if (!group) {
      group = { chip: voice.chip, voices: [] };
      groups.push(group);
    }
    group.voices.push(voice);
  });
  return groups;
}
