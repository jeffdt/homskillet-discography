// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { loadRealChipCore, readTrack } from '../helpers/realChipCore';
import { ChipCore } from '../../audio/types';

describe('chip-core multi-channel exports', () => {
  let core: ChipCore;

  beforeAll(async () => {
    core = await loadRealChipCore();
  });

  it('exports the multi-channel GME API and gme_free_info', () => {
    const names = [
      '_gme_new_emu_multi_channel',
      '_gme_load_data',
      '_gme_identify_header',
      '_gme_identify_extension',
      '_gme_multi_channel',
      '_gme_free_info',
    ] as const;
    for (const name of names) {
      expect(typeof core[name]).toBe('function');
    }
  });

  it('opens a VRC6 track in multi-channel mode with 8 voices', () => {
    const bytes = readTrack('SuperFORE!/parkour.nsf');
    const ptr = core._malloc(bytes.length);
    core.HEAPU8.set(bytes, ptr);
    const type = core._gme_identify_extension(core._gme_identify_header(ptr));
    const emu = core._gme_new_emu_multi_channel(type, 48000);
    expect(core._gme_load_data(emu, ptr, bytes.length)).toBe(0);
    core._free(ptr);
    expect(core._gme_multi_channel(emu)).toBe(1);
    expect(core._gme_voice_count(emu)).toBe(8);
    core._gme_delete(emu);
  });
});
