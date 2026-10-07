/** An sRGB color as 0..255 channels. */
export type Rgb = readonly [number, number, number];

/** Parses '#rgb' or '#rrggbb' in any case; null for anything else. */
export function parseHexColor(color: string): Rgb | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = hex.replace(/./g, (digit) => digit + digit);
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x0a0b0c0d]).buffer)[0] === 0x0d;

/** One pixel (integer channels 0..255) for a Uint32Array view of ImageData bytes. */
export function packPixel(r: number, g: number, b: number, a: number): number {
  return LITTLE_ENDIAN
    ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
    : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

/** The 0..255 channels of a pixel made by packPixel, as [r, g, b, a]. */
export function unpackPixel(pixel: number): [number, number, number, number] {
  return LITTLE_ENDIAN
    ? [pixel & 255, (pixel >>> 8) & 255, (pixel >>> 16) & 255, pixel >>> 24]
    : [pixel >>> 24, (pixel >>> 16) & 255, (pixel >>> 8) & 255, pixel & 255];
}

/**
 * 256 opaque pixels spanning the colors, evenly spaced and interpolated in RGB, as chroma-js
 * scale() did for the old visualizer. Unparsable colors are skipped; one color gives a flat
 * table and none gives black.
 */
export function buildGradientLut(colors: readonly string[]): Uint32Array {
  const stops = colors.map(parseHexColor).filter((stop): stop is Rgb => stop !== null);
  const lut = new Uint32Array(256);
  if (stops.length < 2) {
    const [r, g, b] = stops[0] || [0, 0, 0];
    return lut.fill(packPixel(r, g, b, 255));
  }
  const segments = stops.length - 1;
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * segments;
    const k = Math.min(segments - 1, Math.floor(x));
    const t = x - k;
    const a = stops[k];
    const b = stops[k + 1];
    lut[i] = packPixel(
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
      255
    );
  }
  return lut;
}
