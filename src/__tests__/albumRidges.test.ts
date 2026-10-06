import { describe, it, expect } from 'vitest';
import { assignRidgeFamilies, hashString, RIDGE_FAMILIES, ridgeLines } from '../shell/albumRidges';

const ALBUMS = [
  'MetallicWing',
  'Covers',
  'LilLoops',
  'RandomJams',
  'Bazaar',
  'UnfinishedBusiness',
  'SuperFORE!',
];

describe('assignRidgeFamilies', () => {
  it('gives every album a different family while families last', () => {
    const families = assignRidgeFamilies(ALBUMS);
    expect(new Set(families.values()).size).toBe(ALBUMS.length);
  });

  it('does not depend on the order albums are listed in', () => {
    expect(assignRidgeFamilies([...ALBUMS].reverse())).toEqual(assignRidgeFamilies(ALBUMS));
  });

  it('cycles through the families again once all are taken', () => {
    const ids = [...ALBUMS, 'Extra1', 'Extra2', 'Extra3'];
    const counts = new Map<string, number>();
    assignRidgeFamilies(ids).forEach((f) => counts.set(f, (counts.get(f) || 0) + 1));
    expect(counts.size).toBe(RIDGE_FAMILIES.length);
    counts.forEach((n) => expect(n).toBeLessThanOrEqual(2));
  });
});

describe('ridgeLines', () => {
  it('is deterministic per album', () => {
    expect(ridgeLines('Bazaar', 'peak')).toEqual(ridgeLines('Bazaar', 'peak'));
    expect(hashString('Bazaar')).toBe(hashString('Bazaar'));
  });

  it('differs between albums and between families', () => {
    expect(ridgeLines('Bazaar', 'peak')).not.toEqual(ridgeLines('Covers', 'peak'));
    expect(ridgeLines('Bazaar', 'peak')).not.toEqual(ridgeLines('Bazaar', 'mesa'));
  });

  it.each(RIDGE_FAMILIES.map((f) => [f]))(
    'draws 8 to 13 lines across the view box with at least one hot line (%s)',
    (family) => {
      ALBUMS.forEach((id) => {
        const lines = ridgeLines(id, family);
        expect(lines.length).toBeGreaterThanOrEqual(8);
        expect(lines.length).toBeLessThanOrEqual(13);
        expect(lines.some((l) => l.hot)).toBe(true);
        const coords = lines.flatMap((l) =>
          l.points.split(' ').map((pt) => pt.split(',').map(Number))
        );
        // Tall peaks may run off the top edge, where the view box clips them; nothing should fall below it.
        expect(Math.min(...coords.map(([x]) => x))).toBeGreaterThanOrEqual(0);
        expect(Math.max(...coords.map(([x]) => x))).toBeLessThanOrEqual(100);
        expect(Math.max(...coords.map(([, y]) => y))).toBeLessThanOrEqual(100);
        expect(coords.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
      });
    }
  );
});
