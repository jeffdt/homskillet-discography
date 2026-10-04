import { GAIN_RAMP_FRAMES, INTERLEAVED_CHANNELS, OUTPUT_SCALE, VOICE_PAIRS } from '../constants';

const rampSteps = new Float32Array(VOICE_PAIRS);

/**
 * Sums GME's interleaved per-voice stereo pairs (heap, starting at base) into
 * left/right[offset .. offset + frames), applying per-voice gains. Gains move linearly from
 * currentGains to targetGains over the first GAIN_RAMP_FRAMES frames, then currentGains is set to
 * targetGains in place.
 */
export function mixVoicePairs(
  heap: Int16Array,
  base: number,
  frames: number,
  currentGains: Float32Array,
  targetGains: Float32Array,
  left: Float32Array,
  right: Float32Array,
  offset: number
): void {
  const rampFrames = Math.min(frames, GAIN_RAMP_FRAMES);
  let ramping = false;
  for (let v = 0; v < VOICE_PAIRS; v++) {
    rampSteps[v] = (targetGains[v] - currentGains[v]) / rampFrames;
    if (rampSteps[v] !== 0) ramping = true;
  }
  for (let i = 0; i < frames; i++) {
    const frame = base + i * INTERLEAVED_CHANNELS;
    const inRamp = ramping && i < rampFrames;
    let l = 0;
    let r = 0;
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const gain = inRamp ? currentGains[v] + rampSteps[v] * (i + 1) : targetGains[v];
      l += heap[frame + 2 * v] * gain;
      r += heap[frame + 2 * v + 1] * gain;
    }
    left[offset + i] = l * OUTPUT_SCALE;
    right[offset + i] = r * OUTPUT_SCALE;
  }
  currentGains.set(targetGains);
}

/**
 * Blends left and right toward mono when stereoWidth < 1 (0 is mono). This is the old GMEPlayer's
 * crossfeed, applied on top of GME's own stereo depth.
 */
export function applyStereoCrossfeed(
  left: Float32Array,
  right: Float32Array,
  offset: number,
  frames: number,
  stereoWidth: number
): void {
  if (stereoWidth >= 1) return;
  const direct = 0.5 + 0.5 * Math.max(0, stereoWidth);
  const cross = 1 - direct;
  for (let i = offset; i < offset + frames; i++) {
    const l = left[i];
    const r = right[i];
    left[i] = l * direct + r * cross;
    right[i] = r * direct + l * cross;
  }
}
