import CHIP_CORE from '../../chip-core';
import { CHIP_PROCESSOR_NAME } from '../constants';
import { instantiateChipCore } from '../loadChipCore';
import { ProcessorCore } from '../processor/ProcessorCore';
import { EngineCommand, ProcessorEvent } from '../protocol';
import { TapRing } from '../taps/TapRing';
import { PooledTapSender } from '../taps/transports';
import { ChipCoreFactory, WasmSource } from '../types';

// AudioWorkletGlobalScope globals (not in the DOM lib).
declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
}
declare function registerProcessor(name: string, processorCtor: unknown): void;

interface ChipProcessorOptions {
  processorOptions: { wasm: WasmSource; sharedTaps: SharedArrayBuffer | null };
}

/**
 * AudioWorklet entry point: instantiates chip-core on the audio thread, then hands every render
 * quantum and port message to a ProcessorCore. Messages that arrive before chip-core is ready are
 * queued.
 */
class ChipProcessor extends AudioWorkletProcessor {
  private processorCore: ProcessorCore | null = null;
  private readonly queued: (EngineCommand | ArrayBuffer)[] = [];

  constructor(options: ChipProcessorOptions) {
    super();
    this.port.onmessage = (e: MessageEvent) => this.handleMessage(e.data);
    const { wasm, sharedTaps } = options.processorOptions;
    instantiateChipCore(CHIP_CORE as unknown as ChipCoreFactory, wasm)
      .then((core) => {
        const emit = (event: ProcessorEvent) => this.port.postMessage(event);
        const ring = new TapRing(sharedTaps ?? undefined);
        const sender = sharedTaps
          ? null
          : new PooledTapSender((buffer) => this.port.postMessage(buffer, [buffer]));
        this.processorCore = new ProcessorCore({ core, sampleRate, emit, ring, sender });
        this.queued.splice(0).forEach((message) => this.handleMessage(message));
        emit({ type: 'ready' });
      })
      .catch((e) => {
        this.port.postMessage({ type: 'error', message: String((e && e.stack) || e) });
      });
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const left = output[0];
    const right = output[1];
    if (this.processorCore) this.processorCore.process(left, right ?? left, currentTime);
    return true;
  }

  private handleMessage(message: EngineCommand | ArrayBuffer): void {
    const core = this.processorCore;
    if (!core) {
      this.queued.push(message);
      return;
    }
    if (message instanceof ArrayBuffer) core.handleReturnedBuffer(message);
    else core.handleCommand(message);
  }
}

registerProcessor(CHIP_PROCESSOR_NAME, ChipProcessor);
