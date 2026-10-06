import { FrameLoopController, FrameLoopStats, PulseChannel, VoiceFrame } from './contract';
import { FrameScheduler, createFrameLoop } from './FrameLoop';
import { createPulseChannel } from './PulseChannel';
import { TapAudioDataSource } from './TapAudioDataSource';

/** The app's one data source, frame loop and pulse channel. App owns it; React reads it from context. */
export interface AudioData {
  readonly source: TapAudioDataSource;
  readonly frameLoop: FrameLoopController;
  readonly pulse: PulseChannel;
  dispose(): void;
}

/** Options for createAudioData. */
export interface CreateAudioDataOptions {
  scheduler?: FrameScheduler;
  /** Log FrameLoopStats to the console (?debug). */
  logStats?: boolean;
  /** Read every voice spectrum each frame to measure their cost before sub-project 5 uses them (?analysis=full). */
  forceVoiceSpectra?: boolean;
}

// The forced read stores its result here only so the spectrum getter cannot be optimized away.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- write-only on purpose, see above
let lastForcedSpectrum: Float32Array | null = null;

function readEveryVoiceSpectrum(frame: VoiceFrame): void {
  for (let v = 0; v < frame.voiceCount; v++) lastForcedSpectrum = frame.voices[v].spectrum;
}

function logFrameStats(stats: FrameLoopStats): void {
  console.log(
    '[FrameLoop] %d frames: p75 %s ms, mean %s ms, max %s ms',
    stats.frames,
    stats.p75Ms.toFixed(2),
    stats.meanMs.toFixed(2),
    stats.maxMs.toFixed(2)
  );
  Object.keys(stats.consumers).forEach((id) =>
    console.log('[FrameLoop]   %s: p75 %s ms', id, stats.consumers[id].p75Ms.toFixed(2))
  );
}

/** Builds the source, the loop over it and the pulse channel on the loop. */
export function createAudioData(options: CreateAudioDataOptions = {}): AudioData {
  const source = new TapAudioDataSource();
  const frameLoop = createFrameLoop({
    source,
    scheduler: options.scheduler,
    onStats: options.logStats ? logFrameStats : undefined,
  });
  const pulse = createPulseChannel(frameLoop, source.getSpectrumLayout());
  if (options.forceVoiceSpectra) frameLoop.add('debug-voice-spectra', readEveryVoiceSpectrum);
  return {
    source,
    frameLoop,
    pulse,
    dispose() {
      frameLoop.dispose();
      source.dispose();
      lastForcedSpectrum = null;
    },
  };
}
