import { describe, it, expect } from 'vitest';
import { buildCatalog } from '../catalog/catalog';
import { buildPlayUrl, parseInitialLocation, stripPlayParams } from '../shell/playUrl';

const catalog = buildCatalog(
  {
    '/': [
      { path: '/MetallicWing', type: 'directory' },
      { path: '/SuperFORE!', type: 'directory' },
      { path: '/Demo Album', type: 'directory' },
    ],
    '/MetallicWing': [{ path: '/MetallicWing/peril+intro.nsf', type: 'file' }],
    '/SuperFORE!': [{ path: '/SuperFORE!/cave.nsf', type: 'file' }],
    '/Demo Album': [{ path: '/Demo Album/Track 01 - Intro.nsf', type: 'file' }],
  },
  {}
);

describe('parseInitialLocation', () => {
  it('finds the shared track with or without a leading slash', () => {
    expect(parseInitialLocation('/', '?play=SuperFORE!%2Fcave.nsf', catalog).sharedTrack!.id).toBe(
      'SuperFORE!/cave.nsf'
    );
    expect(
      parseInitialLocation('/', '?play=%2FSuperFORE!%2Fcave.nsf', catalog).sharedTrack!.id
    ).toBe('SuperFORE!/cave.nsf');
  });

  it('reads a start time only alongside a known track', () => {
    expect(parseInitialLocation('/', '?play=SuperFORE!%2Fcave.nsf&t=5000', catalog).startMs).toBe(
      5000
    );
    expect(parseInitialLocation('/', '?t=5000', catalog).startMs).toBe(0);
  });

  it('ignores unknown tracks and garbage times', () => {
    const parsed = parseInitialLocation('/', '?play=Gone%2Fold.nsf&t=abc', catalog);
    expect(parsed.sharedTrack).toBeNull();
    expect(parsed.startMs).toBe(0);
    expect(parseInitialLocation('/', '?play=SuperFORE!%2Fcave.nsf&t=-9', catalog).startMs).toBe(0);
  });

  it('maps an old album path to an album id', () => {
    expect(parseInitialLocation('/MetallicWing', '', catalog).albumId).toBe('MetallicWing');
    expect(parseInitialLocation('/Demo%20Album/', '', catalog).albumId).toBe('Demo Album');
    expect(parseInitialLocation('/Nope', '', catalog).albumId).toBeNull();
    expect(parseInitialLocation('/%E0%A4%A', '', catalog).albumId).toBeNull();
  });
});

describe('buildPlayUrl', () => {
  it('round-trips ids with special characters', () => {
    for (const id of [
      'MetallicWing/peril+intro.nsf',
      'SuperFORE!/cave.nsf',
      'Demo Album/Track 01 - Intro.nsf',
    ]) {
      const url = buildPlayUrl(id, '');
      const search = url.slice(url.indexOf('?'));
      expect(parseInitialLocation('/', search, catalog).sharedTrack!.id).toBe(id);
    }
  });

  it('keeps unrelated params and drops t', () => {
    expect(buildPlayUrl('SuperFORE!/cave.nsf', '?debug=true&t=500&play=x')).toBe(
      '/?debug=true&play=SuperFORE%21%2Fcave.nsf'
    );
  });
});

describe('stripPlayParams', () => {
  it('removes play and t but keeps the rest', () => {
    expect(stripPlayParams('?play=a&t=1&debug=true')).toBe('?debug=true');
    expect(stripPlayParams('?play=a')).toBe('');
  });

  it("removes a share link's settings too", () => {
    expect(
      stripPlayParams(
        '?play=a&speed=0.5&mute=1&vol=50&pan=0_20&verb=10&viz=e30&solo=2&bass=1&stereo=0&debug=1'
      )
    ).toBe('?debug=1');
  });
});

describe('shared settings', () => {
  it('come with a known shared track only', () => {
    expect(
      parseInitialLocation('/', '?play=SuperFORE!%2Fcave.nsf&speed=0.5', catalog).shared!.sliders
    ).toEqual({
      tempo: 0.5,
    });
    expect(parseInitialLocation('/', '?play=Gone%2Fx.nsf&speed=0.5', catalog).shared).toBeNull();
    expect(parseInitialLocation('/', '?play=SuperFORE!%2Fcave.nsf', catalog).shared).toBeNull();
  });

  it('are dropped from the address bar link for the next track', () => {
    expect(buildPlayUrl('SuperFORE!/cave.nsf', '?play=x&mute=1&viz=e30')).toBe(
      '/?play=SuperFORE%21%2Fcave.nsf'
    );
  });
});
