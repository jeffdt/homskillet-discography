/** A 128-byte NSF header ("NESM\x1A") with the given expansion-chip bits at 0x7B. */
export function nsfHeader(expansionBits: number): Uint8Array {
  const bytes = new Uint8Array(0x80);
  bytes.set([0x4e, 0x45, 0x53, 0x4d, 0x1a]);
  bytes[0x7b] = expansionBits;
  return bytes;
}
