import ChipCoreFactoryModule from '../../chip-core';
import ChipCoreStub from '../../chip-core-stub';
import { MAX_SAMPLE_RATE } from '../../config';
import { unlockAudioContext } from '../../util';
import { CHIP_PROCESSOR_NAME, WORKLET_READY_TIMEOUT_MS } from '../constants';
import { CompiledWasm, compileChipCoreWasm, instantiateChipCore } from '../loadChipCore';
import { ProcessorCore } from '../processor/ProcessorCore';
import { ProcessorEvent } from '../protocol';
import { TAP_RING_BYTES, TapRing } from '../taps/TapRing';
import { PooledTapReader, RingTapReader } from '../taps/transports';
import { ChipCore, ChipCoreFactory, EngineKind, TapTransport, WasmSource } from '../types';
import processorUrl from '../worklet/processorUrl';
import { AudioEngine } from './AudioEngine';
import { ChipEngine } from './ChipEngine';
import { chooseEngineKind, chooseTapTransport } from './engineKind';
import { InProcessLink, WorkletLink } from './links';

/** Options for createAudioEngine. */
export interface CreateAudioEngineOptions {
  latencyHint: AudioContextLatencyCategory;
  wasmUrl: string;
  forcedKind?: EngineKind | null;
  forcedTapTransport?: TapTransport | null;
  debug?: boolean;
  /** An AudioContext from createUnlockedAudioContext, so callers can resume it before the engine resolves. */
  context?: AudioContext;
}

/** Creates an AudioContext (rate-limited) that unlocks itself on the first user gesture. */
export function createUnlockedAudioContext(latencyHint: AudioContextLatencyCategory): AudioContext {
  const context = createAudioContext(latencyHint, MAX_SAMPLE_RATE);
  unlockAudioContext(context);
  return context;
}

/**
 * Builds the best available engine: AudioWorklet, then ScriptProcessor, then silent stub mode.
 * Uses options.context when given; otherwise creates an AudioContext that unlocks on the first user gesture.
 */
export async function createAudioEngine(options: CreateAudioEngineOptions): Promise<AudioEngine> {
  const context = options.context ?? createUnlockedAudioContext(options.latencyHint);
  const volumeNode = context.createGain();
  volumeNode.connect(context.destination);
  const debug = !!options.debug;

  let wasm = options.forcedKind === 'stub' ? null : await compileChipCoreWasm(options.wasmUrl);
  let mainThreadCore: ChipCore | null = null;
  if (wasm) {
    try {
      mainThreadCore = await instantiateChipCore(
        ChipCoreFactoryModule as unknown as ChipCoreFactory,
        { module: wasm.module }
      );
    } catch (e) {
      console.warn('Failed to instantiate chip-core, falling back to stub mode:', e);
      wasm = null;
    }
  }
  if (!mainThreadCore) {
    try {
      mainThreadCore = (await ChipCoreStub()) as unknown as ChipCore;
    } catch (e) {
      volumeNode.disconnect();
      void context.close();
      throw e;
    }
  }

  const kind = chooseEngineKind({
    forcedKind: options.forcedKind ?? null,
    wasmAvailable: wasm !== null,
    audioWorkletAvailable: !!context.audioWorklet && typeof AudioWorkletNode !== 'undefined',
  });

  if (kind === 'worklet' && wasm) {
    const transport = chooseTapTransport({
      crossOriginIsolated: globalThis.crossOriginIsolated === true,
      forced: options.forcedTapTransport ?? null,
    });
    try {
      return await createWorkletEngine(context, volumeNode, mainThreadCore, wasm, transport, debug);
    } catch (e) {
      console.warn('AudioWorklet engine unavailable, falling back to ScriptProcessor:', e);
    }
  }
  return createScriptProcessorEngine(
    context,
    volumeNode,
    mainThreadCore,
    kind === 'stub' ? 'stub' : 'script-processor',
    debug
  );
}

/** Creates an AudioContext, halving the rate until it is at most maxSampleRate. */
export function createAudioContext(
  latencyHint: AudioContextLatencyCategory,
  maxSampleRate: number
): AudioContext {
  const Context: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  let context = new Context({ latencyHint });
  if (context.sampleRate > maxSampleRate) {
    console.warn(
      'AudioContext default sample rate was too high (%s). Limiting to %s.',
      context.sampleRate,
      maxSampleRate
    );
    let targetRate = context.sampleRate;
    while (targetRate > maxSampleRate) targetRate /= 2;
    void context.close();
    context = new Context({ latencyHint, sampleRate: targetRate });
  }
  return context;
}

