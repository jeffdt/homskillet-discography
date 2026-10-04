import { describe, it, expect } from 'vitest';
import {
  RawDirectories,
  albumPlan,
  buildCatalog,
  escapeCatalogPath,
  normalizeMetadata,
  shuffleAllPlan,
  trackHref,
} from '../catalog/catalog';

const DIRS: RawDirectories = {
  '/': [
    { path: '/MetallicWing', type: 'directory' },
    { path: '/Bazaar', type: 'directory' },
    { path: '/Empty', type: 'directory' },
    { path: '/SuperFORE!', type: 'directory' },
  ],
  '/Bazaar': [
    { path: '/Bazaar/turban_youth.nsf', type: 'file' },
    { path: '/Bazaar/groove.nsf', type: 'file' },
    { path: '/Bazaar/mt.nsf', type: 'file' },
    { path: '/Bazaar/Extras', type: 'directory' },
  ],
  '/MetallicWing': [
    { path: '/MetallicWing/hope.nsf', type: 'file' },
    { path: '/MetallicWing/peril+intro.nsf', type: 'file' },
    { path: '/MetallicWing/track10.nsf', type: 'file' },
    { path: '/MetallicWing/track2.nsf', type: 'file' },
  ],
  '/Empty': [],
  '/SuperFORE!': [{ path: '/SuperFORE!/cave.nsf', type: 'file' }],
};

describe('buildCatalog with no metadata', () => {
  const catalog = buildCatalog(DIRS, {});

  it('lists non-empty albums alphabetically with CamelCase-split titles', () => {
    expect(catalog.albums.map((a) => a.id)).toEqual(['Bazaar', 'MetallicWing', 'SuperFORE!']);
    expect(catalog.albums.map((a) => a.title)).toEqual(['Bazaar', 'Metallic Wing', 'Super FORE!']);
  });

  it('orders tracks alphabetically with numeric collation and numbers them', () => {
    const mw = catalog.albumById.get('MetallicWing')!;
    expect(mw.tracks.map((t) => t.file)).toEqual([
      'hope.nsf',
      'peril+intro.nsf',
      'track2.nsf',
      'track10.nsf',
    ]);
    expect(mw.tracks.map((t) => t.number)).toEqual([1, 2, 3, 4]);
  });

  it('falls back to filename titles and null description, blurb and art', () => {
    const bazaar = catalog.albumById.get('Bazaar')!;
    expect(bazaar.tracks[0].title).toBe('Groove');
    expect(bazaar.description).toBeNull();
    expect(bazaar.art).toBeNull();
    expect(bazaar.tracks[0].blurb).toBeNull();
  });

  it('ignores nested folders', () => {
    expect(catalog.albumById.get('Bazaar')!.tracks).toHaveLength(3);
  });

  it('indexes tracks by id and href', () => {
    const track = catalog.trackById.get('SuperFORE!/cave.nsf')!;
    expect(track.albumId).toBe('SuperFORE!');
    expect(track.href).toBe('/music/SuperFORE!/cave.nsf');
    expect(catalog.trackByHref.get('/music/SuperFORE!/cave.nsf')).toBe(track);
  });
});

describe('buildCatalog with metadata', () => {
  const catalog = buildCatalog(DIRS, {
    tagline: 'Music for games that never shipped',
    about: 'About text',
    albums: {
      'SuperFORE!': { title: 'SuperFORE!', description: 'Golf.' },
      Missing: { title: 'Gone' },
      Bazaar: {
        tracks: [
          { file: 'mt.nsf', title: 'Mount', blurb: 'Written on a train.' },
          { file: 'deleted.nsf', title: 'Deleted' },
          { file: 'mt.nsf', title: 'Duplicate' },
        ],
      },
    },
  });

  it('puts metadata albums first in key order, then the rest alphabetically', () => {
    expect(catalog.albums.map((a) => a.id)).toEqual(['SuperFORE!', 'Bazaar', 'MetallicWing']);
  });

  it('uses metadata titles and descriptions', () => {
    expect(catalog.albumById.get('SuperFORE!')!.title).toBe('SuperFORE!');
    expect(catalog.albumById.get('SuperFORE!')!.description).toBe('Golf.');
    expect(catalog.tagline).toBe('Music for games that never shipped');
    expect(catalog.about).toBe('About text');
  });

  it('orders listed tracks first, skips missing files and duplicates, appends the rest alphabetically', () => {
    const bazaar = catalog.albumById.get('Bazaar')!;
    expect(bazaar.tracks.map((t) => t.file)).toEqual(['mt.nsf', 'groove.nsf', 'turban_youth.nsf']);
    expect(bazaar.tracks[0].title).toBe('Mount');
    expect(bazaar.tracks[0].blurb).toBe('Written on a train.');
  });
});

describe('normalizeMetadata', () => {
  it('returns empty metadata for non-objects', () => {
    expect(normalizeMetadata(null)).toEqual({});
    expect(normalizeMetadata('nope')).toEqual({});
    expect(normalizeMetadata([1, 2])).toEqual({});
  });

  it('drops wrong shapes and blank strings instead of throwing', () => {
    const meta = normalizeMetadata({
      tagline: '   ',
      about: 42,
      albums: {
        A: 'not an object',
        B: { title: '', description: ['x'], tracks: 'nope' },
        C: { tracks: [{ file: 'c.nsf', title: 7 }, { title: 'no file' }, null] },
      },
    });
    expect(meta.tagline).toBeNull();
    expect(meta.about).toBeNull();
    expect(meta.albums!.A).toBeUndefined();
    expect(meta.albums!.B).toEqual({ title: null, description: null, art: null, tracks: [] });
    expect(meta.albums!.C.tracks).toEqual([{ file: 'c.nsf', title: null, blurb: null }]);
  });

  it('feeds buildCatalog without breaking fallbacks', () => {
    const catalog = buildCatalog(DIRS, normalizeMetadata({ albums: { Bazaar: { title: '' } } }));
    expect(catalog.albumById.get('Bazaar')!.title).toBe('Bazaar');
  });
});

describe('hrefs', () => {
  it('escapes percent and hash in every position', () => {
    expect(escapeCatalogPath('A%B/#1#2.nsf')).toBe('A%25B/%231%232.nsf');
  });

  it('prefixes the catalog path', () => {
    expect(trackHref('MetallicWing', 'peril+intro.nsf')).toBe(
      '/music/MetallicWing/peril+intro.nsf'
    );
  });
});

describe('play plans', () => {
  const catalog = buildCatalog(DIRS, {});

  it('shuffleAllPlan covers every track and picks a start index from the random source', () => {
    const plan = shuffleAllPlan(catalog, () => 0.999)!;
    expect(plan.hrefs).toHaveLength(8);
    expect(plan.index).toBe(7);
    expect(shuffleAllPlan(catalog, () => 0)!.index).toBe(0);
  });

  it('shuffleAllPlan returns null for an empty catalog', () => {
    expect(shuffleAllPlan(buildCatalog({}, {}))).toBeNull();
  });

  it('albumPlan plays the album in order from the chosen track', () => {
    const album = catalog.albumById.get('Bazaar')!;
    expect(albumPlan(album, 1)).toEqual({ hrefs: album.tracks.map((t) => t.href), index: 1 });
  });
});
