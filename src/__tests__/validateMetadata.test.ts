import { describe, it, expect } from 'vitest';
import { validateMetadata } from '../catalog/validateMetadata';

const FILES = { Bazaar: ['groove.nsf', 'mt.nsf'] };

describe('validateMetadata', () => {
  it('accepts empty and well-formed metadata', () => {
    expect(validateMetadata({}, FILES)).toEqual([]);
    expect(
      validateMetadata({ albums: { Bazaar: { title: 'B', tracks: [{ file: 'mt.nsf' }] } } }, FILES)
    ).toEqual([]);
  });

  it('warns about albums without a folder', () => {
    expect(validateMetadata({ albums: { Gone: {} } }, FILES)).toEqual([
      'album "Gone" has no folder in public/music/',
    ]);
  });

  it('warns about missing, duplicate and malformed tracks', () => {
    const warnings = validateMetadata(
      {
        albums: {
          Bazaar: {
            tracks: [{ file: 'old.nsf' }, { file: 'mt.nsf' }, { file: 'mt.nsf' }, { title: 'x' }],
          },
        },
      },
      FILES
    );
    expect(warnings).toEqual([
      'album "Bazaar": "old.nsf" is not in public/music/Bazaar/',
      'album "Bazaar": "mt.nsf" is listed twice',
      'album "Bazaar": track 4 needs a "file" string',
    ]);
  });

  it('warns about wrong top-level shapes', () => {
    expect(validateMetadata([], FILES)).toEqual(['top level must be a JSON object']);
    expect(validateMetadata({ albums: [] }, FILES)).toEqual([
      '"albums" must be an object keyed by folder name',
    ]);
    expect(validateMetadata({ albums: { Bazaar: { tracks: {} } } }, FILES)).toEqual([
      'album "Bazaar": "tracks" must be an array',
    ]);
  });
});
