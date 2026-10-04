import { describe, it, expect } from 'vitest';
import { pathJoin, allOrNone, remap, remap01 } from '../util';

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
