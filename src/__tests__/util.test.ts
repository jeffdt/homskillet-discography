import { describe, it, expect } from 'vitest';
import {
  pathJoin,
  titlesFromMetadata,
  allOrNone,
  formatSongDisplayName,
  remap,
  remap01,
} from '../util';

describe('pathJoin', () => {
  it('should join two simple parts', () => {
    expect(pathJoin('foo', 'bar')).toBe('foo/bar');
  });

  it('should join multiple parts', () => {
    expect(pathJoin('foo', 'bar', 'baz')).toBe('foo/bar/baz');
  });

  it('should preserve leading slash on first part', () => {
    expect(pathJoin('/foo', 'bar')).toBe('/foo/bar');
  });

  it('should preserve trailing slash on last part', () => {
    expect(pathJoin('foo', 'bar/')).toBe('foo/bar/');
  });

  it('should remove internal slashes between parts', () => {
    expect(pathJoin('foo/', '/bar')).toBe('foo/bar');
    expect(pathJoin('foo/', '/bar/', '/baz')).toBe('foo/bar/baz');
  });

  it('should handle parts with only slashes', () => {
    expect(pathJoin('/', 'foo')).toBe('/foo');
    expect(pathJoin('foo', '/')).toBe('foo/');
  });

  it('should handle empty parts', () => {
    expect(pathJoin('', 'foo')).toBe('/foo');
    expect(pathJoin('foo', '')).toBe('foo/');
    expect(pathJoin('foo', '', 'bar')).toBe('foo//bar');
  });

  it('should preserve both leading and trailing slashes', () => {
    expect(pathJoin('/foo', 'bar/')).toBe('/foo/bar/');
  });
});

describe('allOrNone', () => {
  it('should concatenate all strings when all are defined', () => {
    expect(allOrNone('a', 'b', 'c')).toBe('abc');
  });

  it('should return empty string if any argument is undefined', () => {
    expect(allOrNone('a', undefined, 'c')).toBe('');
    expect(allOrNone(undefined, 'b', 'c')).toBe('');
    expect(allOrNone('a', 'b', undefined)).toBe('');
  });

  it('should return empty string if any argument is empty string', () => {
    expect(allOrNone('a', '', 'c')).toBe('');
  });

  it('should handle single argument', () => {
    expect(allOrNone('hello')).toBe('hello');
    expect(allOrNone(undefined)).toBe('');
  });

  it('should handle no arguments', () => {
    expect(allOrNone()).toBe('');
  });

  it('should handle special characters', () => {
    expect(allOrNone(' - ', 'test', ' (', '1990', ')')).toBe(' - test (1990)');
  });
});

describe('titlesFromMetadata', () => {
  it('should return formatted titles when provided', () => {
    const metadata = {
      title: 'Song',
      formatted: {
        title: 'Custom Title',
        subtitle: 'Custom Subtitle',
      },
    };
    expect(titlesFromMetadata(metadata)).toEqual({
      title: 'Custom Title',
      subtitle: 'Custom Subtitle',
    });
  });

  it('should format title with artist when artist is provided', () => {
    const metadata = {
      title: 'Song Name',
      artist: 'Artist Name',
    };
    expect(titlesFromMetadata(metadata)).toEqual({
      title: 'Artist Name - Song Name',
      subtitle: '',
    });
  });

  it('should format title without artist when artist is missing', () => {
    const metadata = {
      title: 'Song Name',
    };
    expect(titlesFromMetadata(metadata)).toEqual({
      title: 'Song Name',
      subtitle: '',
    });
  });

  it('should format subtitle with game and system', () => {
    const metadata = {
      title: 'Song Name',
      game: 'Game Title',
      system: 'NES',
    };
    expect(titlesFromMetadata(metadata)).toEqual({
      title: 'Song Name',
      subtitle: 'Game Title - NES',
    });
  });

  it('should format subtitle with copyright', () => {
    const metadata = {
      title: 'Song Name',
      game: 'Game Title',
      copyright: '1990',
    };
    expect(titlesFromMetadata(metadata)).toEqual({
      title: 'Song Name',
      subtitle: 'Game Title (1990)',
    });
  });

  it('should format subtitle with all fields', () => {
    const metadata = {
      title: 'Song Name',
      artist: 'Artist Name',
      game: 'Game Title',
      system: 'NES',
      copyright: '1990',
    };
    expect(titlesFromMetadata(metadata)).toEqual({
      title: 'Artist Name - Song Name',
      subtitle: 'Game Title - NES (1990)',
    });
  });

  it('should handle missing subtitle fields', () => {
    const metadata = {
      title: 'Song Name',
      artist: 'Artist Name',
    };
    expect(titlesFromMetadata(metadata)).toEqual({
      title: 'Artist Name - Song Name',
      subtitle: '',
    });
  });
});

