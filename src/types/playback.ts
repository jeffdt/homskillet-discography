import { PlayerParamDef } from './player';

/**
 * Read-only playback snapshot the shell renders from. App owns it today;
 * sub-project 2 produces the same shape from AudioEngine.
 */
export interface PlaybackState {
  /** chip-core and the Sequencer are ready to play. */
  ready: boolean;
  ejected: boolean;
  paused: boolean;
  /** Sequencer URL of the current track; matches Track.href. */
  songUrl: string | null;
  durationMs: number;
  tempo: number;
  numVoices: number;
  voiceMask: boolean[];
  voiceNames: string[];
  voiceGroups: any[];
  paramDefs: PlayerParamDef[];
  paramValues: Record<string, any>;
  playerKey: string | null;
  volume: number;
  shuffle: boolean;
  /** Loop the current track instead of advancing (the old "lock"). */
  repeat: boolean;
}

/** Commands the shell may issue. The object is created once, so its identity is stable. */
export interface PlaybackControls {
  playTracks(hrefs: string[], index: number): void;
  togglePause(): void;
  prevTrack(): void;
  nextTrack(): void;
  seekToFraction(fraction: number): void;
  seekToMs(ms: number): void;
  seekRelative(deltaMs: number): void;
  getPositionMs(): number;
  setTempo(tempo: number): void;
  setSpeedRelative(delta: number): void;
  setVoiceMask(voiceMask: boolean[]): void;
  setParam(id: string, value: any): void;
  pinParam(persistedKey: string, currentValue: any): void;
  setVolume(volume: number): void;
  setShuffle(on: boolean): void;
  setRepeat(on: boolean): void;
  /** Resumes a suspended AudioContext; call from inside a user gesture. */
  resumeAudio(): void;
}
