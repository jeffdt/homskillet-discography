export type PatternCell = 0 | 1 | 2;

/** 32-bit FNV-1a hash. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeded pseudo-random generator returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic, mirrored pixel pattern seeded by album name: 0 empty, 1 dark accent, 2 accent. */
export function albumPattern(name: string, size = 8): PatternCell[][] {
  const random = mulberry32(hashString(name));
  const half = Math.ceil(size / 2);
  return Array.from({ length: size }, () => {
    const left = Array.from({ length: half }, () => {
      const r = random();
      return (r < 0.45 ? 0 : r < 0.75 ? 1 : 2) as PatternCell;
    });
    return [...left, ...left.slice(0, size - half).reverse()];
  });
}
