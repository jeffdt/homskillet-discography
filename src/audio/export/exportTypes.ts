import { RendererSettings, VoiceLevels } from '../types';
import type { Id3Tags } from './encoders';
import { ExportFormat } from './exportPlan';

/** Everything the export worker needs; bytes is transferred, not copied. */
export interface ExportRequest {
  /** Absolute URL: the worker resolves relative URLs against its own script. */
  wasmUrl: string;
  bytes: ArrayBuffer;
  path: string;
  format: ExportFormat;
  lengthMs: number;
  settings: RendererSettings;
  levels: VoiceLevels;
  tags: Id3Tags;
}

/** Messages the export worker posts back. */
export type ExportWorkerMessage =
  | { type: 'progress'; fraction: number }
  | { type: 'done'; blob: Blob }
  | { type: 'error'; message: string };
