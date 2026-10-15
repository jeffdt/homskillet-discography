import { describe, expect, it, vi } from 'vitest';
import { ExportRequest } from '../../audio/export/exportTypes';
import { exportTrack, saveBlob } from '../../audio/export/exportTrack';

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  transfers: unknown[] = [];
  terminated = false;
  postMessage(message: unknown, transfer?: Transferable[]) {
    this.posted.push(message);
    this.transfers.push(transfer);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

function request(): ExportRequest {
  return {
    wasmUrl: 'http://localhost/chip-core.wasm',
    bytes: new ArrayBuffer(8),
    path: '/Bazaar/groove.nsf',
    format: 'mp3',
    lengthMs: 5000,
    settings: { tempo: 1, stereoWidth: 1, subBass: 0, loopForever: false },
    levels: {
      gains: [1, 1, 1, 1, 1, 1, 1, 1],
      pans: [0, 0, 0, 0, 0, 0, 0, 0],
      sends: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    tags: { title: 'Groove', artist: 'homskillet' },
  };
}

function start(worker: FakeWorker, options: Parameters<typeof exportTrack>[1] = {}) {
  return exportTrack(request(), { createWorker: () => worker as unknown as Worker, ...options });
}

describe('exportTrack', () => {
  it('sends the request with the bytes transferred and resolves with the Blob', async () => {
    const worker = new FakeWorker();
    const progress: number[] = [];
    const result = start(worker, { onProgress: (fraction) => progress.push(fraction) });
    const sent = worker.posted[0] as ExportRequest;
    expect(sent).toMatchObject({ path: '/Bazaar/groove.nsf', format: 'mp3', lengthMs: 5000 });
    expect(worker.transfers).toEqual([[sent.bytes]]);
    worker.emit({ type: 'progress', fraction: 0.5 });
    const blob = new Blob(['x']);
    worker.emit({ type: 'done', blob });
    await expect(result).resolves.toBe(blob);
    expect(progress).toEqual([0.5]);
    expect(worker.terminated).toBe(true);
  });

  it('rejects with the worker error message', async () => {
    const worker = new FakeWorker();
    const result = start(worker);
    worker.emit({ type: 'error', message: 'gme_load_data failed' });
    await expect(result).rejects.toThrow('gme_load_data failed');
    expect(worker.terminated).toBe(true);
  });

  it('rejects when the worker script itself fails', async () => {
    const worker = new FakeWorker();
    const result = start(worker);
    worker.onerror?.({ message: 'SyntaxError in worker' } as ErrorEvent);
    await expect(result).rejects.toThrow('SyntaxError in worker');
    expect(worker.terminated).toBe(true);
  });

  it('terminates the worker and rejects with AbortError on abort', async () => {
    const worker = new FakeWorker();
    const controller = new AbortController();
    const result = start(worker, { signal: controller.signal });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminated).toBe(true);
  });

  it('does not start a worker when already aborted', async () => {
    const createWorker = vi.fn();
    const controller = new AbortController();
    controller.abort();
    await expect(
      exportTrack(request(), { createWorker, signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(createWorker).not.toHaveBeenCalled();
  });
});

describe('saveBlob', () => {
  it('clicks a download link named after the file and revokes the URL later', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clicked: { download: string; href: string }[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push({ download: this.download, href: this.href });
    });
    saveBlob(new Blob(['x']), 'homskillet - Groove.mp3');
    expect(clicked).toEqual([{ download: 'homskillet - Groove.mp3', href: 'blob:fake' }]);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    click.mockRestore();
    vi.useRealTimers();
  });
});
