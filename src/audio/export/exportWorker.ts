import CHIP_CORE from '../../chip-core';
import { instantiateChipCore } from '../loadChipCore';
import { ChipCoreFactory } from '../types';
import { Encoder, Mp3Encoder, WavEncoder } from './encoders';
import { exportFrameCount } from './exportPlan';
import { ExportRequest, ExportWorkerMessage } from './exportTypes';
import { renderExport } from './renderExport';

const PROGRESS_INTERVAL_MS = 100;
// The worker global has the same postMessage/onmessage shape as a Worker handle.
const scope = globalThis as unknown as Worker;

function post(message: ExportWorkerMessage) {
  scope.postMessage(message);
}

async function run(request: ExportRequest): Promise<void> {
  const response = await fetch(request.wasmUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching chip-core.wasm`);
  const core = await instantiateChipCore(CHIP_CORE as unknown as ChipCoreFactory, {
    bytes: await response.arrayBuffer(),
  });
  const encoder: Encoder =
    request.format === 'wav'
      ? new WavEncoder(exportFrameCount(request.lengthMs))
      : new Mp3Encoder(request.tags);
  let lastPost = 0;
  const parts = renderExport(
    core,
    {
      bytes: new Uint8Array(request.bytes),
      path: request.path,
      lengthMs: request.lengthMs,
      settings: request.settings,
      levels: request.levels,
    },
    encoder,
    (fraction) => {
      const now = performance.now();
      if (now - lastPost >= PROGRESS_INTERVAL_MS) {
        lastPost = now;
        post({ type: 'progress', fraction });
      }
    }
  );
  post({ type: 'done', blob: new Blob(parts, { type: encoder.mimeType }) });
}

scope.onmessage = (event: MessageEvent<ExportRequest>) => {
  run(event.data).catch((error: unknown) =>
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  );
};
