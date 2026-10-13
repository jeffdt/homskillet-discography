import { ExportRequest, ExportWorkerMessage } from './exportTypes';

const REVOKE_DELAY_MS = 10000;

/** Hooks for an export: progress, cancellation, and (for tests) the worker. */
export interface ExportOptions {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  createWorker?: () => Worker;
}

function createExportWorker(): Worker {
  return new Worker(new URL('./exportWorker.ts', import.meta.url), { type: 'module' });
}

function abortError(): DOMException {
  return new DOMException('Export cancelled', 'AbortError');
}

/**
 * Renders and encodes a track in a Web Worker. Resolves with the file; rejects with the worker's
 * error, or an AbortError when the signal aborts (the worker is terminated at once).
 */
export function exportTrack(request: ExportRequest, options: ExportOptions = {}): Promise<Blob> {
  const { onProgress, signal, createWorker = createExportWorker } = options;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const worker = createWorker();
    const stop = () => {
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      stop();
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort);
    worker.onmessage = (event: MessageEvent<ExportWorkerMessage>) => {
      const message = event.data;
      if (message.type === 'progress') {
        onProgress?.(message.fraction);
      } else if (message.type === 'done') {
        stop();
        resolve(message.blob);
      } else {
        stop();
        reject(new Error(message.message));
      }
    };
    worker.onerror = (event: ErrorEvent) => {
      stop();
      reject(new Error(event.message || 'The export worker failed.'));
    };
    worker.postMessage(request, [request.bytes]);
  });
}

/** Saves a Blob through a temporary download link. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoking at once can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
