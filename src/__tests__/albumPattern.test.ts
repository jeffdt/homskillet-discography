import { describe, it, expect } from 'vitest';
import { albumPattern, hashString } from '../shell/albumPattern';

describe('albumPattern', () => {
  it('is deterministic per name', () => {
    expect(albumPattern('MetallicWing')).toEqual(albumPattern('MetallicWing'));
    expect(hashString('Bazaar')).toBe(hashString('Bazaar'));
  });

  it('differs between names', () => {
    expect(albumPattern('Bazaar')).not.toEqual(albumPattern('Covers'));
  });

  it('is an 8x8 horizontally mirrored grid of 0, 1 or 2', () => {
    const grid = albumPattern('LilLoops');
    expect(grid).toHaveLength(8);
    grid.forEach((row) => {
      expect(row).toHaveLength(8);
      expect(row).toEqual([...row].reverse());
      row.forEach((cell) => expect([0, 1, 2]).toContain(cell));
    });
  });

  it('supports odd sizes', () => {
    const grid = albumPattern('x', 5);
    grid.forEach((row) => expect(row).toEqual([...row].reverse()));
  });
});
