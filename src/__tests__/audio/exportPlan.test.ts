import { describe, expect, it } from 'vitest';
import {
  EXPORT_ARTIST,
  estimateBytes,
  exportFileName,
  exportFrameCount,
  exportSettings,
  formatLength,
  formatMegabytes,
  isLongWav,
  lengthError,
  mixDiffers,
  mixSummary,
  MixSnapshot,
  parseLength,
  sanitizeFileName,
} from '../../audio/export/exportPlan';
import { voiceInfo } from '../helpers/voices';

const VOICES = [voiceInfo(0, 'Square 1'), voiceInfo(1, 'Square 2'), voiceInfo(2, 'Triangle')];
const ORIGINAL: MixSnapshot = { tempo: 1, subbass: 0, stereoWidth: 1, voices: VOICES };
const muted = (index: number, name: string) =>
  voiceInfo(index, name, { muted: true, audible: false });

describe('parseLength', () => {
  it.each([
    ['3:04', 184000],
    ['0:05', 5000],
    ['10:00', 600000],
    [' 2:30 ', 150000],
    ['184', 184000],
    ['0', 0],
  ])('reads %j as %d ms', (text, ms) => {
    expect(parseLength(text)).toBe(ms);
  });

  it.each(['', 'abc', '3:75', '3:4', '1:2:3', '-1', '3.5'])('rejects %j', (text) => {
    expect(parseLength(text)).toBeNull();
  });
});

describe('formatLength', () => {
  it.each([
    [184000, '3:04'],
    [5000, '0:05'],
    [600000, '10:00'],
    [183600, '3:04'],
  ])('formats %d as %s', (ms, text) => {
    expect(formatLength(ms)).toBe(text);
  });
});

describe('lengthError', () => {
  it('accepts the bounds', () => {
    expect(lengthError(5000)).toBeNull();
    expect(lengthError(600000)).toBeNull();
  });

  it('explains each failure', () => {
    expect(lengthError(null)).toBe('Enter a length like 3:04.');
    expect(lengthError(4000)).toBe('Must be at least 0:05.');
    expect(lengthError(601000)).toBe('Must be at most 10:00.');
  });
});

describe('sizes', () => {
  it('counts output frames at 48 kHz', () => {
    expect(exportFrameCount(184000)).toBe(8832000);
  });

  it('estimates a WAV as 4 bytes per frame plus the 44-byte header', () => {
    expect(estimateBytes('wav', 1000)).toBe(48000 * 4 + 44);
  });

  it('estimates an MP3 at 320 kbps', () => {
    expect(estimateBytes('mp3', 1000)).toBe(40000);
  });

  it('formats megabytes, never below 1', () => {
    expect(formatMegabytes(92_160_044)).toBe('about 92 MB');
    expect(formatMegabytes(200_000)).toBe('about 1 MB');
  });

  it('flags WAVs longer than 5:00 only', () => {
    expect(isLongWav('wav', 300000)).toBe(false);
    expect(isLongWav('wav', 301000)).toBe(true);
    expect(isLongWav('mp3', 600000)).toBe(false);
  });
});

describe('mix', () => {
  it('sees no difference in the original mix', () => {
    expect(mixDiffers(ORIGINAL)).toBe(false);
    expect(mixSummary(ORIGINAL)).toBe('');
  });

  it('summarizes changed sliders in Mixer order', () => {
    const mix = { ...ORIGINAL, tempo: 1.1, subbass: 0.4 };
    expect(mixDiffers(mix)).toBe(true);
    expect(mixSummary(mix)).toBe('Speed 110% · Bass boost 40%');
  });

  it('names muted voices', () => {
    const mix = { ...ORIGINAL, voices: [VOICES[0], muted(1, 'Square 2'), muted(2, 'Triangle')] };
    expect(mixDiffers(mix)).toBe(true);
    expect(mixSummary(mix)).toBe('Square 2 muted · Triangle muted');
  });

  it('names the heard voices when something is soloed', () => {
    const voices = [
      voiceInfo(0, 'Square 1', { soloed: true }),
      voiceInfo(1, 'Square 2', { audible: false }),
      voiceInfo(2, 'Triangle', { soloed: true }),
    ];
    expect(mixSummary({ ...ORIGINAL, stereoWidth: 0, voices })).toBe(
      'Stereo width 0% · Only Square 1 + Triangle'
    );
  });

  it('says every voice is silent when the only soloed voice is also muted', () => {
    const voices = [
      voiceInfo(0, 'Square 1', { soloed: true, muted: true, audible: false }),
      voiceInfo(1, 'Square 2', { audible: false }),
      voiceInfo(2, 'Triangle', { audible: false }),
    ];
    expect(mixSummary({ ...ORIGINAL, tempo: 1.15, voices })).toBe('Speed 115% · All voices silent');
  });

  it('builds renderer settings and gains from the mix', () => {
    const voices = [VOICES[0], muted(1, 'Square 2')];
    const { settings, gains } = exportSettings({
      tempo: 1.5,
      subbass: 0.2,
      stereoWidth: 0.5,
      voices,
    });
    expect(settings).toEqual({ tempo: 1.5, subBass: 0.2, stereoWidth: 0.5, loopForever: false });
    expect(gains).toEqual([1, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('uses defaults and all voices for the original', () => {
    const { settings, gains } = exportSettings(null);
    expect(settings).toEqual({ tempo: 1, subBass: 0, stereoWidth: 1, loopForever: false });
    expect(gains).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });
});

describe('file names', () => {
  it('prefixes the lowercase artist', () => {
    expect(EXPORT_ARTIST).toBe('homskillet');
    expect(exportFileName('Aquatics', false, 'mp3')).toBe('homskillet - Aquatics.mp3');
  });

  it('marks a custom mix', () => {
    expect(exportFileName('Aquatics', true, 'wav')).toBe('homskillet - Aquatics (custom mix).wav');
  });

  it('replaces characters file systems reject', () => {
    expect(exportFileName('Rock and/or Roll', false, 'mp3')).toBe(
      'homskillet - Rock and-or Roll.mp3'
    );
    expect(sanitizeFileName('a:b*c?"d<e>f|g\\h\u0001i')).toBe('a-b-c--d-e-f-g-h-i');
  });

  it('keeps non-ASCII and collapses whitespace', () => {
    expect(sanitizeFileName('  Café   Ñ  ')).toBe('Café Ñ');
  });
});
