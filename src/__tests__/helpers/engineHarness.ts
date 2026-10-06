import { vi } from 'vitest';
import { AudioEngine } from '../../audio/engine/AudioEngine';
import { ChipEngine } from '../../audio/engine/ChipEngine';
import { ProcessorLink } from '../../audio/engine/links';
import { EngineCommand, ProcessorEvent } from '../../audio/protocol';
import { TapRing } from '../../audio/taps/TapRing';
import { RingTapReader } from '../../audio/taps/transports';
import { EngineKind, SpectrumCore, TrackInfo } from '../../audio/types';
import { NO_CQT_CORE } from './spectrumCores';

/** A ProcessorLink that records commands; tests answer through `listener`. */
export class FakeLink implements ProcessorLink {
  sent: { command: EngineCommand; transfer?: Transferable[] }[] = [];
  listener: (event: ProcessorEvent) => void = () => {};
  send(command: EngineCommand, transfer?: Transferable[]) {
    this.sent.push({ command, transfer });
  }
  setListener(listener: (event: ProcessorEvent) => void) {
    this.listener = listener;
  }
  dispose() {}
  /** The newest command of a type. */
  last<T extends EngineCommand['type']>(type: T) {
    const found = [...this.sent].reverse().find((s) => s.command.type === type);
    return found?.command as Extract<EngineCommand, { type: T }> | undefined;
  }
}

/** A ChipEngine over a FakeLink and an in-process tap ring, with a settable context clock. */
export function makeTestEngine(options: { kind?: EngineKind; spectrumCore?: SpectrumCore } = {}) {
  const link = new FakeLink();
  const ring = new TapRing();
  const context = { currentTime: 0, close: vi.fn(() => Promise.resolve()) };
  const engine = new ChipEngine({
    kind: options.kind ?? 'worklet',
    context: context as unknown as AudioContext,
    outputNode: { disconnect: vi.fn() } as unknown as AudioNode,
    volumeNode: { gain: { value: 1 }, disconnect: vi.fn() } as unknown as GainNode,
    spectrumCore: options.spectrumCore ?? NO_CQT_CORE,
    link,
    taps: new RingTapReader(ring),
  });
  return { engine, link, ring, context };
}

/** Loads a track with these voice names through the FakeLink; resolves once the engine reports it. */
export function loadTrack(
  engine: AudioEngine,
  link: FakeLink,
  bytes: Uint8Array,
  voiceNames: string[]
): Promise<TrackInfo> {
  const promise = engine.load(bytes, '/Album/track.nsf', {
    tempo: 1,
    stereoWidth: 1,
    subBass: 0,
    loopForever: false,
  });
  link.listener({
    type: 'loaded',
    loadId: link.last('load')!.loadId,
    info: {
      metadata: {},
      durationMs: 60000,
      voices: voiceNames.map((name, index) => ({ index, name })),
      gmeVoiceCount: voiceNames.length,
    },
  });
  return promise;
}
