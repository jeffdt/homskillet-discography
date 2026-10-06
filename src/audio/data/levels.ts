/** RMS of the last `count` samples (all of them when there are fewer). */
export function rmsOfNewest(samples: Float32Array, count: number): number {
  const n = Math.min(count, samples.length);
  if (n <= 0) return 0;
  let sum = 0;
  for (let i = samples.length - n; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / n);
}

/**
 * Moves current toward target exponentially over dtMs: attackMs is the time constant while rising,
 * releaseMs while falling. Two half steps equal one full step, so the frame rate does not matter.
 */
export function smoothToward(
  current: number,
  target: number,
  dtMs: number,
  attackMs: number,
  releaseMs: number
): number {
  if (dtMs <= 0) return current;
  const tau = target > current ? attackMs : releaseMs;
  return target + (current - target) * Math.exp(-dtMs / tau);
}
