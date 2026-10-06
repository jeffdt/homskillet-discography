/** Idle frames slower than ~45fps suggest a device that cannot afford full-resolution visuals. */
export const LOW_POWER_FRAME_MS = 1000 / 45;

/** Median of a list of numbers; 0 for an empty list. */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Low-power when the device reports very few cores or its idle frame times are slow. */
export function decideLowPower({
  hardwareConcurrency,
  frameTimesMs,
}: {
  hardwareConcurrency?: number;
  frameTimesMs: number[];
}): boolean {
  if (hardwareConcurrency !== undefined && hardwareConcurrency > 0 && hardwareConcurrency <= 2)
    return true;
  return frameTimesMs.length >= 5 && median(frameTimesMs) > LOW_POWER_FRAME_MS;
}

/** Measures the gaps between a short run of animation frames; resolves [] without requestAnimationFrame. */
export function probeFrameTimes(frames = 30): Promise<number[]> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      resolve([]);
      return;
    }
    const gaps: number[] = [];
    let last: number | null = null;
    const step = (now: number) => {
      if (last !== null) gaps.push(now - last);
      last = now;
      if (gaps.length >= frames) resolve(gaps);
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
