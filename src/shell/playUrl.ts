import { Catalog, Track } from '../catalog/catalog';

export const BASE_PATH: string = import.meta.env.BASE_URL || '/';

export interface InitialLocation {
  /** Track named by ?play=, if it exists in the catalog. */
  sharedTrack: Track | null;
  /** ?t= in milliseconds; 0 unless sharedTrack is set. */
  startMs: number;
  /** Album named by an old browse path such as /MetallicWing. */
  albumId: string | null;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** Reads the address the visitor arrived with: shared track, start time and legacy album path. */
export function parseInitialLocation(
  pathname: string,
  search: string,
  catalog: Catalog
): InitialLocation {
  const params = new URLSearchParams(search);
  const play = params.get('play');
  const sharedTrack = play ? catalog.trackById.get(play.replace(/^\/+/, '')) || null : null;
  const t = Number(params.get('t'));
  const startMs = sharedTrack && Number.isFinite(t) && t > 0 ? Math.floor(t) : 0;

  const decodedPath = safeDecode(pathname.slice(BASE_PATH.length - 1));
  const albumKey = decodedPath ? decodedPath.replace(/^\/+|\/+$/g, '') : '';
  const albumId = albumKey && catalog.albumById.has(albumKey) ? albumKey : null;

  return { sharedTrack, startMs, albumId };
}

/** Returns the shareable address for a track, preserving unrelated query params. */
export function buildPlayUrl(trackId: string, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  params.delete('t');
  params.delete('play');
  params.set('play', trackId);
  return `${BASE_PATH}?${params.toString()}`;
}

/** Removes play and t from a query string; returns '' or '?rest'. */
export function stripPlayParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('play');
  params.delete('t');
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
