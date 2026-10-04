import { CATALOG_PREFIX } from '../config';
import { pathJoin } from '../util';
import { splitCamelCase, titleFromFilename } from './titles';

/** One entry of public/directories.json. Extra fields (size, mtime, idx) are ignored. */
export interface RawDirectoryEntry {
  path: string;
  type: 'directory' | 'file';
  [key: string]: unknown;
}

export type RawDirectories = Record<string, RawDirectoryEntry[]>;

export interface TrackMetadata {
  file: string;
  title?: string | null;
  blurb?: string | null;
}

export interface AlbumMetadata {
  title?: string | null;
  description?: string | null;
  art?: string | null;
  tracks?: TrackMetadata[];
}

export interface SiteMetadata {
  tagline?: string | null;
  about?: string | null;
  albums?: Record<string, AlbumMetadata>;
}

export interface Track {
  /** "<album folder>/<file>", unescaped. Used in ?play= links. */
  id: string;
  file: string;
  albumId: string;
  title: string;
  blurb: string | null;
  /** URL handed to the Sequencer; also what Sequencer.getCurrUrl() returns. */
  href: string;
  /** 1-based position in album order. */
  number: number;
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  art: string | null;
  tracks: Track[];
}

export interface Catalog {
  tagline: string | null;
  about: string | null;
  albums: Album[];
  albumById: Map<string, Album>;
  trackById: Map<string, Track>;
  trackByHref: Map<string, Track>;
}

export interface PlayPlan {
  hrefs: string[];
  index: number;
}

const NAME_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() || '';
}

/** Coerces untrusted metadata.json content into SiteMetadata, dropping anything malformed. */
export function normalizeMetadata(raw: unknown): SiteMetadata {
  if (!isObject(raw)) return {};
  const albums: Record<string, AlbumMetadata> = {};
  if (isObject(raw.albums)) {
    for (const [albumId, album] of Object.entries(raw.albums)) {
      if (!isObject(album)) continue;
      const tracks = Array.isArray(album.tracks)
        ? album.tracks
            .filter(
              (t: unknown): t is Record<string, any> => isObject(t) && typeof t.file === 'string'
            )
            .map((t) => ({ file: t.file as string, title: text(t.title), blurb: text(t.blurb) }))
        : [];
      albums[albumId] = {
        title: text(album.title),
        description: text(album.description),
        art: text(album.art),
        tracks,
      };
    }
  }
  return { tagline: text(raw.tagline), about: text(raw.about), albums };
}

/** Escapes the characters that would break a catalog URL (% and #), everywhere in the path. */
export function escapeCatalogPath(path: string): string {
  return path.replace(/%/g, '%25').replace(/#/g, '%23');
}

/** Returns the URL the Sequencer fetches for a track. */
export function trackHref(albumId: string, file: string): string {
  return pathJoin(CATALOG_PREFIX, escapeCatalogPath(`${albumId}/${file}`));
}

/** Builds one album from its directory entries, ordering listed tracks first. */
function buildAlbum(albumId: string, entries: RawDirectoryEntry[], meta: AlbumMetadata): Album {
  const files = entries.filter((e) => e.type === 'file').map((e) => basename(e.path));
  const metaTracks = (meta.tracks || []).filter((t) => files.includes(t.file));
  const listed = Array.from(new Set(metaTracks.map((t) => t.file)));
  const unlisted = files.filter((f) => !listed.includes(f)).sort(NAME_COLLATOR.compare);
  const metaByFile = new Map<string, TrackMetadata>();
  metaTracks.forEach((t) => {
    if (!metaByFile.has(t.file)) metaByFile.set(t.file, t);
  });

  const tracks = [...listed, ...unlisted].map((file, i) => {
    const trackMeta = metaByFile.get(file);
    return {
      id: `${albumId}/${file}`,
      file,
      albumId,
      title: (trackMeta && trackMeta.title) || titleFromFilename(file),
      blurb: (trackMeta && trackMeta.blurb) || null,
      href: trackHref(albumId, file),
      number: i + 1,
    };
  });

  return {
    id: albumId,
    title: meta.title || splitCamelCase(albumId),
    description: meta.description || null,
    art: meta.art || null,
    tracks,
  };
}

/**
 * Merges the on-disk catalog with owner metadata. Albums named in metadata come first
 * in key order, the rest follow alphabetically; empty albums are dropped.
 */
export function buildCatalog(directories: RawDirectories, metadata: SiteMetadata): Catalog {
  const albumMeta = metadata.albums || {};
  const folders = (directories['/'] || [])
    .filter((e) => e.type === 'directory')
    .map((e) => basename(e.path));
  const metaOrder = Object.keys(albumMeta).filter((id) => folders.includes(id));
  const rest = folders.filter((id) => !metaOrder.includes(id)).sort(NAME_COLLATOR.compare);

  const albums = [...metaOrder, ...rest]
    .map((id) => buildAlbum(id, directories[`/${id}`] || [], albumMeta[id] || {}))
    .filter((album) => album.tracks.length > 0);

  const albumById = new Map<string, Album>();
  const trackById = new Map<string, Track>();
  const trackByHref = new Map<string, Track>();
  albums.forEach((album) => {
    albumById.set(album.id, album);
    album.tracks.forEach((track) => {
      trackById.set(track.id, track);
      trackByHref.set(track.href, track);
    });
  });

  return {
    tagline: metadata.tagline || null,
    about: metadata.about || null,
    albums,
    albumById,
    trackById,
    trackByHref,
  };
}

/** Plans "Start listening": every track in the catalog, starting from a random one. */
export function shuffleAllPlan(
  catalog: Catalog,
  random: () => number = Math.random
): PlayPlan | null {
  const hrefs = catalog.albums.flatMap((album) => album.tracks.map((t) => t.href));
  if (hrefs.length === 0) return null;
  return { hrefs, index: Math.min(hrefs.length - 1, Math.floor(random() * hrefs.length)) };
}

/** Plans album playback starting at the given track index. */
export function albumPlan(album: Album, index: number): PlayPlan {
  return { hrefs: album.tracks.map((t) => t.href), index };
}
