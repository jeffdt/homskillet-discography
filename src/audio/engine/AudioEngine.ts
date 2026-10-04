import { TapSnapshot } from '../taps/TapSnapshot';
import { ChipCore, EngineKind, RendererSettings, TrackInfo, VoiceMix } from '../types';

/** Events an AudioEngine emits on the main thread. */
export interface AudioEngineEvents {
  /** The loaded track finished (the end fade completed at the track's duration). */
  ended: () => void;
  error: (message: string) => void;
  /** A seek finished; positionMs is where playback resumed. */
  seeked: (positionMs: number) => void;
}

/**
 * Plays chip music. The same interface covers the AudioWorklet engine, the ScriptProcessor
 * fallback and silent stub mode.
 */
export interface AudioEngine {
  readonly kind: EngineKind;
  readonly context: AudioContext;
  /** Pre-volume output; AnalyserNodes (Spectrogram, useAudioAnalysis) connect here. */
  readonly outputNode: AudioNode;
  /** chip-core on the main thread, for the Spectrogram's constant-Q transform until sub-project 3. */
  readonly mainThreadCore: ChipCore;
  /** Loads and starts a track. Rejects with LoadSupersededError if load() or stop() runs again first. */
  load(data: Uint8Array, filepath: string, settings: RendererSettings): Promise<TrackInfo>;
  stop(): void;
  setPaused(paused: boolean): void;
  /** Starts a seek spread across render quanta; getPositionMs() reports the target until it ends. */
  seek(positionMs: number): void;
  isSeeking(): boolean;
  getPositionMs(): number;
  setTempo(tempo: number): void;
  setStereoWidth(stereoWidth: number): void;
  setSubBass(amount: number): void;
  setLoopForever(loopForever: boolean): void;
  getVoiceMix(): VoiceMix;
  /** Mute/solo state survives track changes; callers reset it if they want to. */
  setVoiceMix(mix: VoiceMix): void;
  setVolume(volume: number): void;
  /** Latest per-voice taps and status. The object is reused; never keep it. */
  readTaps(): TapSnapshot;
  on<K extends keyof AudioEngineEvents>(event: K, callback: AudioEngineEvents[K]): () => void;
  dispose(): void;
}
