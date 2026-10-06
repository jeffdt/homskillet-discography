// @vitest-environment node
import { describe, expect, it } from 'vitest';
import ChipCoreStub from '../../chip-core-stub';
import { ChipCore } from '../../audio/types';
import { INTERLEAVED_CHANNELS } from '../../audio/constants';

async function stub(): Promise<ChipCore> {
  return (await ChipCoreStub()) as ChipCore;
}

function openMulti(core: ChipCore): number {
  const type = core._gme_identify_extension(core._gme_identify_header(0));
  const emu = core._gme_new_emu_multi_channel(type, 48000);
  core._gme_load_data(emu, 0, 0);
  core._gme_start_track(emu, 0);
  return emu;
}

describe('chip-core stub', () => {
  it('creates multi-channel emulators with five named voices', async () => {
    const core = await stub();
    const emu = openMulti(core);
    expect(emu).toBeGreaterThan(0);
    expect(core._gme_multi_channel(emu)).toBe(1);
    expect(core._gme_voice_count(emu)).toBe(5);
    expect(core.UTF8ToString(core._gme_voice_name(emu, 2))).toBe('Triangle');
  });

  it('writes fake audio into voice pairs 0 to 4 and silence into 5 to 7', async () => {
    const core = await stub();
    const emu = openMulti(core);
    const frames = 4800;
    const ptr = core._malloc(frames * INTERLEAVED_CHANNELS * 2);
    core._gme_play(emu, frames * INTERLEAVED_CHANNELS, ptr);
    const peaks = new Array(8).fill(0);
    for (let f = 0; f < frames; f++) {
      for (let v = 0; v < 8; v++) {
        const s = core.HEAP16[(ptr >> 1) + f * INTERLEAVED_CHANNELS + 2 * v];
        peaks[v] = Math.max(peaks[v], Math.abs(s));
      }
    }
    expect(peaks.slice(0, 5).every((p) => p > 0)).toBe(true);
    expect(peaks.slice(5)).toEqual([0, 0, 0]);
  });

  it('advances song position by tempo', async () => {
    const core = await stub();
    const emu = openMulti(core);
    const ptr = core._malloc(48000 * INTERLEAVED_CHANNELS * 2);
    core._gme_play(emu, 48000 * INTERLEAVED_CHANNELS, ptr);
    expect(core._gme_tell_scaled(emu)).toBe(1000);
    core._gme_set_tempo(emu, 1.5);
    core._gme_play(emu, 48000 * INTERLEAVED_CHANNELS, ptr);
    expect(core._gme_tell_scaled(emu)).toBe(2500);
    core._gme_start_track(emu, 0);
    expect(core._gme_tell_scaled(emu)).toBe(0);
  });

  it('reuses freed memory', async () => {
    const core = await stub();
    const a = core._malloc(100);
    core._free(a);
    expect(core._malloc(100)).toBe(a);
  });
});
