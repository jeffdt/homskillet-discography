import { BasePlayerState } from './player';

export const REPEAT_OFF = 0;
export const REPEAT_ALL = 1;
export const REPEAT_ONE = 2;
export const NUM_REPEAT_MODES = 3;
export const REPEAT_LABELS = ['Off', 'All', 'One'];

export const SHUFFLE_OFF = 0;
export const SHUFFLE_ON = 1;
export const NUM_SHUFFLE_MODES = 2;
export const SHUFFLE_LABELS = ['Off', 'On '];

export type RepeatMode = typeof REPEAT_OFF | typeof REPEAT_ALL | typeof REPEAT_ONE;
export type ShuffleMode = typeof SHUFFLE_OFF | typeof SHUFFLE_ON;

export interface SequencerState extends Partial<BasePlayerState> {
  url?: string;
  hasPlayer?: boolean;
  isEjected?: boolean;
}

export interface LocalFilesManager {
  read(url: string): ArrayBuffer;
}
