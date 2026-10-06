const NSF_MAGIC = [0x4e, 0x45, 0x53, 0x4d, 0x1a]; // "NESM\x1A"
const NSF_EXPANSION_OFFSET = 0x7b;
/** GME's NSF voices start with the 2A03's five (Square 1, Square 2, Triangle, Noise, DMC). */
const APU_VOICES = 5;
const EXPANSION_BITS: [number, string][] = [
  [0x01, 'VRC6'],
  [0x02, 'VRC7'],
  [0x04, 'FDS'],
  [0x08, 'MMC5'],
  [0x10, 'N163'],
  [0x20, 'FME-7'],
];

/**
 * The expansion chip an NSF header declares: its name, 'Expansion' for several, '' for none, or
 * null when the bytes are not an NSF (NSFE, stub data, other formats).
 */
export function expansionFromNsfHeader(bytes: Uint8Array): string | null {
  if (bytes.length <= NSF_EXPANSION_OFFSET) return null;
  if (NSF_MAGIC.some((byte, i) => bytes[i] !== byte)) return null;
  const bits = bytes[NSF_EXPANSION_OFFSET];
  const chips = EXPANSION_BITS.filter(([bit]) => bits & bit).map(([, name]) => name);
  if (chips.length === 0) return '';
  return chips.length === 1 ? chips[0] : 'Expansion';
}

/** Guesses the expansion from GME's voice names when no header says (VRC6 has a saw, MMC5 a PCM voice). */
function guessExpansion(voiceNames: string[]): string {
  if (voiceNames.includes('Saw Wave')) return 'VRC6';
  if (voiceNames.includes('PCM')) return 'MMC5';
  return 'Expansion';
}

/** Chip of each voice: the first five are the 2A03's, later ones belong to the expansion. */
export function voiceChips(voiceNames: string[], expansion: string | null): string[] {
  const expansionChip = expansion || guessExpansion(voiceNames);
  return voiceNames.map((_, i) => (i < APU_VOICES ? '2A03' : expansionChip));
}
