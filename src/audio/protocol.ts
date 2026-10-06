import { RendererSettings, TrackInfo } from './types';

/** Main thread to processor. */
export type EngineCommand =
  | {
      type: 'load';
      loadId: number;
      bytes: ArrayBuffer;
      filepath: string;
      settings: RendererSettings;
      gains: number[];
    }
  | { type: 'unload' }
  | { type: 'pause'; paused: boolean }
  | { type: 'seek'; seekId: number; positionMs: number }
  | { type: 'tempo'; tempo: number }
  | { type: 'stereoWidth'; stereoWidth: number }
  | { type: 'subBass'; subBass: number }
  | { type: 'loopForever'; loopForever: boolean }
  | { type: 'gains'; gains: number[] };

/** Processor to main thread. Tap snapshots travel separately as bare ArrayBuffers. */
export type ProcessorEvent =
  | { type: 'ready' }
  | { type: 'loaded'; loadId: number; info: TrackInfo }
  | { type: 'loadFailed'; loadId: number; message: string }
  | { type: 'ended'; loadId: number }
  | { type: 'seeked'; seekId: number; positionMs: number }
  | { type: 'error'; message: string };
