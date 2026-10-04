import { PlayerMetadata, PlayerParamDef } from './player';
import { ShuffleMode } from './sequencer';

export interface UserSettings {
  [key: string]: any;
}

export interface UserContextValue {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  replaceSettings: (settings: UserSettings) => void;
}

export interface ToastMessage {
  message: string;
  level?: string;
}

export interface ToastContextValue {
  enqueueToast: (message: string | ToastMessage, level?: string) => void;
}

export interface AppProps {
  userContext: UserContextValue;
  toastContext: ToastContextValue;
}

export interface AppState {
  loading: boolean;
  paused: boolean;
  ejected: boolean;
  currentSongMetadata: PlayerMetadata;
  currentSongNumVoices: number;
  currentSongDurationMs: number;
  currentSongPositionMs: number;
  tempo: number;
  voiceMask: boolean[];
  voiceNames: string[];
  voiceGroups: any[];
  songUrl: string | null;
  volume: number;
  shuffle: ShuffleMode;
  isLocked: boolean;
  hasPlayer: boolean;
  paramDefs: PlayerParamDef[];
  paramValues: Record<string, any>;
}
