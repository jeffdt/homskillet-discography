// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChipCoreStub from '../../chip-core-stub';
import { TAP_POOL_SIZE } from '../../audio/constants';
import { ChipEngine } from '../../audio/engine/ChipEngine';
import { InProcessLink, WorkletLink } from '../../audio/engine/links';
import { ProcessorCore } from '../../audio/processor/ProcessorCore';
import { TapRing } from '../../audio/taps/TapRing';
import { PooledTapReader, PooledTapSender, RingTapReader } from '../../audio/taps/transports';
import { ChipCore, RendererSettings } from '../../audio/types';

const RATE = 48000;
const SETTINGS: RendererSettings = { tempo: 1, stereoWidth: 1, subBass: 0, loopForever: false };
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
const fakeNodes = () => ({
  context: { currentTime: 0, close: vi.fn(() => Promise.resolve()) },
  outputNode: { disconnect: vi.fn() } as unknown as AudioNode,
  volumeNode: { gain: { value: 1 }, disconnect: vi.fn() } as unknown as GainNode,
});

describe('engine end to end on the stub core', () => {
  const ports: MessagePort[] = [];
  afterEach(() => ports.splice(0).forEach((port) => port.close()));

  it('loads, plays, reports position and taps, and seeks in process', async () => {
    const core = (await ChipCoreStub()) as ChipCore;
    const link = new InProcessLink();
    const ring = new TapRing();
    const processor = new ProcessorCore({
      core,
      sampleRate: RATE,
      emit: link.emit,
      ring,
      sender: null,
    });
    link.attach(processor);
    const { context, outputNode, volumeNode } = fakeNodes();
    const engine = new ChipEngine({
      kind: 'script-processor',
      context: context as unknown as AudioContext,
      outputNode,
      volumeNode,
      mainThreadCore: core,
      link,
      taps: new RingTapReader(ring),
    });

    const info = await engine.load(new Uint8Array(16), '/Album/track.nsf', SETTINGS);
    expect(info.voices).toHaveLength(5);

    const left = new Float32Array(128);
    const right = new Float32Array(128);
    for (let q = 0; q < 375; q++) processor.process(left, right, (q * 128) / RATE);
    context.currentTime = (375 * 128) / RATE;
    expect(engine.getPositionMs()).toBeGreaterThan(990);
    expect(engine.getPositionMs()).toBeLessThan(1010);
    const taps = engine.readTaps();
    expect(taps.voiceCount).toBe(5);
    expect(taps.voices[0].some((x) => x !== 0)).toBe(true);

    engine.seek(5000);
    expect(engine.getPositionMs()).toBe(5000);
    for (let round = 0; round < 50 && engine.isSeeking(); round++) {
      for (let q = 0; q < 20; q++) processor.process(left, right, 0);
      await settle();
    }
    expect(engine.isSeeking()).toBe(false);
  });

  it('moves pooled snapshots over a MessagePort and recycles every buffer', async () => {
    const core = (await ChipCoreStub()) as ChipCore;
    const { port1, port2 } = new MessageChannel();
    ports.push(port1, port2);
    const ring = new TapRing();
    const sender = new PooledTapSender((buffer) => port1.postMessage(buffer, [buffer]));
    const processor = new ProcessorCore({
      core,
      sampleRate: RATE,
      emit: (event) => port1.postMessage(event),
      ring,
      sender,
    });
    port1.onmessage = (e: MessageEvent) =>
      e.data instanceof ArrayBuffer
        ? processor.handleReturnedBuffer(e.data)
        : processor.handleCommand(e.data);
    const taps = new PooledTapReader((buffer) => port2.postMessage(buffer, [buffer]));
    const { context, outputNode, volumeNode } = fakeNodes();
    const engine = new ChipEngine({
      kind: 'worklet',
      context: context as unknown as AudioContext,
      outputNode,
      volumeNode,
      mainThreadCore: core,
      link: new WorkletLink(port2, taps),
      taps,
    });

    const loading = engine.load(new Uint8Array(16), '/Album/track.nsf', SETTINGS);
    await settle();
    await loading;
    const left = new Float32Array(128);
    const right = new Float32Array(128);
    for (let round = 0; round < 8; round++) {
      for (let q = 0; q < 6; q++) processor.process(left, right, 0);
      await settle();
    }
    expect(engine.readTaps().loadId).toBe(1);
    expect(engine.readTaps().positionMs).toBeGreaterThan(0);
    expect(sender.droppedPosts).toBe(0);
    expect(sender.availableBuffers).toBe(TAP_POOL_SIZE);
  });
});
