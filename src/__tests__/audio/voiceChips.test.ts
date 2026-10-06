// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { expansionFromNsfHeader, voiceChips } from '../../audio/engine/voiceChips';
import { nsfHeader } from '../helpers/nsfHeader';

const APU = ['Square 1', 'Square 2', 'Triangle', 'Noise', 'DMC'];

describe('expansionFromNsfHeader', () => {
  it('reads the expansion byte of an NSF header', () => {
    expect(expansionFromNsfHeader(nsfHeader(0))).toBe('');
    expect(expansionFromNsfHeader(nsfHeader(0x01))).toBe('VRC6');
    expect(expansionFromNsfHeader(nsfHeader(0x08))).toBe('MMC5');
    expect(expansionFromNsfHeader(nsfHeader(0x10))).toBe('N163');
    expect(expansionFromNsfHeader(nsfHeader(0x20))).toBe('FME-7');
  });

  it('calls several expansions "Expansion"', () => {
    expect(expansionFromNsfHeader(nsfHeader(0x09))).toBe('Expansion');
  });

  it('returns null for data that is not an NSF', () => {
    expect(expansionFromNsfHeader(new Uint8Array(16))).toBeNull();
    const nsfe = new Uint8Array(0x80);
    nsfe.set([0x4e, 0x53, 0x46, 0x45]);
    expect(expansionFromNsfHeader(nsfe)).toBeNull();
  });
});

describe('voiceChips', () => {
  it('gives the APU voices to the 2A03 and the rest to the expansion', () => {
    expect(voiceChips([...APU, 'Saw Wave', 'Square 3', 'Square 4'], 'VRC6')).toEqual([
      '2A03',
      '2A03',
      '2A03',
      '2A03',
      '2A03',
      'VRC6',
      'VRC6',
      'VRC6',
    ]);
  });

  it('guesses VRC6 and MMC5 from voice names when there is no header', () => {
    expect(voiceChips([...APU, 'Saw Wave'], null)[5]).toBe('VRC6');
    expect(voiceChips([...APU, 'Square 3', 'Square 4', 'PCM'], null)[7]).toBe('MMC5');
    expect(voiceChips([...APU, 'Wave 1'], null)[5]).toBe('Expansion');
  });

  it('handles a plain 2A03 track', () => {
    expect(voiceChips(APU, '')).toEqual(new Array(5).fill('2A03'));
  });
});
