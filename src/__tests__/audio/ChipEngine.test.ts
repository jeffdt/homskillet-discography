// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { ChipEngine } from '../../audio/engine/ChipEngine';
import { ProcessorLink } from '../../audio/engine/links';
import { LoadSupersededError } from '../../audio/errors';
import { EngineCommand, ProcessorEvent } from '../../audio/protocol';
import { FLAG_PAUSED, TapRing } from '../../audio/taps/TapRing';
import { RingTapReader } from '../../audio/taps/transports';
import { ChipCore, EngineKind, RendererSettings, TrackInfo } from '../../audio/types';

const SETTINGS: RendererSettings = { tempo: 1, stereoWidth: 1, subBass: 0, loopForever: false };
const INFO: TrackInfo = {
  metadata: { title: 'Parkour' },
  durationMs: 180000,
  voices: [{ index: 0, name: 'Square 1' }],
  gmeVoiceCount: 1,
};

class FakeLink implements ProcessorLink {
  sent: { command: EngineCommand; transfer?: Transferable[] }[] = [];
  listener: (event: ProcessorEvent) => void = () => {};
  send(command: EngineCommand, transfer?: Transferable[]) {
    this.sent.push({ command, transfer });
  }
  setListener(listener: (event: ProcessorEvent) => void) {
    this.listener = listener;
  }
  dispose() {}
  last<T extends EngineCommand['type']>(type: T) {
    const found = [...this.sent].reverse().find((s) => s.command.type === type);
    return found?.command as Extract<EngineCommand, { type: T }> | undefined;
  }
}

function makeEngine(kind: EngineKind = 'worklet') {
  const link = new FakeLink();
  const ring = new TapRing();
  const context = { currentTime: 0, close: vi.fn(() => Promise.resolve()) };
  const volumeNode = { gain: { value: 1 }, disconnect: vi.fn() };
  const engine = new ChipEngine({
    kind,
    context: context as unknown as AudioContext,
    outputNode: { disconnect: vi.fn() } as unknown as AudioNode,
    volumeNode: volumeNode as unknown as GainNode,
    mainThreadCore: {} as ChipCore,
    link,
    taps: new RingTapReader(ring),
  });
  return { engine, link, ring, context, volumeNode };
}

async function loaded() {
  const parts = makeEngine();
  const loading = parts.engine.load(new Uint8Array([1, 2, 3]), '/A/t.nsf', SETTINGS);
  const { loadId } = parts.link.last('load')!;
  parts.link.listener({ type: 'loaded', loadId, info: INFO });
  await loading;
  return { ...parts, loadId };
}

