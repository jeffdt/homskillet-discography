/** Builds a display title from a music filename: drops the extension, splits on underscores, capitalizes each word. */
export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^./]+$/, '')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Splits a CamelCase folder name into words: "MetallicWing" becomes "Metallic Wing". */
export function splitCamelCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}
