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
