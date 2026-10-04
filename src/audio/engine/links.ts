import { EngineCommand, ProcessorEvent } from '../protocol';
import { ProcessorCore } from '../processor/ProcessorCore';
import { PooledTapReader } from '../taps/transports';

/** How ChipEngine reaches its ProcessorCore. */
export interface ProcessorLink {
  send(command: EngineCommand, transfer?: Transferable[]): void;
  setListener(listener: (event: ProcessorEvent) => void): void;
  dispose(): void;
}

/**
 * Talks to the chip processor in the AudioWorklet over its MessagePort. ArrayBuffer messages are
 * pooled tap snapshots; everything else is a ProcessorEvent.
 */
export class WorkletLink implements ProcessorLink {
  private listener: (event: ProcessorEvent) => void = () => {};

  constructor(
    private readonly port: MessagePort,
    private readonly pooledTaps: PooledTapReader | null
  ) {
    port.onmessage = (e: MessageEvent) => {
      if (e.data instanceof ArrayBuffer) this.pooledTaps?.receive(e.data);
      else this.listener(e.data as ProcessorEvent);
    };
  }

  send(command: EngineCommand, transfer: Transferable[] = []): void {
    this.port.postMessage(command, transfer);
  }

  setListener(listener: (event: ProcessorEvent) => void): void {
    this.listener = listener;
  }

  dispose(): void {
    this.port.onmessage = null;
    this.port.close();
  }
}

/**
 * Runs a ProcessorCore on the main thread (ScriptProcessor fallback and stub). Commands apply
 * synchronously; events arrive on a microtask, like port messages would.
 */
export class InProcessLink implements ProcessorLink {
  private listener: (event: ProcessorEvent) => void = () => {};
  private processor: ProcessorCore | null = null;

  /** Pass as ProcessorCoreOptions.emit. */
  readonly emit = (event: ProcessorEvent): void => {
    queueMicrotask(() => this.listener(event));
  };

  attach(processor: ProcessorCore): void {
    this.processor = processor;
  }

  send(command: EngineCommand): void {
    this.processor?.handleCommand(command);
  }

  setListener(listener: (event: ProcessorEvent) => void): void {
    this.listener = listener;
  }

  dispose(): void {
    this.processor = null;
  }
}
