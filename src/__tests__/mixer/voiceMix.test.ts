// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  CHIP_DESCRIPTIONS,
  clearedVoiceMix,
  groupByChip,
  hearOnly,
  mixOf,
  setVoiceLevel,
  toggleMute,
  toggleHeard,
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
    expect(clearedVoiceMix()).toEqual({
      muted: ALL_FALSE,
      soloed: ALL_FALSE,
      volume: new Array(8).fill(1),
      pan: new Array(8).fill(0),
      reverb: new Array(8).fill(0),
    });
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

describe('scope click helpers (mutes only, no solo)', () => {
  const four = (audible: boolean[], soloed: boolean[] = [false, false, false, false]) =>
    audible.map((heard, i) =>
      voiceInfo(i, `Voice ${i}`, {
        audible: heard,
        muted: !heard && !soloed.some(Boolean),
        soloed: soloed[i],
      })
    );

  it('mutes a heard voice and unmutes an unheard one', () => {
    expect(toggleHeard(four([true, true, true, true]), 1).muted.slice(0, 4)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(toggleHeard(four([true, false, true, true]), 1).muted.slice(0, 4)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it('turns a solo into mutes, so a click adds an unheard voice to what plays', () => {
    const soloedFirst = four([true, false, false, false], [true, false, false, false]);
    const mix = toggleHeard(soloedFirst, 1);
    expect(mix.muted.slice(0, 4)).toEqual([false, false, true, true]);
    expect(mix.soloed).toEqual(ALL_FALSE);
  });

  it('goes silent when the last heard voice is clicked', () => {
    expect(toggleHeard(four([false, true, false, false]), 1).muted.slice(0, 4)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('plays only the shift-clicked voice, then everything when it already plays alone', () => {
    const only = hearOnly(four([true, true, false, true]), 2);
    expect(only.muted.slice(0, 4)).toEqual([true, true, false, true]);
    expect(only.soloed).toEqual(ALL_FALSE);
    expect(hearOnly(four([false, false, true, false]), 2).muted).toEqual(ALL_FALSE);
  });
});

describe('channel levels', () => {
  const tuned = [
    voiceInfo(0, 'Square 1', { volume: 0.5, pan: -0.25 }),
    voiceInfo(2, 'Triangle', { reverb: 0.6 }),
  ];

  it('sets one level of one voice and keeps everything else', () => {
    const mix = setVoiceLevel(tuned, 2, 'volume', 1.75);
    expect(mix.volume!.slice(0, 3)).toEqual([0.5, 1, 1.75]);
    expect(mix.pan![0]).toBe(-0.25);
    expect(mix.reverb![2]).toBe(0.6);
  });

  it('keeps levels through mute, solo and scope clicks', () => {
    for (const mix of [
      toggleMute(tuned, 2),
      toggleSolo(tuned, 0),
      toggleHeard(tuned, 0),
      hearOnly(tuned, 2),
    ]) {
      expect(mix.volume![0]).toBe(0.5);
      expect(mix.pan![0]).toBe(-0.25);
      expect(mix.reverb![2]).toBe(0.6);
    }
  });
});
