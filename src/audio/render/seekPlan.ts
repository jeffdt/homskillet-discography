/**
 * Output frames gme_play must render to move song position from tellMs to targetMs at the given
 * tempo. The epsilon keeps exact results from rounding up. Always at least 1.
 */
export function framesToReach(
  tellMs: number,
  targetMs: number,
  tempo: number,
  sampleRate: number
): number {
  const exact = ((targetMs - tellMs) * sampleRate) / (1000 * tempo);
  return Math.max(1, Math.ceil(exact - 1e-6));
}
