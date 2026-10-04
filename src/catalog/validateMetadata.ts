/** Narrows a value to a plain (non-array, non-null) object. */
function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Lists problems in metadata.json relative to the files on disk. Never throws, never edits. */
export function validateMetadata(
  metadata: unknown,
  filesByAlbum: Record<string, string[]>
): string[] {
  if (!isObject(metadata)) return ['top level must be a JSON object'];
  const albums = metadata.albums;
  if (albums === undefined) return [];
  if (!isObject(albums)) return ['"albums" must be an object keyed by folder name'];

  const warnings: string[] = [];
  for (const [albumId, album] of Object.entries(albums)) {
    const files = filesByAlbum[albumId];
    if (!files) {
      warnings.push(`album "${albumId}" has no folder in public/music/`);
      continue;
    }
    if (!isObject(album)) {
      warnings.push(`album "${albumId}" must be an object`);
      continue;
    }
    if (album.tracks === undefined) continue;
    if (!Array.isArray(album.tracks)) {
      warnings.push(`album "${albumId}": "tracks" must be an array`);
      continue;
    }
    const seen = new Set<string>();
    album.tracks.forEach((track: unknown, i: number) => {
      if (!isObject(track) || typeof track.file !== 'string') {
        warnings.push(`album "${albumId}": track ${i + 1} needs a "file" string`);
        return;
      }
      if (!files.includes(track.file)) {
        warnings.push(`album "${albumId}": "${track.file}" is not in public/music/${albumId}/`);
      } else if (seen.has(track.file)) {
        warnings.push(`album "${albumId}": "${track.file}" is listed twice`);
      }
      seen.add(track.file);
    });
  }
  return warnings;
}
