import EventEmitter from 'events';

export type PlayerState = 'stopped' | 'playing' | 'paused';

export interface PlayerMetadata {
  title?: string | null;
  artist?: string | null;
  game?: string | null;
  system?: string | null;
  copyright?: string | null;
  comment?: string | null;
  length?: number;
  intro_length?: number;
  loop_length?: number;
  play_length?: number;
  formatted?: {
    title?: string;
    subtitle?: string;
  };
}

export interface PlayerParamDef {
  id: string;
  label: string;
  type: 'number' | 'toggle' | 'enum';
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
  hint?: string;
  options?: string[];
}

export interface BasePlayerState {
  metadata: PlayerMetadata;
  durationMs: number;
  positionMs: number;
  numVoices: number;
  numSubtunes: number;
  subtune: number;
  paramDefs: PlayerParamDef[];
  paramValues: Record<string, any>;
  tempo: number;
  voiceMask: boolean[];
  voiceNames: (string | undefined)[];
  voiceGroups: any[];
  infoTexts: string[];
  isStopped: boolean;
  isPaused: boolean;
}

export interface IPlayer extends EventEmitter {
  playerKey: string | null;
  canPlay(fileExtension: string): boolean;
  loadData(
    data: Uint8Array,
    filepath: string,
    persistedSettings: any,
    subtune?: number
  ): Promise<void>;
  suspend(): void;
  resume(): void;
  togglePause(): boolean;
  isPaused(): boolean;
  stop(): void;
  playSubtune(subtune: number): number;
  isPlaying(): boolean;
  getTempo(): number;
  setTempo(tempo: number): void;
  setFadeout(startMs: number): void;
  getDurationMs(): number;
  getPositionMs(): number;
  seekMs(positionMs: number): void;
  getVoiceName(index: number): string | undefined;
  getVoiceMask(): boolean[];
  setVoiceMask(voiceMask: boolean[]): void;
  getNumVoices(): number;
  getVoiceNames(): (string | undefined)[];
  getVoiceGroups(): any[];
  getNumSubtunes(): number;
  getSubtune(): number;
  getMetadata(): PlayerMetadata;
  getInfoTexts(): string[];
  getParamDefs(): PlayerParamDef[];
  getParamDefault(paramId: string): any;
  resolveParamValue(
    paramId: string,
    transientValue: any,
    persistedSettings: any
  ): any;
  resolveParamValues(persistedSettings: any): void;
  getParamValues(): Record<string, any>;
  getBasePlayerState(): BasePlayerState;
  processAudio(output: Float32Array[]): void;
  handleFileSystemReady(): void;
}
