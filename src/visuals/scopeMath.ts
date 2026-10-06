/** Horizontal backing-store pixels between scope trace points. */
export const SCOPE_POINT_PX = 2;
/** Share of a lane's height a full-scale (-1..1) wave fills. */
export const LANE_FILL = 0.8;
/** Opacity of a voice you cannot hear (muted or not soloed), drawn as a ghost like the Mixer's. */
export const GHOST_ALPHA = 0.3;

/**
 * Start of the newest span-sample window that begins on a rising zero crossing, so a steady tone
 * draws in the same place every frame, like a hardware oscilloscope's trigger. Falls back to the
 * newest window when nothing crosses, and to 0 when span covers the whole waveform.
 */
export function findTrigger(waveform: ArrayLike<number>, span: number): number {
  const latest = waveform.length - span;
  if (latest <= 0) return 0;
  for (let i = latest; i >= 1; i--) {
    if (waveform[i - 1] < 0 && waveform[i] >= 0) return i;
  }
  return latest;
}

/** The band of the canvas a lane occupies, lanes stacked top to bottom. */
export function laneBox(
  lane: number,
  count: number,
  height: number
): { top: number; height: number } {
  const laneHeight = height / count;
  return { top: lane * laneHeight, height: laneHeight };
}
