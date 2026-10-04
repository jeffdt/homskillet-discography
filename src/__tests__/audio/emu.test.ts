// @vitest-environment node
import { describe, expect, it } from 'vitest';
import ChipCoreStub from '../../chip-core-stub';
import { ChipCore } from '../../audio/types';
import { metadataFromFilepath, openMultiChannelEmu, readTrackInfo } from '../../audio/render/emu';

describe('metadataFromFilepath', () => {
  it('takes the title from the file and the artist from the first folder', () => {
    expect(metadataFromFilepath('/SuperFORE!/parkour.nsf')).toEqual({
      title: 'parkour.nsf',
      artist: 'SuperFORE!',
    });
  });
});

describe('openMultiChannelEmu and readTrackInfo (stub core)', () => {
  it('opens an emulator and reads metadata, duration and voices', async () => {
    const core = (await ChipCoreStub()) as ChipCore;
    const emu = openMultiChannelEmu(core, new Uint8Array(16), 48000);
    core._gme_start_track(emu, 0);
    const info = readTrackInfo(core, emu, '/Album/track.nsf');
    expect(info.durationMs).toBe(180000);
    expect(info.gmeVoiceCount).toBe(5);
    expect(info.voices.map((v) => v.name)).toEqual([
      'Square 1',
      'Square 2',
      'Triangle',
      'Noise',
      'DMC',
    ]);
    expect(info.metadata.title).toBe('Mock Song');
    expect(info.metadata.artist).toBe('Homskillet');
    expect(info.metadata.formatted).toEqual({
      title: 'Mock Game - Mock Song',
      subtitle: 'Homskillet - Nintendo NES (2024)',
    });
  });

  it('throws when the file type is not recognized', async () => {
    const core = (await ChipCoreStub()) as ChipCore;
    core._gme_identify_extension = () => 0;
    expect(() => openMultiChannelEmu(core, new Uint8Array(16), 48000)).toThrow(
      /Unrecognized file type/
    );
  });
});
