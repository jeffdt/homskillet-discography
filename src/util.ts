import queryString from 'querystring';
import React from 'react';
import path from 'path';

import DirectoryLink from './components/DirectoryLink';
import { API_BASE, CATALOG_PREFIX } from './config';

const CATALOG_PREFIX_REGEX = /^https?:\/\/[a-z0-9\-.:]+\/(music|catalog)\//;

interface QueryParams {
  [key: string]: string | undefined;
}

export function updateQueryString(newParams: QueryParams): void {
  // Merge new params with current query string
  const params: QueryParams = {
    ...queryString.parse(window.location.search.substr(1)) as QueryParams,
    ...newParams,
  };
  // Delete undefined properties
  Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
  const stateUrl = '?' + queryString.stringify(params).replace(/%20/g, '+');
  // Update address bar URL
  window.history.replaceState(null, '', stateUrl);
}

export function unlockAudioContext(context: AudioContext): void {
  // https://hackernoon.com/unlocking-web-audio-the-smarter-way-8858218c0e09
  console.log('AudioContext initial state is %s.', context.state);
  if (context.state === 'suspended') {
    const events = ['touchstart', 'touchend', 'mousedown', 'mouseup'];
    const unlock = () => context.resume()
      .then(() => events.forEach(event => document.body.removeEventListener(event, unlock)));
    events.forEach(event => document.body.addEventListener(event, unlock, false));
  }
}

interface Metadata {
  title: string;
  artist?: string;
  game?: string;
  system?: string;
  copyright?: string;
  formatted?: {
    title: string;
    subtitle: string;
  };
}

interface FormattedTitles {
  title: string;
  subtitle: string;
}

export function titlesFromMetadata(metadata: Metadata): FormattedTitles {
  if (metadata.formatted) {
    return metadata.formatted;
  }

  const title = allOrNone(metadata.artist, ' - ') + metadata.title;
  const subtitle = [metadata.game, metadata.system].filter(x => x).join(' - ') +
    allOrNone(' (', metadata.copyright, ')');
  return { title, subtitle };
}

export function allOrNone(...args: (string | undefined)[]): string {
  let str = '';
  for (let i = 0; i < args.length; i++) {
    if (!args[i]) return '';
    str += args[i];
  }
  return str;
}

export function pathToLinks(filepath: string | null | undefined): React.ReactElement | null {
  if (!filepath) return null;

  const cleanedPath = filepath
    .replace(CATALOG_PREFIX_REGEX, '/')
    .split('/').slice(0, -1).join('/');
  return React.createElement(DirectoryLink, { dim: true, to: pathJoin('/browse', cleanedPath) }, decodeURI(cleanedPath));
}

// Preserves leading and trailing slashes.
export function pathJoin(...parts: string[]): string {
  const sep = '/';
  const last = parts.length - 1;
  return parts
    .map((part, i) => {
      if (i !== 0 && part.startsWith(sep)) part = part.slice(1);
      if (i !== last && part.endsWith(sep)) part = part.slice(0, -1);
      return part;
    })
    .join(sep);
}

export function getFilepathFromUrl(url: string): string {
  return url.replace(CATALOG_PREFIX, '/');
}

export function getMetadataUrlForFilepath(filepath: string): string {
  return `${API_BASE}/metadata?path=${encodeURIComponent(filepath)}`;
}

export function getMetadataUrlForCatalogUrl(url: string): string {
  const filepath = getFilepathFromUrl(url);
  return getMetadataUrlForFilepath(filepath);
}

interface EmscriptenFileSystem {
  analyzePath(path: string): { exists: boolean };
  mkdirTree(path: string): void;
  writeFile(path: string, data: Uint8Array): void;
  syncfs(populate: boolean, callback: (err: Error | null) => void): void;
}

interface EmscriptenRuntime {
  FS: EmscriptenFileSystem;
}

export function ensureEmscFileWithUrl(
  emscRuntime: EmscriptenRuntime,
  filename: string,
  url: string
): Promise<string> {
  if (emscRuntime.FS.analyzePath(filename).exists) {
    console.debug(`${filename} exists in Emscripten file system.`);
    return Promise.resolve(filename);
  } else {
    console.log(`Downloading ${filename}...`);
    return fetch(url)
      .then(response => {
        // Because fetch doesn't reject on 404
        if (!response.ok) throw Error(`HTTP ${response.status} while fetching ${filename}`);
        return response;
      })
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const arr = new Uint8Array(buffer);
        return ensureEmscFileWithData(emscRuntime, filename, arr, true);
      });
  }
}

export function ensureEmscFileWithData(
  emscRuntime: EmscriptenRuntime,
  filename: string,
  uint8Array: Uint8Array,
  forceWrite: boolean = false
): Promise<string> {
  if (!forceWrite && emscRuntime.FS.analyzePath(filename).exists) {
    console.debug(`${filename} exists in Emscripten file system.`);
    return Promise.resolve(filename);
  } else {
    console.debug(`Writing ${filename} to Emscripten file system...`);
    const dir = path.dirname(filename);
    emscRuntime.FS.mkdirTree(dir);
    emscRuntime.FS.writeFile(filename, uint8Array);
    return new Promise((resolve, reject) => {
      emscRuntime.FS.syncfs(false, (err) => {
        if (err) {
          console.error('Error synchronizing to indexeddb.', err);
          reject(err);
        } else {
          console.debug(`Synchronized ${filename} to indexeddb.`);
          resolve(filename);
        }
      });
    });
  }
}

export function remap(
  number: number,
  fromLeft: number,
  fromRight: number,
  toLeft: number,
  toRight: number
): number {
  return toLeft + (number - fromLeft) / (fromRight - fromLeft) * (toRight - toLeft);
}

export function remap01(number: number, toLeft: number, toRight: number): number {
  return remap(number, 0, 1, toLeft, toRight);
}
