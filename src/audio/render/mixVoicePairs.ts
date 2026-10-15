import { GAIN_RAMP_FRAMES, INTERLEAVED_CHANNELS, OUTPUT_SCALE, VOICE_PAIRS } from '../constants';
import { VoiceLevels } from '../types';

/**
 * Per-voice routing coefficients, VOICE_PAIRS entries each. A voice pair (l, r) adds
 * l * ll + r * rl to the left output, r * rr + l * lr to the right, and (l + r) * send to the
 * reverb send.
 */
export class VoiceRouting {
  readonly ll = new Float32Array(VOICE_PAIRS).fill(1);
  readonly rl = new Float32Array(VOICE_PAIRS);
  readonly lr = new Float32Array(VOICE_PAIRS);
  readonly rr = new Float32Array(VOICE_PAIRS).fill(1);
  readonly send = new Float32Array(VOICE_PAIRS);

  /**
   * Sets the coefficients from levels. Pan moves one side's signal across rather than only
   * turning it down, so a voice the emulator already placed left can still be panned hard right
   * at full level.
   */
  setLevels(levels: VoiceLevels): void {
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const gain = levels.gains[v] ?? 1;
      const pan = levels.pans[v] ?? 0;
      const towardRight = Math.max(0, pan);
      const towardLeft = Math.max(0, -pan);
      this.ll[v] = gain * (1 - towardRight);
      this.lr[v] = gain * towardRight;
      this.rr[v] = gain * (1 - towardLeft);
      this.rl[v] = gain * towardLeft;
      this.send[v] = gain * (levels.sends[v] ?? 0);
    }
  }

  copyFrom(other: VoiceRouting): void {
    this.ll.set(other.ll);
    this.rl.set(other.rl);
    this.lr.set(other.lr);
    this.rr.set(other.rr);
    this.send.set(other.send);
  }

  /** True when any voice feeds the reverb. */
  hasSend(): boolean {
    return this.send.some((value) => value > 0);
  }
}

const steps = new VoiceRouting();

/**
 * Sums GME's interleaved per-voice stereo pairs (heap, starting at base) into
 * left/right[offset .. offset + frames) through each voice's routing, and the reverb send into
 * send[0 .. frames) when send is given. Coefficients move linearly from current to target over
 * the first GAIN_RAMP_FRAMES frames, then current is set to target in place.
 */
export function mixVoicePairs(
  heap: Int16Array,
  base: number,
  frames: number,
  current: VoiceRouting,
  target: VoiceRouting,
  left: Float32Array,
  right: Float32Array,
  offset: number,
  send: Float32Array | null = null
): void {
  const rampFrames = Math.min(frames, GAIN_RAMP_FRAMES);
  let ramping = false;
  for (let v = 0; v < VOICE_PAIRS; v++) {
    steps.ll[v] = (target.ll[v] - current.ll[v]) / rampFrames;
    steps.rl[v] = (target.rl[v] - current.rl[v]) / rampFrames;
    steps.lr[v] = (target.lr[v] - current.lr[v]) / rampFrames;
    steps.rr[v] = (target.rr[v] - current.rr[v]) / rampFrames;
    steps.send[v] = (target.send[v] - current.send[v]) / rampFrames;
    if (steps.ll[v] || steps.rl[v] || steps.lr[v] || steps.rr[v] || steps.send[v]) ramping = true;
  }
  for (let i = 0; i < frames; i++) {
    const frame = base + i * INTERLEAVED_CHANNELS;
    const inRamp = ramping && i < rampFrames;
    const t = i + 1;
    let l = 0;
    let r = 0;
    let s = 0;
    for (let v = 0; v < VOICE_PAIRS; v++) {
      const vl = heap[frame + 2 * v];
      const vr = heap[frame + 2 * v + 1];
      if (inRamp) {
        l += vl * (current.ll[v] + steps.ll[v] * t) + vr * (current.rl[v] + steps.rl[v] * t);
        r += vr * (current.rr[v] + steps.rr[v] * t) + vl * (current.lr[v] + steps.lr[v] * t);
        s += (vl + vr) * (current.send[v] + steps.send[v] * t);
      } else {
        l += vl * target.ll[v] + vr * target.rl[v];
        r += vr * target.rr[v] + vl * target.lr[v];
        s += (vl + vr) * target.send[v];
      }
    }
    left[offset + i] = l * OUTPUT_SCALE;
    right[offset + i] = r * OUTPUT_SCALE;
    if (send) send[i] = s * OUTPUT_SCALE;
  }
  current.copyFrom(target);
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
