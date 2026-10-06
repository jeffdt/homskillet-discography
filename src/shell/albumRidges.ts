/** Shape families for generated album covers; each album in a catalog gets its own until they run out. */
export const RIDGE_FAMILIES = [
  'peak',
  'twin',
  'range',
  'mesa',
  'swell',
  'spike',
  'skyline',
] as const;
export type RidgeFamily = (typeof RIDGE_FAMILIES)[number];

/** One stroked line of a cover, in a 100x100 view box. `hot` lines are drawn brighter. */
export interface RidgeLine {
  points: string;
  hot: boolean;
}

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

/**
 * Gives every album a family, distinct until all seven are taken, then cycling.
 * Albums are visited in hash order and each takes its preferred family or the next
 * free one, so adding an album can move only the albums visited after it.
 */
export function assignRidgeFamilies(albumIds: string[]): Map<string, RidgeFamily> {
  const order = [...albumIds].sort((a, b) => hashString(a) - hashString(b) || (a < b ? -1 : 1));
  const families = new Map<string, RidgeFamily>();
  let taken = new Set<number>();
  order.forEach((id) => {
    if (taken.size === RIDGE_FAMILIES.length) taken = new Set();
    let k = hashString(`family:${id}`) % RIDGE_FAMILIES.length;
    while (taken.has(k)) k = (k + 1) % RIDGE_FAMILIES.length;
    taken.add(k);
    families.set(id, RIDGE_FAMILIES[k]);
  });
  return families;
}

type Profile = (x: number, line: number) => number;

/** Height of a family's ridge above a line's baseline at x, with shape details drawn from `random`. */
function ridgeProfile(family: RidgeFamily, random: () => number): Profile {
  const bump = (x: number, center: number, width: number) =>
    Math.exp(-(((x - center) / width) ** 2));
  switch (family) {
    case 'peak': {
      const c = 38 + random() * 24;
      return (x) => 34 * bump(x, c, 13);
    }
    case 'twin': {
      const a = 28 + random() * 10;
      const b = 62 + random() * 10;
      return (x) => 28 * bump(x, a, 9) + 20 * bump(x, b, 8);
    }
    case 'range': {
      const peaks = Array.from({ length: 6 }, (_, k) => ({
        c: 12 + k * 15 + random() * 6,
        h: 8 + random() * 20,
      }));
      return (x) => peaks.reduce((sum, p) => sum + p.h * bump(x, p.c, 4.5), 0);
    }
    case 'mesa': {
      const a = 26 + random() * 14;
      const b = a + 26 + random() * 14;
      // A plateau with soft edges, quantized to 4-unit steps like a pulse wave.
      return (x) =>
        Math.round(26 / (1 + Math.exp(-(x - a) * 0.9)) / (1 + Math.exp((x - b) * 0.9)) / 4) * 4;
    }
    case 'swell': {
      const k = 0.14 + random() * 0.08;
      return (x, line) => 7 + 7 * Math.sin(x * k + line * 0.7);
    }
    case 'spike': {
      const spikes = Array.from({ length: 4 }, () => ({
        c: 14 + random() * 72,
        h: 14 + random() * 24,
      }));
      return (x) =>
        spikes.reduce((sum, s) => sum + Math.max(0, s.h * (1 - Math.abs(x - s.c) / 3.5)), 0);
    }
    case 'skyline': {
      const bars = Array.from({ length: 9 }, () => 4 + Math.floor(random() * 6) * 4);
      return (x) => (x < 10 || x > 90 ? 0 : bars[Math.min(8, Math.floor((x - 10) / 8.9))]);
    }
  }
}

/**
 * Stacked ridge lines for an album cover, back to front. The family sets the shape; the
 * album id seeds the line count, which lines swell most and which are drawn hot.
 */
export function ridgeLines(albumId: string, family: RidgeFamily): RidgeLine[] {
  const random = mulberry32(hashString(albumId));
  const profile = ridgeProfile(family, random);
  const count = 8 + Math.floor(random() * 6);
  const envelope = ['middle', 'rising', 'falling'][Math.floor(random() * 3)];
  const highlight = ['one', 'band', 'alternate', 'front'][Math.floor(random() * 4)];
  const hotLine = 1 + Math.floor(random() * (count - 2));
  const gap = 64 / count;

  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const swell =
      envelope === 'middle'
        ? 0.35 + 0.65 * Math.sin(Math.PI * t)
        : envelope === 'rising'
          ? 0.3 + 0.7 * t
          : 1 - 0.7 * t;
    const base = 30 + i * gap;
    const points: string[] = [];
    for (let x = 6; x <= 94; x += 1.5) {
      points.push(`${x},${(base - profile(x, i) * swell - random() * 0.8).toFixed(1)}`);
    }
    const hot =
      highlight === 'one'
        ? i === hotLine
        : highlight === 'band'
          ? Math.abs(i - hotLine) <= 1
          : highlight === 'alternate'
            ? i % 2 === 0
            : i === count - 1;
    return { points: points.join(' '), hot };
  });
}
