/**
 * The audio data contract: what visuals read from the audio engine. Sub-projects 5 (per-channel
 * visualizer) and 6 (mixer panel) build on these types; change them only with a plan that says so.
 */

/** Static info about one voice of the loaded track. Changes only on load, unload and mute/solo. */
export interface VoiceInfo {
  /** Stable voice index 0..7: indexes VoiceFrame.voices and picks the color --ch-{index}. */
  index: number;
  /** GME's voice name: "Square 1", "Triangle", "Saw Wave", ... */
  name: string;
  /** Sound chip: "2A03", "VRC6", "VRC7", "FDS", "MMC5", "N163", "FME-7", or "Expansion" when unknown. */
  chip: string;
  muted: boolean;
  soloed: boolean;
  /** True when the voice is heard: not muted, and either nothing is soloed or this voice is. */
  audible: boolean;
}

/** One voice's slice of a VoiceFrame. Reused every frame. */
export interface VoiceData {
  /** WAVEFORM_SAMPLES samples at VoiceFrame.sampleRate, oldest first, -1..1, before mute/solo. */
  readonly waveform: Float32Array;
  /** RMS of the newest RMS_SAMPLES of waveform, 0..1, smoothed (fast attack, slow release), before mute/solo. */
  readonly rms: number;
  /**
   * Magnitude per SpectrumLayout bin, before mute/solo, on about the same scale as
   * VoiceFrame.mixSpectrum. Computed on the first read in each frame (about 0.05 ms per voice).
   */
  readonly spectrum: Float32Array;
}

/**
 * The latest analysis, lined up with what is audible now. Mutable and reused: read it inside a
 * FrameLoop draw and never keep it or its arrays past that call.
 */
export interface VoiceFrame {
  /** AudioContext time at which the newest waveform sample is heard. */
  readonly time: number;
  /** Rate of the waveform arrays: the context rate / TAP_DECIMATION (24000 at 48 kHz); 0 before any audio. */
  readonly sampleRate: number;
  /** Voices the loaded track uses, 0 when nothing is loaded. voices[voiceCount..] stay silent. */
  readonly voiceCount: number;
  /** Always VOICE_PAIRS (8) entries, indexed by VoiceInfo.index. */
  readonly voices: readonly VoiceData[];
  /**
   * Full-mix constant-Q magnitude per SpectrumLayout bin, after mute/solo, before SubBass, fades
   * and volume. Computed on the first read in each frame (about 0.3 ms).
   */
  readonly mixSpectrum: Float32Array;
}

/** The bin layout every spectrum shares: log-spaced bins from minHz to maxHz. */
export interface SpectrumLayout {
  readonly bins: number;
  readonly minHz: number;
  readonly maxHz: number;
  /** Center frequency of each bin in Hz, ascending. */
  readonly frequencies: Float32Array;
}

/** What the UI reads about the audio. One instance lives for the whole app. */
export interface AudioDataSource {
  /** The loaded track's voices; [] when nothing is loaded. A new array whenever anything changes. */
  getVoices(): VoiceInfo[];
  /** Calls cb on track load, unload and mute/solo changes (never per frame). Returns the unsubscribe function. */
  onVoicesChanged(cb: (voices: VoiceInfo[]) => void): () => void;
  /** Call from inside a FrameLoop draw only (the loop calls it once per frame and passes the result on). */
  readFrame(): VoiceFrame;
  /** The shared spectrum bin layout. Constant for the app's lifetime. */
  getSpectrumLayout(): SpectrumLayout;
}

/** A per-frame consumer. dtMs is the time since this consumer's previous draw, 0 on its first. */
export type FrameDraw = (frame: VoiceFrame, dtMs: number) => void;

/** Per-consumer FrameLoop options. */
export interface FrameLoopOptions {
  /** Draw at most this often. The loop's global cap (30 on low-power devices) also applies. */
  maxFps?: number;
  /** Keep drawing while playback is paused or stopped (idle animations). Default false. */
  runWhilePaused?: boolean;
}

/** One shared requestAnimationFrame loop for every animated consumer. */
export interface FrameLoop {
  /**
   * Registers draw under id and returns its remove function. Consumers draw in the order they
   * were added. Adding an id that is already registered replaces it.
   */
  add(id: string, draw: FrameDraw, opts?: FrameLoopOptions): () => void;
}

/** The app-side controls of the FrameLoop. Only App and AppShell call these. */
export interface FrameLoopController extends FrameLoop {
  /** Playback state: while false only runWhilePaused consumers draw. */
  setPlaying(playing: boolean): void;
  /** Global frame-rate cap for every consumer; null removes it. */
  setMaxFps(maxFps: number | null): void;
  /** True while a frame is scheduled. */
  isRunning(): boolean;
  /** Removes every consumer and stops for good. */
  dispose(): void;
}

/** Timing summary the FrameLoop reports every STATS_EVERY_FRAMES frames when ?debug is on. */
export interface FrameLoopStats {
  frames: number;
  meanMs: number;
  p75Ms: number;
  maxMs: number;
  consumers: Record<string, { meanMs: number; p75Ms: number }>;
}

/** Writes the smoothed audio pulse (0..1) to CSS custom properties on elements, with no React renders. */
export interface PulseChannel {
  /** Writes the pulse to element's property every frame until the returned function runs (which writes 0). */
  attach(element: HTMLElement, property: string): () => void;
  /** Off writes 0 to every attached element and stops the work; on resumes it. */
  setEnabled(enabled: boolean): void;
}
