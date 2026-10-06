import { TapHistory } from '../taps/TapHistory';
import { TapSnapshot } from '../taps/TapSnapshot';
import {
  EngineKind,
  LoadedTrack,
  RendererSettings,
  SpectrumCore,
  TrackInfo,
  VoiceMix,
} from '../types';

/** Events an AudioEngine emits on the main thread. */
export interface AudioEngineEvents {
  /** The loaded track finished (the end fade completed at the track's duration). */
  ended: () => void;
  error: (message: string) => void;
  /** A seek finished; positionMs is where playback resumed. */
  seeked: (positionMs: number) => void;
  /** A track finished loading (load() resolves too). */
  loaded: (track: LoadedTrack) => void;
  /** stop() ran, or the engine failed: no track is loaded any more. */
  unloaded: () => void;
  /** setVoiceMix changed mute or solo; mix is a copy. */
  voiceMixChanged: (mix: VoiceMix) => void;
}

/**
 * Plays chip music. The same interface covers the AudioWorklet engine, the ScriptProcessor
 * fallback and silent stub mode.
 */
export interface AudioEngine {
  readonly kind: EngineKind;
  readonly context: AudioContext;
  /** Pre-volume output (the AudioWorkletNode or ScriptProcessorNode). Visuals read taps, not this node. */
  readonly outputNode: AudioNode;
  /**
   * chip-core on the main thread, used only for the mix spectrum's constant-Q transform
   * (TapAudioDataSource). In worklet mode it is a second instance compiled from the same module
   * that never renders audio; in ScriptProcessor and stub mode it is the instance that renders.
   */
  readonly spectrumCore: SpectrumCore;
  /** Loads and starts a track. Rejects with LoadSupersededError if load() or stop() runs again first. */
  load(data: Uint8Array, filepath: string, settings: RendererSettings): Promise<TrackInfo>;
  /** Unloads the track and rejects any pending load. */
  stop(): void;
  /** Pauses or resumes rendering. */
  setPaused(paused: boolean): void;
  /** Starts a seek spread across render quanta; getPositionMs() reports the target until it ends. */
  seek(positionMs: number): void;
  /** True from seek() until the matching seeked event. */
  isSeeking(): boolean;
  /** Current playback position in track time, extrapolated between status updates. */
  getPositionMs(): number;
  /** Playback speed multiplier. */
  setTempo(tempo: number): void;
  /** Stereo width, 1 is unchanged. */
  setStereoWidth(stereoWidth: number): void;
  /** Sub-bass boost amount. */
  setSubBass(amount: number): void;
  /** Whether the track repeats instead of ending. */
  setLoopForever(loopForever: boolean): void;
  /** A copy of the current mute/solo state. */
  getVoiceMix(): VoiceMix;
  /** The loaded track, or null. */
  getLoadedTrack(): LoadedTrack | null;
  /** Mute/solo state survives track changes; callers reset it if they want to. */
  setVoiceMix(mix: VoiceMix): void;
  /** Output volume applied after outputNode; ignored (silent) in stub mode. */
  setVolume(volume: number): void;
  /** Latest per-voice taps and status. The object is reused; never keep it. */
  readTaps(): TapSnapshot;
  /** Continuous per-voice tap history, up to date with the transport. The object is reused; never keep it. */
  readTapHistory(): TapHistory;
  /** Subscribes to an event; returns the unsubscribe function. */
  on<K extends keyof AudioEngineEvents>(event: K, callback: AudioEngineEvents[K]): () => void;
  /** Releases the processor link, nodes and context. */
  dispose(): void;
}
