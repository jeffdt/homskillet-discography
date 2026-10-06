// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  CHIP_DESCRIPTIONS,
  clearedVoiceMix,
  groupByChip,
  mixOf,
  toggleMute,
  toggleSolo,
} from '../../components/mixer/voiceMix';
import { voiceInfo } from '../helpers/voices';

const ALL_FALSE = [false, false, false, false, false, false, false, false];

describe('voice mix helpers', () => {
  it('reads the current mix from the voices, padded to eight', () => {
    const mix = mixOf([
      voiceInfo(0, 'Square 1', { muted: true }),
      voiceInfo(2, 'Triangle', { soloed: true }),
    ]);
    expect(mix.muted).toEqual([true, false, false, false, false, false, false, false]);
    expect(mix.soloed).toEqual([false, false, true, false, false, false, false, false]);
  });

  it('toggles one mute and keeps every other flag', () => {
    const voices = [voiceInfo(0, 'Square 1'), voiceInfo(1, 'Square 2', { soloed: true })];
    const mix = toggleMute(voices, 0);
    expect(mix.muted.slice(0, 2)).toEqual([true, false]);
    expect(mix.soloed.slice(0, 2)).toEqual([false, true]);
    expect(toggleMute([voiceInfo(0, 'Square 1', { muted: true })], 0).muted[0]).toBe(false);
  });

  it('keeps the solo flag when a soloed voice is muted', () => {
    const mix = toggleMute([voiceInfo(0, 'Square 1', { soloed: true })], 0);
    expect(mix.muted[0]).toBe(true);
    expect(mix.soloed[0]).toBe(true);
  });

  it('adds a solo without clearing other solos', () => {
    const voices = [voiceInfo(0, 'Square 1', { soloed: true }), voiceInfo(1, 'Square 2')];
    expect(toggleSolo(voices, 1).soloed.slice(0, 2)).toEqual([true, true]);
    expect(toggleSolo(voices, 0).soloed.slice(0, 2)).toEqual([false, false]);
  });

  it('never changes the voices it reads', () => {
    const voices = [voiceInfo(0, 'Square 1')];
    toggleMute(voices, 0);
    toggleSolo(voices, 0);
    expect(voices[0]).toEqual(voiceInfo(0, 'Square 1'));
  });

  it('clears every mute and solo', () => {
    expect(clearedVoiceMix()).toEqual({ muted: ALL_FALSE, soloed: ALL_FALSE });
  });

  it('groups voices by chip in track order', () => {
    const groups = groupByChip([
      voiceInfo(0, 'Square 1'),
      voiceInfo(5, 'Pulse 1', { chip: 'VRC6' }),
      voiceInfo(1, 'Triangle'),
    ]);
    expect(groups.map((group) => [group.chip, group.voices.map((v) => v.index)])).toEqual([
      ['2A03', [0, 1]],
      ['VRC6', [5]],
    ]);
  });

  it('describes every chip the engine can name', () => {
    ['2A03', 'VRC6', 'VRC7', 'FDS', 'MMC5', 'N163', 'FME-7'].forEach((chip) =>
      expect(CHIP_DESCRIPTIONS[chip]).toBeTruthy()
    );
    expect(CHIP_DESCRIPTIONS.Expansion).toBeUndefined();
  });
});
