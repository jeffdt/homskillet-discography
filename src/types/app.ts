import { RouteComponentProps } from 'react-router-dom';
import { PlayerMetadata, PlayerParamDef } from './player';
import { RepeatMode, ShuffleMode } from './sequencer';
import { Directories, PlayContext } from './catalog';

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

export interface AppProps extends RouteComponentProps {
  userContext: UserContextValue;
  toastContext: ToastContextValue;
}

export type TabType = 'browser' | 'settings' | 'visualizer';

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
  imageUrl: string | null;
  infoTexts: string[];
  showInfo: boolean;
  songUrl: string | null;
  volume: number;
  shuffle: ShuffleMode;
  isLocked: boolean;
  directories: Directories;
  hasPlayer: boolean;
  paramDefs: PlayerParamDef[];
  paramValues: Record<string, any>;
  activeTab: TabType;
  visualizerMaximized: boolean;
}

export interface BrowseProps {
  browsePath: string;
  listing?: any[];
  playContext?: PlayContext;
  currContext?: PlayContext;
  currIdx?: number;
  fetchDirectory: (path: string) => void;
  handleShufflePlay: (path: string) => void;
  onSongClick: (href: string, index: number) => void;
  onCopyLink: (href: string) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  listRef: React.RefObject<any>;
  history: any;
}

export interface VirtualizedListProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  currContext?: PlayContext;
  currIdx?: number;
  onSongClick: (href: string, index: number) => void;
  onCopyLink: (href: string) => void;
  isPlaying: (href: string) => boolean;
  itemList: any[];
  songContext?: PlayContext;
  rowRenderer: (props: {
    item: any;
    onPlay: () => void;
    onCopyLink?: (href: string) => void;
    isPlaying?: boolean;
  }) => JSX.Element;
  listRef: React.RefObject<any>;
  isSorted: boolean;
  children?: React.ReactNode;
}
