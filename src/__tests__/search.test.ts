import { describe, it, expect } from 'vitest';
import { RawDirectories, buildCatalog } from '../catalog/catalog';
import { normalize, searchTracks } from '../catalog/search';

const DIRS: RawDirectories = {
  '/': [
    { path: '/Bazaar', type: 'directory' },
    { path: '/MetallicWing', type: 'directory' },
  ],
  '/Bazaar': [
    { path: '/Bazaar/turban_youth.nsf', type: 'file' },
    { path: '/Bazaar/groove.nsf', type: 'file' },
    { path: '/Bazaar/hopeless.nsf', type: 'file' },
  ],
  '/MetallicWing': [
    { path: '/MetallicWing/hope.nsf', type: 'file' },
    { path: '/MetallicWing/peril.nsf', type: 'file' },
    { path: '/MetallicWing/grove_theme.nsf', type: 'file' },
  ],
};

const catalog = buildCatalog(DIRS, {
  albums: {
    Bazaar: { tracks: [{ file: 'groove.nsf', title: 'Café Groove' }] },
  },
});

/** Track ids of the results, best first. */
const ids = (query: string, limit?: number) =>
  searchTracks(catalog, query, limit).map((r) => r.track.id);

describe('normalize', () => {
  it('lowercases, drops accents and splits CamelCase and punctuation', () => {
    expect(normalize('MetallicWing/Café_Groove!')).toBe('metallic wing cafe groove');
  });
});

describe('searchTracks', () => {
  it('returns nothing for a blank query', () => {
    expect(searchTracks(catalog, '   ')).toEqual([]);
  });

  it('ranks a whole-word title match above a longer title that only starts with it', () => {
    expect(ids('hope')).toEqual(['MetallicWing/hope.nsf', 'Bazaar/hopeless.nsf']);
  });

  it('narrows by album when a word names the album', () => {
    expect(ids('bazaar hope')).toEqual(['Bazaar/hopeless.nsf']);
    expect(ids('metallic hope')).toEqual(['MetallicWing/hope.nsf']);
  });

  it('matches scattered letters in order', () => {
    expect(ids('trbn')).toEqual(['Bazaar/turban_youth.nsf']);
  });

  it('matches custom titles without accents', () => {
    expect(ids('cafe')).toEqual(['Bazaar/groove.nsf']);
  });

  it('matches the file name when the title differs', () => {
    expect(ids('groove')[0]).toBe('Bazaar/groove.nsf');
  });

  it('drops tracks where any word fails to match', () => {
    expect(ids('hope zzz')).toEqual([]);
  });

  it('gives the album index of each result for playback', () => {
    const [result] = searchTracks(catalog, 'peril');
    expect(result.album.id).toBe('MetallicWing');
    expect(result.album.tracks[result.index].id).toBe('MetallicWing/peril.nsf');
  });

  it('caps the number of results', () => {
    expect(ids('e', 2)).toHaveLength(2);
  });
});