describe('formatSongDisplayName', () => {
  it('should return empty string for null', () => {
    expect(formatSongDisplayName(null)).toBe('');
  });

  it('should format folder and filename', () => {
    expect(formatSongDisplayName('/music/Album/song.nsf')).toBe('Album - song');
  });

  it('should handle NSFE extension', () => {
    expect(formatSongDisplayName('/music/Album/song.nsfe')).toBe('Album - song');
  });

  it('should replace underscores with spaces in filename', () => {
    expect(formatSongDisplayName('/music/Album/my_song_name.nsf')).toBe('Album - my song name');
  });

  it('should handle catalog prefix pattern', () => {
    expect(formatSongDisplayName('http://localhost:3000/music/Album/song.nsf')).toBe(
      'Album - song'
    );
  });

  it('should handle paths with only filename', () => {
    expect(formatSongDisplayName('/song.nsf')).toBe('song');
  });

  it('should handle filename without extension', () => {
    expect(formatSongDisplayName('/music/Album/song')).toBe('Album - song');
  });

  it('should handle deep nested paths', () => {
    expect(formatSongDisplayName('/music/Artist/Album/song.nsf')).toBe('Album - song');
  });

  it('should decode URI encoded names', () => {
    expect(formatSongDisplayName('/music/My%20Album/my%20song.nsf')).toBe('My Album - my song');
  });
});

describe('remap', () => {
  it('should remap value from one range to another', () => {
    expect(remap(5, 0, 10, 0, 100)).toBe(50);
  });

  it('should remap to different scale', () => {
    expect(remap(0, 0, 10, 100, 200)).toBe(100);
    expect(remap(10, 0, 10, 100, 200)).toBe(200);
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
  });

  it('should handle negative ranges', () => {
    expect(remap(0, -10, 10, 0, 100)).toBe(50);
    expect(remap(-10, -10, 10, 0, 100)).toBe(0);
    expect(remap(10, -10, 10, 0, 100)).toBe(100);
  });

  it('should handle inverted target range', () => {
    expect(remap(0, 0, 10, 100, 0)).toBe(100);
    expect(remap(10, 0, 10, 100, 0)).toBe(0);
    expect(remap(5, 0, 10, 100, 0)).toBe(50);
  });

  it('should handle decimal values', () => {
    expect(remap(2.5, 0, 10, 0, 1)).toBe(0.25);
  });
});

describe('remap01', () => {
  it('should remap from 0-1 range', () => {
    expect(remap01(0, 0, 100)).toBe(0);
    expect(remap01(1, 0, 100)).toBe(100);
    expect(remap01(0.5, 0, 100)).toBe(50);
  });

  it('should handle negative target range', () => {
    expect(remap01(0.5, -10, 10)).toBe(0);
    expect(remap01(0, -10, 10)).toBe(-10);
    expect(remap01(1, -10, 10)).toBe(10);
  });

  it('should handle inverted range', () => {
    expect(remap01(0, 100, 0)).toBe(100);
    expect(remap01(1, 100, 0)).toBe(0);
  });
});
