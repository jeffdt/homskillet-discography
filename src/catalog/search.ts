import { Album, Catalog, Track } from './catalog';

export interface SearchResult {
  track: Track;
  album: Album;
  /** Position of the track in its album, ready for albumPlan. */
  index: number;
  score: number;
}

interface Field {
  text: string;
  words: string[];
  weight: number;
}

const WORD_SCORE = 100;
const PREFIX_SCORE = 80;
const SUBSTRING_SCORE = 55;
const SUBSEQUENCE_SCORE = 30;
const TITLE_WEIGHT = 1;
const ALBUM_WEIGHT = 0.6;
const FILE_WEIGHT = 0.5;

/** Lowercase, accents dropped, CamelCase and punctuation turned into spaces. */
export function normalize(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** A searchable field: normalized text plus its words. */
function field(raw: string, weight: number): Field {
  const text = normalize(raw);
  return { text, words: text.split(' ').filter(Boolean), weight };
}

/**
 * Scores the token's letters appearing in order in the text, losing points for each skipped
 * character between them. Returns 0 when they do not all appear.
 */
function subsequenceScore(token: string, text: string): number {
  let at = text.indexOf(token[0]);
  if (at < 0) return 0;
  let gaps = 0;
  for (let i = 1; i < token.length; i++) {
    const next = text.indexOf(token[i], at + 1);
    if (next < 0) return 0;
    gaps += next - at - 1;
    at = next;
  }
  return Math.max(1, SUBSEQUENCE_SCORE - gaps);
}

/** How well one query token matches one field, before the field's weight. */
function tokenScore(token: string, f: Field): number {
  if (f.words.includes(token)) return WORD_SCORE;
  if (f.words.some((w) => w.startsWith(token))) return PREFIX_SCORE;
  if (f.text.includes(token)) return SUBSTRING_SCORE;
  if (token.length < 2) return 0;
  return subsequenceScore(token, f.text);
}

/**
 * Ranks every track against a few words. Each word must match the track's title, album or file
 * name somewhere: whole words beat word starts, which beat substrings, which beat scattered
 * letters in order. Title matches count most. Ties keep catalog order.
 */
export function searchTracks(catalog: Catalog, query: string, limit = 8): SearchResult[] {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];
  catalog.albums.forEach((album) => {
    const albumField = field(`${album.title} ${album.id}`, ALBUM_WEIGHT);
    album.tracks.forEach((track, index) => {
      const fields = [
        field(track.title, TITLE_WEIGHT),
        albumField,
        field(track.file.replace(/\.[^.]+$/, ''), FILE_WEIGHT),
      ];
      let score = 0;
      for (const token of tokens) {
        const best = Math.max(...fields.map((f) => tokenScore(token, f) * f.weight));
        if (best === 0) return;
        score += best;
      }
      results.push({ track, album, index, score });
    });
  });

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
