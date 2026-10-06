import { VOICE_PAIRS } from '../constants';

/**
 * Turns mute/solo state into a gain per voice pair: a voice is audible when it is not muted and
 * either nothing is soloed or it is soloed. Missing entries count as false.
 */
export function computeVoiceGains(
  muted: readonly boolean[],
  soloed: readonly boolean[],
  out: Float32Array = new Float32Array(VOICE_PAIRS)
): Float32Array {
  const anySolo = soloed.some(Boolean);
  for (let v = 0; v < VOICE_PAIRS; v++) {
    const audible = !muted[v] && (!anySolo || !!soloed[v]);
    out[v] = audible ? 1 : 0;
  }
  return out;
}
