// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  discardWorkletNode,
  waitForProcessorReadyOrDiscard,
} from '../../audio/engine/createAudioEngine';

vi.mock('../../chip-core', () => ({ default: {} }));
vi.mock('../../chip-core-stub', () => ({ default: {} }));
vi.mock('../../util', () => ({ unlockAudioContext: () => {} }));
vi.mock('../../audio/worklet/processorUrl', () => ({ default: 'chipProcessor.js' }));

function fakeNode() {
  return {
    onprocessorerror: (() => {}) as unknown,
    port: { onmessage: (() => {}) as unknown, close: vi.fn(), postMessage: vi.fn() },
    disconnect: vi.fn(),
  };
}

function fakeContext() {
  return { state: 'running', addEventListener: vi.fn(), removeEventListener: vi.fn() };
}

describe('worklet node failure cleanup', () => {
  it('disconnects the node and closes its port when the processor reports an error', async () => {
    const node = fakeNode();
    const pending = waitForProcessorReadyOrDiscard(fakeContext() as any, node as any, 1000);
    (node.port.onmessage as (e: unknown) => void)({ data: { type: 'error', message: 'boom' } });
    await expect(pending).rejects.toThrow('boom');
    expect(node.disconnect).toHaveBeenCalledTimes(1);
    expect(node.port.close).toHaveBeenCalledTimes(1);
    expect(node.port.onmessage).toBeNull();
    expect(node.onprocessorerror).toBeNull();
  });

  it('discards the node when the ready wait times out', async () => {
    vi.useFakeTimers();
    try {
      const node = fakeNode();
      const pending = waitForProcessorReadyOrDiscard(fakeContext() as any, node as any, 500);
      const assertion = expect(pending).rejects.toThrow('not ready after 500 ms');
      await vi.advanceTimersByTimeAsync(500);
      await assertion;
      expect(node.disconnect).toHaveBeenCalledTimes(1);
      expect(node.port.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the node connected when the processor becomes ready', async () => {
    const node = fakeNode();
    const pending = waitForProcessorReadyOrDiscard(fakeContext() as any, node as any, 1000);
    (node.port.onmessage as (e: unknown) => void)({ data: { type: 'ready' } });
    await expect(pending).resolves.toBeUndefined();
    expect(node.disconnect).not.toHaveBeenCalled();
    expect(node.port.close).not.toHaveBeenCalled();
  });

  it('still disconnects when closing the port throws', () => {
    const node = fakeNode();
    node.port.close.mockImplementation(() => {
      throw new Error('closed');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    discardWorkletNode(node as any);
    expect(node.disconnect).toHaveBeenCalledTimes(1);
  });
});
