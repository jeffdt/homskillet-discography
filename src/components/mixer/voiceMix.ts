import { VOICE_PAIRS } from '../../audio/constants';
import { VoiceInfo } from '../../audio/data/contract';
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

/** The mute/solo state the voices show, as arrays of VOICE_PAIRS entries. */
export function mixOf(voices: readonly VoiceInfo[]): VoiceMix {
  const muted = new Array<boolean>(VOICE_PAIRS).fill(false);
  const soloed = new Array<boolean>(VOICE_PAIRS).fill(false);
  voices.forEach((voice) => {
    muted[voice.index] = voice.muted;
    soloed[voice.index] = voice.soloed;
  });
  return { muted, soloed };
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

/** Nothing muted, nothing soloed. */
export function clearedVoiceMix(): VoiceMix {
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