describe('ChipEngine', () => {
  it('sends a copy of the bytes, transferred, with the current gains', async () => {
    const { engine, link } = makeEngine();
    const data = new Uint8Array([1, 2, 3]);
    const loading = engine.load(data, '/A/t.nsf', SETTINGS);
    const sent = link.sent[0];
    const command = sent.command as Extract<EngineCommand, { type: 'load' }>;
    expect(command.type).toBe('load');
    expect(new Uint8Array(command.bytes)).toEqual(data);
    expect(command.bytes).not.toBe(data.buffer);
    expect(sent.transfer).toEqual([command.bytes]);
    expect(command.gains).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    link.listener({ type: 'loaded', loadId: command.loadId, info: INFO });
    await expect(loading).resolves.toEqual(INFO);
  });

  it('supersedes an in-flight load', async () => {
    const { engine, link } = makeEngine();
    const first = engine.load(new Uint8Array(1), '/A/1.nsf', SETTINGS);
    const firstId = link.last('load')!.loadId;
    const second = engine.load(new Uint8Array(1), '/A/2.nsf', SETTINGS);
    const secondId = link.last('load')!.loadId;
    await expect(first).rejects.toBeInstanceOf(LoadSupersededError);
    link.listener({ type: 'loaded', loadId: firstId, info: { ...INFO, durationMs: 1 } });
    link.listener({ type: 'loaded', loadId: secondId, info: INFO });
    await expect(second).resolves.toEqual(INFO);
  });

  it('rejects a pending load on stop and ignores its later events', async () => {
    const { engine, link } = makeEngine();
    const ended = vi.fn();
    engine.on('ended', ended);
    const loading = engine.load(new Uint8Array(1), '/A/1.nsf', SETTINGS);
    const { loadId } = link.last('load')!;
    engine.stop();
    await expect(loading).rejects.toBeInstanceOf(LoadSupersededError);
    expect(link.last('unload')).toEqual({ type: 'unload' });
    link.listener({ type: 'loaded', loadId, info: INFO });
    link.listener({ type: 'ended', loadId });
    expect(ended).not.toHaveBeenCalled();
  });

  it('rejects with the processor message when a load fails', async () => {
    const { engine, link } = makeEngine();
    const loading = engine.load(new Uint8Array(1), '/A/bad.nsf', SETTINGS);
    link.listener({ type: 'loadFailed', loadId: link.last('load')!.loadId, message: 'bad file' });
    await expect(loading).rejects.toThrow('bad file');
  });

  it('emits ended only for the current track', async () => {
    const { engine, link, loadId } = await loaded();
    const ended = vi.fn();
    engine.on('ended', ended);
    link.listener({ type: 'ended', loadId: loadId - 1 });
    expect(ended).not.toHaveBeenCalled();
    link.listener({ type: 'ended', loadId });
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('reports position 0 before anything loads', () => {
    expect(makeEngine().engine.getPositionMs()).toBe(0);
  });

  it('extrapolates position from the newest status by tempo, capped', async () => {
    const { engine, ring, context, loadId } = await loaded();
    ring.setStatus(1000, 2.0, 0, 1, 24000, loadId);
    context.currentTime = 2.1;
    expect(engine.getPositionMs()).toBeCloseTo(1100, 6);
    engine.setTempo(2);
    expect(engine.getPositionMs()).toBeCloseTo(1200, 6);
    context.currentTime = 10;
    expect(engine.getPositionMs()).toBeCloseTo(1000 + 250 * 2, 6);
  });

  it('does not extrapolate while paused or when the status belongs to another load', async () => {
    const { engine, ring, context, loadId } = await loaded();
    ring.setStatus(1000, 2.0, FLAG_PAUSED, 1, 24000, loadId);
    context.currentTime = 2.1;
    expect(engine.getPositionMs()).toBe(1000);
    ring.setStatus(5000, 2.0, 0, 1, 24000, loadId + 1);
    expect(engine.getPositionMs()).toBe(0);
  });

  it('reports the seek target until the matching seeked event', async () => {
    const { engine, link } = await loaded();
    const seeked = vi.fn();
    engine.on('seeked', seeked);
    engine.seek(42000);
    const { seekId } = link.last('seek')!;
    expect(engine.isSeeking()).toBe(true);
    expect(engine.getPositionMs()).toBe(42000);
    link.listener({ type: 'seeked', seekId: seekId - 1, positionMs: 1 });
    expect(engine.isSeeking()).toBe(true);
    link.listener({ type: 'seeked', seekId, positionMs: 42000 });
    expect(engine.isSeeking()).toBe(false);
    expect(seeked).toHaveBeenCalledWith(42000);
  });

  it('ignores seeks before a track has loaded and clamps negative targets', async () => {
    const empty = makeEngine();
    empty.engine.seek(1000);
    expect(empty.link.last('seek')).toBeUndefined();
    const { engine, link } = await loaded();
    engine.seek(-50);
    expect(link.last('seek')!.positionMs).toBe(0);
  });

  it('turns mute and solo into gains', async () => {
    const { engine, link } = makeEngine();
    engine.setVoiceMix({ muted: [true], soloed: [] });
    expect(link.last('gains')!.gains).toEqual([0, 1, 1, 1, 1, 1, 1, 1]);
    engine.setVoiceMix({ muted: [], soloed: [false, false, true] });
    expect(link.last('gains')!.gains).toEqual([0, 0, 1, 0, 0, 0, 0, 0]);
    expect(engine.getVoiceMix().soloed).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('forwards settings and pause', async () => {
    const { engine, link } = makeEngine();
    engine.setPaused(true);
    engine.setStereoWidth(0.5);
    engine.setSubBass(1.2);
    engine.setLoopForever(true);
    expect(link.last('pause')).toEqual({ type: 'pause', paused: true });
    expect(link.last('stereoWidth')).toEqual({ type: 'stereoWidth', stereoWidth: 0.5 });
    expect(link.last('subBass')).toEqual({ type: 'subBass', subBass: 1.2 });
    expect(link.last('loopForever')).toEqual({ type: 'loopForever', loopForever: true });
  });

  it('keeps stub mode silent regardless of volume', () => {
    const worklet = makeEngine('worklet');
    worklet.engine.setVolume(0.5);
    expect(worklet.volumeNode.gain.value).toBe(0.5);
    const stub = makeEngine('stub');
    stub.engine.setVolume(1);
    expect(stub.volumeNode.gain.value).toBe(0);
  });

  it('forwards processor errors', () => {
    const { engine, link } = makeEngine();
    const error = vi.fn();
    engine.on('error', error);
    link.listener({ type: 'error', message: 'boom' });
    expect(error).toHaveBeenCalledWith('boom');
  });

  it('ignores a stale loadFailed from a superseded load', async () => {
    const { engine, link } = makeEngine();
    const error = vi.fn();
    engine.on('error', error);
    const first = engine.load(new Uint8Array(1), '/A/1.nsf', SETTINGS);
    const firstId = link.last('load')!.loadId;
    const second = engine.load(new Uint8Array(1), '/A/2.nsf', SETTINGS);
    await expect(first).rejects.toBeInstanceOf(LoadSupersededError);
    link.listener({ type: 'loadFailed', loadId: firstId, message: 'stale' });
    link.listener({ type: 'loaded', loadId: link.last('load')!.loadId, info: INFO });
    await expect(second).resolves.toEqual(INFO);
    expect(error).not.toHaveBeenCalled();
  });

  it('clears a pending seek on stop and on load', async () => {
    const stopped = await loaded();
    stopped.engine.seek(1000);
    expect(stopped.engine.isSeeking()).toBe(true);
    stopped.engine.stop();
    expect(stopped.engine.isSeeking()).toBe(false);

    const reloaded = await loaded();
    reloaded.engine.seek(1000);
    void reloaded.engine.load(new Uint8Array(1), '/A/2.nsf', SETTINGS).catch(() => {});
    expect(reloaded.engine.isSeeking()).toBe(false);
  });

  it('emits ended at most once per track', async () => {
    const { engine, link, loadId } = await loaded();
    const ended = vi.fn();
    engine.on('ended', ended);
    link.listener({ type: 'ended', loadId });
    link.listener({ type: 'ended', loadId });
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('stops delivering events after unsubscribe', async () => {
    const { engine, link, loadId } = await loaded();
    const ended = vi.fn();
    const off = engine.on('ended', ended);
    off();
    link.listener({ type: 'ended', loadId });
    expect(ended).not.toHaveBeenCalled();
  });

  it('survives a second dispose without an unhandled rejection', async () => {
    const { engine, context } = makeEngine();
    context.close.mockImplementation(() => Promise.reject(new Error('already closed')));
    engine.dispose();
    engine.dispose();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe('processor failure', () => {
    it('rejects a pending load, clears the seek and stops reporting position', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { engine, link } = await loaded();
      engine.seek(5000);
      const reloading = engine.load(new Uint8Array([1]), '/A/u.nsf', SETTINGS);
      const rejection = expect(reloading).rejects.toThrow('dead');
      link.listener({ type: 'error', message: 'dead' });
      await rejection;
      expect(engine.isSeeking()).toBe(false);
      expect(engine.getPositionMs()).toBe(0);
    });

    it('emits an error event and ignores seeks afterwards', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { engine, link } = await loaded();
      const errors = vi.fn();
      engine.on('error', errors);
      link.listener({ type: 'error', message: 'dead' });
      expect(errors).toHaveBeenCalledWith('dead');
      engine.seek(1000);
      expect(engine.isSeeking()).toBe(false);
    });
  });

  it('lets position lead by at most one buffer when the snapshot is stamped ahead', async () => {
    const make = (bufferDurationS?: number) => {
      const link = new FakeLink();
      const ring = new TapRing();
      const context = { currentTime: 1, close: vi.fn(() => Promise.resolve()) };
      const engine = new ChipEngine({
        kind: 'script-processor',
        context: context as unknown as AudioContext,
        outputNode: { disconnect: vi.fn() } as unknown as AudioNode,
        volumeNode: { gain: { value: 1 }, disconnect: vi.fn() } as unknown as GainNode,
        mainThreadCore: {} as ChipCore,
        link,
        taps: new RingTapReader(ring),
        bufferDurationS,
      });
      return { engine, link, ring };
    };
    const positionWith = async (bufferDurationS?: number) => {
      const { engine, link, ring } = make(bufferDurationS);
      const loading = engine.load(new Uint8Array([1]), '/A/t.nsf', SETTINGS);
      const { loadId } = link.last('load')!;
      link.listener({ type: 'loaded', loadId, info: INFO });
      await loading;
      ring.setStatus(10000, 1.1, 0, 1, 24000, loadId);
      return engine.getPositionMs();
    };
    expect(await positionWith()).toBe(10000);
    expect(await positionWith(0.05)).toBeCloseTo(10000 - 50, 3);
  });
});