async function createWorkletEngine(
  context: AudioContext,
  volumeNode: GainNode,
  mainThreadCore: ChipCore,
  wasm: CompiledWasm,
  transport: TapTransport,
  debug: boolean
): Promise<AudioEngine> {
  await context.audioWorklet.addModule(processorUrl);
  const sharedTaps = transport === 'shared' ? new SharedArrayBuffer(TAP_RING_BYTES) : null;
  const nodeOptions = (source: WasmSource): AudioWorkletNodeOptions => ({
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: { wasm: source, sharedTaps },
  });
  let node: AudioWorkletNode;
  try {
    node = new AudioWorkletNode(context, CHIP_PROCESSOR_NAME, nodeOptions({ module: wasm.module }));
  } catch (e) {
    console.warn('Could not transfer WebAssembly.Module to the worklet, sending bytes:', e);
    node = new AudioWorkletNode(context, CHIP_PROCESSOR_NAME, nodeOptions({ bytes: wasm.bytes }));
  }
  await waitForProcessorReadyOrDiscard(context, node, WORKLET_READY_TIMEOUT_MS);
  node.connect(volumeNode);
  const pooled = sharedTaps
    ? null
    : new PooledTapReader((buffer) => node.port.postMessage(buffer, [buffer]));
  const link = new WorkletLink(node.port, pooled);
  node.onprocessorerror = () => link.reportFatal('Audio processor stopped unexpectedly.');
  const taps = sharedTaps
    ? new RingTapReader(new TapRing(sharedTaps))
    : (pooled as PooledTapReader);
  console.log('Audio engine: AudioWorklet, %s taps, %d Hz.', transport, context.sampleRate);
  return new ChipEngine({
    kind: 'worklet',
    context,
    outputNode: node,
    volumeNode,
    spectrumCore: mainThreadCore,
    link,
    taps,
    debug,
  });
}

/** Silences and releases a worklet node that failed or timed out, so it cannot keep running. */
export function discardWorkletNode(node: AudioWorkletNode): void {
  node.onprocessorerror = null;
  try {
    node.port.onmessage = null;
    node.port.close();
  } catch (e) {
    console.warn('Could not close worklet port:', e);
  }
  try {
    node.disconnect();
  } catch (e) {
    console.warn('Could not disconnect worklet node:', e);
  }
}

/** Waits for the processor to report ready; on any failure the node is discarded before rethrowing. */
export async function waitForProcessorReadyOrDiscard(
  context: AudioContext,
  node: AudioWorkletNode,
  timeoutMs: number
): Promise<void> {
  try {
    await waitForProcessorReady(context, node, timeoutMs);
  } catch (e) {
    discardWorkletNode(node);
    throw e;
  }
}

// The timeout only runs while the context is running: a suspended context (no user gesture yet)
// may hold back the processor in some browsers, and that alone should not force the fallback.
function waitForProcessorReady(
  context: AudioContext,
  node: AudioWorkletNode,
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      context.removeEventListener('statechange', startTimerIfRunning);
      if (error) reject(error);
      else resolve();
    };
    function startTimerIfRunning() {
      if (context.state === 'running' && timer === undefined && !settled) {
        timer = setTimeout(
          () => settle(new Error(`chip processor not ready after ${timeoutMs} ms`)),
          timeoutMs
        );
      }
    }
    node.onprocessorerror = () => settle(new Error('chip processor failed to start'));
    node.port.onmessage = (e: MessageEvent) => {
      const event = e.data as ProcessorEvent;
      if (event.type === 'ready') settle();
      else if (event.type === 'error') settle(new Error(event.message));
    };
    context.addEventListener('statechange', startTimerIfRunning);
    startTimerIfRunning();
  });
}

function createScriptProcessorEngine(
  context: AudioContext,
  volumeNode: GainNode,
  mainThreadCore: ChipCore,
  kind: 'script-processor' | 'stub',
  debug: boolean
): AudioEngine {
  // At least baseLatency, and never below 2048 (the old App.tsx rule).
  const bufferSize = Math.max(
    Math.pow(2, Math.ceil(Math.log2((context.baseLatency || 0.001) * context.sampleRate))),
    2048
  );
  const node = context.createScriptProcessor(bufferSize, 0, 2);
  const ring = new TapRing();
  const link = new InProcessLink();
  const processor = new ProcessorCore({
    core: mainThreadCore,
    sampleRate: context.sampleRate,
    emit: link.emit,
    ring,
    sender: null,
  });
  link.attach(processor);
  node.onaudioprocess = (e: AudioProcessingEvent) =>
    processor.process(
      e.outputBuffer.getChannelData(0),
      e.outputBuffer.getChannelData(1),
      e.playbackTime
    );
  node.connect(volumeNode);
  if (kind === 'stub') volumeNode.gain.value = 0;
  console.log(
    'Audio engine: %s, buffer size %d, %d Hz.',
    kind === 'stub' ? 'STUB (silent)' : 'ScriptProcessor',
    bufferSize,
    context.sampleRate
  );
  return new ChipEngine({
    kind,
    context,
    outputNode: node,
    volumeNode,
    spectrumCore: mainThreadCore,
    link,
    taps: new RingTapReader(ring),
    debug,
    bufferDurationS: bufferSize / context.sampleRate,
  });
}
