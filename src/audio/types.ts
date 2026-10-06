import { PlayerMetadata } from '../types/player';

/** The chip-core calls the main thread's constant-Q transform needs (src/showcqtbar.c). */
export interface SpectrumCore {
  HEAPF32: Float32Array;
  _malloc(size: number): number;
  _free(ptr: number): void;
  _cqt_init(
    rate: number,
    width: number,
    volume: number,
    minHz: number,
    maxHz: number,
    supersample: number
  ): number;
  _cqt_calc(inputLeft: number, inputRight: number): void;
  _cqt_render_line(outPtr: number): void;
}

/** The subset of the Emscripten chip-core module the audio engine uses. chip-core-stub.js implements the same surface. */
export interface ChipCore extends SpectrumCore {
  HEAPU8: Uint8Array;
  HEAP16: Int16Array;
  HEAP32: Int32Array;
  _malloc(size: number): number;
  _free(ptr: number): void;
  UTF8ToString(ptr: number): string;
  _gme_identify_header(dataPtr: number): number;
  _gme_identify_extension(extensionPtr: number): number;
  _gme_new_emu_multi_channel(type: number, sampleRate: number): number;
  _gme_load_data(emu: number, dataPtr: number, size: number): number;
  _gme_multi_channel(emu: number): number;
  _gme_open_data(dataPtr: number, size: number, emuOutPtr: number, sampleRate: number): number;
  _gme_delete(emu: number): void;
  _gme_start_track(emu: number, track: number): number;
  _gme_play(emu: number, sampleCount: number, outPtr: number): number;
  _gme_track_ended(emu: number): number;
  _gme_tell_scaled(emu: number): number;
  _gme_seek_scaled(emu: number, positionMs: number): number;
  _gme_set_tempo(emu: number, tempo: number): void;
  _gme_set_stereo_depth(emu: number, depth: number): void;
  _gme_ignore_silence(emu: number, ignore: number): void;
  _gme_voice_count(emu: number): number;
  _gme_voice_name(emu: number, index: number): number;
  _gme_track_info(emu: number, infoOutPtr: number, track: number): number;
  _gme_free_info(info: number): void;
}

/** The Emscripten MODULARIZE factory exported by src/chip-core.js. */
export type ChipCoreFactory = (moduleArg: Record<string, unknown>) => Promise<ChipCore>;

/** A compiled module (preferred) or raw bytes to instantiate chip-core from. */
export interface WasmSource {
  module?: WebAssembly.Module;
  bytes?: ArrayBuffer;
}

/** One mixable voice pair of the loaded track. */
export interface EngineVoice {
  index: number;
  name: string;
}

/** Static facts about a loaded track. */
export interface TrackInfo {
  metadata: PlayerMetadata;
  durationMs: number;
  /** One entry per voice pair, at most VOICE_PAIRS. */
  voices: EngineVoice[];
  /** Voice count reported by GME; above VOICE_PAIRS, extra voices fold into earlier pairs. */
  gmeVoiceCount: number;
}

/** Playback settings applied when a track loads; each also has a live setter. */
export interface RendererSettings {
  tempo: number;
  stereoWidth: number;
  subBass: number;
  /** True disables the fade-out at the track's duration (the lock button). */
  loopForever: boolean;
}

/** Per-voice mute and solo state, indexed by voice pair. */
export interface VoiceMix {
  muted: boolean[];
  soloed: boolean[];
}

/** Where the engine renders: AudioWorklet, main-thread ScriptProcessor, or silent stub. */
export type EngineKind = 'worklet' | 'script-processor' | 'stub';

/** How analysis taps reach the main thread from the worklet. */
export type TapTransport = 'pooled' | 'shared';

/** A loaded track as the engine reports it on the main thread. */
export interface LoadedTrack {
  info: TrackInfo;
  /** Sound chip of each voice in info.voices, from voiceChips. */
  voiceChips: string[];
}
