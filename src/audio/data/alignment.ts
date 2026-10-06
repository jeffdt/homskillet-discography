/** The parts of an AudioContext alignment reads (structural, so tests can pass plain objects). */
export interface AudioClock {
  readonly currentTime: number;
  readonly baseLatency?: number;
  readonly outputLatency?: number;
  getOutputTimestamp?(): { contextTime?: number; performanceTime?: number };
}

/** Output timestamps older than this are stale (the context stalled or was suspended). */
const MAX_TIMESTAMP_AGE_MS = 250;

/** AudioContext time of the sample reaching the speakers at performance time nowMs. */
export function audibleTime(clock: AudioClock, nowMs: number): number {
  const stamp = clock.getOutputTimestamp ? clock.getOutputTimestamp() : undefined;
  if (stamp && stamp.contextTime && stamp.performanceTime) {
    const age = nowMs - stamp.performanceTime;
    if (age >= 0 && age <= MAX_TIMESTAMP_AGE_MS) return stamp.contextTime + age / 1000;
  }
  return clock.currentTime - (clock.baseLatency || 0) - (clock.outputLatency || 0);
}

/**
 * Samples between the newest tap sample and the one audible now, clamped to 0..maxDelay. Taps run
 * ahead of the speakers by the output latency (a whole buffer more on the ScriptProcessor
 * fallback), so visuals read that far back to stay in sync with what is heard.
 */
export function alignmentDelay(
  newestTime: number,
  audible: number,
  sampleRate: number,
  maxDelay: number
): number {
  if (!(sampleRate > 0)) return 0;
  const delay = Math.round((newestTime - audible) * sampleRate);
  return Math.max(0, Math.min(maxDelay, delay));
}
