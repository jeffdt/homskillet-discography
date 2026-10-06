import { PlayerMetadata } from '../../types/player';
import { DEFAULT_PLAY_LENGTH_MS, EXTENDED_PLAY_LENGTH_MS, VOICE_PAIRS } from '../constants';
import { ChipCore, EngineVoice, TrackInfo } from '../types';

// gme_info_t: 4 length ints, 12 reserved ints, then string pointers.
const INFO_STRINGS_OFFSET = 64;
const MAX_INFO_STRING = 255;

/** Guesses title and artist from a catalog path like "/Album/track.nsf" (artist is the first folder). */
export function metadataFromFilepath(filepath: string): { title: string; artist?: string } {
  const parts = filepath.split('/');
  const title = parts.pop() || '';
  parts.shift();
  return { title, artist: parts.shift() };
}

/**
 * Creates a GME emulator in multi-channel mode (8 stereo pairs, one per voice) and loads the file
 * into it. Throws an Error describing the failure.
 */
export function openMultiChannelEmu(core: ChipCore, bytes: Uint8Array, sampleRate: number): number {
  const dataPtr = core._malloc(bytes.length);
  core.HEAPU8.set(bytes, dataPtr);
  try {
    const extension = core._gme_identify_header(dataPtr);
    const type = core._gme_identify_extension(extension);
    if (!type) throw new Error(`Unrecognized file type "${core.UTF8ToString(extension)}"`);
    const emu = core._gme_new_emu_multi_channel(type, sampleRate);
    if (!emu) throw new Error('gme_new_emu_multi_channel returned NULL');
    const loadError = core._gme_load_data(emu, dataPtr, bytes.length);
    if (loadError) {
      core._gme_delete(emu);
      throw new Error(`gme_load_data: ${core.UTF8ToString(loadError)}`);
    }
    if (!core._gme_multi_channel(emu)) {
      core._gme_delete(emu);
      throw new Error('Emulator is not in multi-channel mode');
    }
    return emu;
  } finally {
    core._free(dataPtr);
  }
}

// Local copy of util.ts's allOrNone: util.ts imports React, which must stay out of the worklet bundle.
function allOrNone(...args: (string | undefined)[]): string {
  let text = '';
  for (const arg of args) {
    if (!arg) return '';
    text += arg;
  }
  return text;
}

// NSF strings are ISO-8859-1, so read bytes directly instead of UTF8ToString.
function readLatin1(heap: Uint8Array, ptr: number): string {
  if (!ptr) return '';
  let value = '';
  for (let i = 0; i < MAX_INFO_STRING; i++) {
    const code = heap[ptr + i];
    if (code === 0) break;
    value += String.fromCharCode(code);
  }
  return value;
}

/** Reads metadata, duration and voice names for track 0 of a started emulator. */
export function readTrackInfo(core: ChipCore, emu: number, filepath: string): TrackInfo {
  const metadata: PlayerMetadata = {};
  let song = '';
  let author = '';
  let playLength = DEFAULT_PLAY_LENGTH_MS;
  const outPtr = core._malloc(4);
  try {
    if (core._gme_track_info(emu, outPtr, 0) === 0) {
      const info = core.HEAP32[outPtr >> 2];
      const ints = info >> 2;
      metadata.length = core.HEAP32[ints];
      metadata.intro_length = core.HEAP32[ints + 1];
      metadata.loop_length = core.HEAP32[ints + 2];
      metadata.play_length = core.HEAP32[ints + 3];
      playLength = metadata.play_length;
      const text = (k: number) =>
        readLatin1(core.HEAPU8, core.HEAP32[(info + INFO_STRINGS_OFFSET + 4 * k) >> 2]);
      metadata.system = text(0);
      metadata.game = text(1);
      song = text(2);
      author = text(3);
      metadata.copyright = text(4);
      metadata.comment = text(5);
      core._gme_free_info(info);
    } else {
      console.error('gme_track_info failed for %s', filepath);
    }
  } finally {
    core._free(outPtr);
  }

  const fallback = metadataFromFilepath(filepath);
  metadata.title = song || metadata.game || fallback.title;
  metadata.artist = author || fallback.artist;
  metadata.formatted = {
    title:
      metadata.game === metadata.title
        ? metadata.title
        : allOrNone(metadata.game ?? undefined, ' - ') + metadata.title,
    subtitle:
      [metadata.artist, metadata.system].filter((x) => x).join(' - ') +
      allOrNone(' (', metadata.copyright ?? undefined, ')'),
  };

  const gmeVoiceCount = core._gme_voice_count(emu);
  const voices: EngineVoice[] = [];
  for (let i = 0; i < Math.min(gmeVoiceCount, VOICE_PAIRS); i++) {
    voices.push({ index: i, name: core.UTF8ToString(core._gme_voice_name(emu, i)) });
  }

  const durationMs = playLength === DEFAULT_PLAY_LENGTH_MS ? EXTENDED_PLAY_LENGTH_MS : playLength;
  return { metadata, durationMs, voices, gmeVoiceCount };
}
