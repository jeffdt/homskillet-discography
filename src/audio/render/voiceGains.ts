import { VOICE_PAIRS } from '../constants';
import { VoiceLevels, VoiceMix } from '../types';

export const DEFAULT_VOICE_VOLUME = 1;
export const DEFAULT_VOICE_PAN = 0;
export const DEFAULT_VOICE_REVERB = 0;
/** The loudest a channel's fader goes: twice the level the song wrote. */
export const VOICE_VOLUME_MAX = 2;

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

function clampOr(value: number | undefined, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/** A voice's volume, clamped to 0..VOICE_VOLUME_MAX; missing or invalid is the default. */
export function voiceVolume(mix: Pick<VoiceMix, 'volume'>, index: number): number {
  return clampOr(mix.volume?.[index], 0, VOICE_VOLUME_MAX, DEFAULT_VOICE_VOLUME);
}

/** A voice's pan, clamped to -1..1; missing or invalid is the default. */
export function voicePan(mix: Pick<VoiceMix, 'pan'>, index: number): number {
  return clampOr(mix.pan?.[index], -1, 1, DEFAULT_VOICE_PAN);
}

/** A voice's reverb send, clamped to 0..1; missing or invalid is the default. */
export function voiceReverb(mix: Pick<VoiceMix, 'reverb'>, index: number): number {
  return clampOr(mix.reverb?.[index], 0, 1, DEFAULT_VOICE_REVERB);
}

/** The renderer's per-voice levels for a mix: audible times volume, pan and reverb send. */
export function computeVoiceLevels(mix: VoiceMix): VoiceLevels {
  const audible = computeVoiceGains(mix.muted, mix.soloed);
  const levels: VoiceLevels = { gains: [], pans: [], sends: [] };
  for (let v = 0; v < VOICE_PAIRS; v++) {
    levels.gains.push(audible[v] * voiceVolume(mix, v));
    levels.pans.push(voicePan(mix, v));
    levels.sends.push(voiceReverb(mix, v));
  }
  return levels;
}

/** Levels of the song as written: every voice at unity, centered, dry. */
export function unityVoiceLevels(): VoiceLevels {
  return computeVoiceLevels({ muted: [], soloed: [] });
}
