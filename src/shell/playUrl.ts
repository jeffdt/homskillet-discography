import { Catalog, Track } from '../catalog/catalog';
import { hasSharedSettings, parseSharedSettings, SHARE_PARAMS, SharedSettings } from './shareLink';

export const BASE_PATH: string = import.meta.env.BASE_URL || '/';

export interface InitialLocation {
  /** Track named by ?play=, if it exists in the catalog. */
  sharedTrack: Track | null;
  /** ?t= in milliseconds; 0 unless sharedTrack is set. */
  startMs: number;
  /** The share link's mix and visualizer, applied when its track plays; null unless sharedTrack is set. */
  shared: SharedSettings | null;
  /** Album named by an old browse path such as /MetallicWing. */
  albumId: string | null;
}

/** Percent-decodes a value, or null when it is malformed. */
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
  const parsedShare = sharedTrack ? parseSharedSettings(search) : null;
  const shared = parsedShare && hasSharedSettings(parsedShare) ? parsedShare : null;

  const decodedPath = safeDecode(pathname.slice(BASE_PATH.length - 1));
  const albumKey = decodedPath ? decodedPath.replace(/^\/+|\/+$/g, '') : '';
  const albumId = albumKey && catalog.albumById.has(albumKey) ? albumKey : null;

  return { sharedTrack, startMs, shared, albumId };
}

/** Every parameter that belongs to a ?play= link: the track, its start, and a share link's settings. */
const PLAY_PARAMS = ['play', 't', ...SHARE_PARAMS];

function withoutPlayParams(search: string): URLSearchParams {
  const params = new URLSearchParams(search);
  PLAY_PARAMS.forEach((name) => params.delete(name));
  return params;
}

/** Returns the address-bar link for a track, preserving unrelated query params. */
export function buildPlayUrl(trackId: string, currentSearch: string): string {
  const params = withoutPlayParams(currentSearch);
  params.set('play', trackId);
  return `${BASE_PATH}?${params.toString()}`;
}

/** Removes play, t and share settings from a query string; returns '' or '?rest'. */
export function stripPlayParams(search: string): string {
  const params = withoutPlayParams(search);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

/**
 * True when this page load was a browser refresh. A refresh is how people reset the app, so the
 * ?play= link the address bar has been tracking should not bring the old track back.
 */
export function isPageReload(): boolean {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function')
    return false;
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return !!navigation && navigation.type === 'reload';
}
