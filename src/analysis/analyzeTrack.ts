import { RMS_ATTACK_MS, RMS_RELEASE_MS, RMS_SAMPLES } from '../audio/data/constants';
import { rmsOfNewest, smoothToward } from '../audio/data/levels';
import { ChipCore } from '../audio/types';
import { VoiceLevelProfile, VoiceLevelStats } from './levelStats';
import { ANALYSIS_FRAME_MS, ANALYSIS_TAP_RATE, TapRender } from './renderTaps';

/** Bump when a field changes meaning; add fields without bumping. */
export const LEVEL_PROFILE_VERSION = 1;

/** One track's level profile. */
export interface TrackLevelProfile {
  durationMs: number;
  analyzedMs: number;
  voices: VoiceLevelProfile[];
}

/** The JSON file `analyze-tracks --json` writes; a future public/levels.json has this shape. */
export interface LevelProfileFile {
  version: typeof LEVEL_PROFILE_VERSION;
  tapRate: number;
  fullScale: string;
  tracks: Record<string, TrackLevelProfile>;
}

export interface AnalyzeOptions {
  /** Analyze at most this much of the track. */
  maxSeconds?: number;
  /** Also record each voice's RMS per second. */
  timeline?: boolean;
}

/**
 * Renders a track headless through the app's own ChipRenderer and taps and measures each voice:
 * every tap sample, and each 60 fps frame's newest RMS_SAMPLES window as the app's VoiceData sees it.
 */
export function analyzeTrack(
  core: ChipCore,
  bytes: Uint8Array,
  path: string,
  options: AnalyzeOptions = {}
): TrackLevelProfile {
  const render = new TapRender(core, bytes, path);
  const voices = render.info.voices;
  const stats = voices.map(
    (voice) => new VoiceLevelStats(voice.index, voice.name, ANALYSIS_TAP_RATE, !!options.timeline)
  );
  const levels = new Float64Array(voices.length);
  const window = new Float32Array(RMS_SAMPLES);
  const frames = render.frameCount(options.maxSeconds);
  for (let f = 0; f < frames; f++) {
    const fresh = render.step();
    voices.forEach((voice, v) => {
      for (let back = fresh - 1; back >= 0; back--)
        stats[v].addSample(render.sample(voice.index, back));
      render.copyNewest(voice.index, window);
      const windowRms = rmsOfNewest(window, RMS_SAMPLES);
      let peak = 0;
      for (let i = 0; i < window.length; i++) peak = Math.max(peak, Math.abs(window[i]));
      levels[v] = smoothToward(
        levels[v],
        windowRms,
        ANALYSIS_FRAME_MS,
        RMS_ATTACK_MS,
        RMS_RELEASE_MS
      );
      stats[v].addFrame(windowRms, peak, levels[v]);
    });
  }
  return {
    durationMs: render.info.durationMs,
    analyzedMs: Math.round(frames * ANALYSIS_FRAME_MS),
    voices: stats.map((s) => s.profile()),
  };
}
