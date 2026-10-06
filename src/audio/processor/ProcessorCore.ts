import { TAP_DECIMATION } from '../constants';
import { EngineCommand, ProcessorEvent } from '../protocol';
import { ChipRenderer, RendererEvent } from '../render/ChipRenderer';
import { FLAG_PAUSED, FLAG_SEEKING, TapRing } from '../taps/TapRing';
import { PooledTapSender } from '../taps/transports';
import { ChipCore } from '../types';

/** What a ProcessorCore needs from its host (the worklet or the ScriptProcessor fallback). */
export interface ProcessorCoreOptions {
  core: ChipCore;
  sampleRate: number;
  emit: (event: ProcessorEvent) => void;
  ring: TapRing;
  /** Posts tap snapshots (pooled transport); null for shared-memory and in-process rings. */
  sender: PooledTapSender | null;
}

/**
 * The engine's audio-thread half: applies EngineCommands to a ChipRenderer, renders, and publishes
 * taps and status. Has no Web Audio dependencies, so it runs in the AudioWorklet, on the main
 * thread, and in tests.
 */
export class ProcessorCore {
  private readonly renderer: ChipRenderer;
  private loadId = 0;
  private voiceCount = 0;

  constructor(private readonly options: ProcessorCoreOptions) {
    this.renderer = new ChipRenderer(
      options.core,
      options.sampleRate,
      this.handleRendererEvent,
      options.ring
    );
  }

  /** Applies one command from the main thread. */
  handleCommand(command: EngineCommand): void {
    const renderer = this.renderer;
    switch (command.type) {
      case 'load':
        this.load(command);
        break;
      case 'unload':
        renderer.unload();
        this.voiceCount = 0;
        break;
      case 'pause':
        renderer.setPaused(command.paused);
        break;
      case 'seek':
        renderer.seek(command.positionMs, command.seekId);
        break;
      case 'tempo':
        renderer.setTempo(command.tempo);
        break;
      case 'stereoWidth':
        renderer.setStereoWidth(command.stereoWidth);
        break;
      case 'subBass':
        renderer.setSubBass(command.subBass);
        break;
      case 'loopForever':
        renderer.setLoopForever(command.loopForever);
        break;
      case 'gains':
        renderer.setGains(command.gains);
        break;
      default:
        break;
    }
  }

  /** A pooled tap buffer came back from the main thread. */
  handleReturnedBuffer(buffer: ArrayBuffer): void {
    this.options.sender?.recycle(buffer);
  }

  /** Renders one block and publishes status (and, when due, a pooled snapshot). */
  process(left: Float32Array, right: Float32Array, currentTime: number): void {
    const { ring, sender, sampleRate } = this.options;
    const renderer = this.renderer;
    ring.beginWrite();
    renderer.render(left, right);
    const flags = (renderer.isSeeking ? FLAG_SEEKING : 0) | (renderer.isPaused ? FLAG_PAUSED : 0);
    ring.setStatus(
      renderer.positionMs,
      currentTime + left.length / sampleRate,
      flags,
      this.voiceCount,
      sampleRate / TAP_DECIMATION,
      this.loadId
    );
    ring.endWrite();
    if (sender && renderer.loaded) sender.tick(left.length, ring);
  }

  private load(command: Extract<EngineCommand, { type: 'load' }>): void {
    const { ring, emit } = this.options;
    this.loadId = command.loadId;
    ring.beginWrite();
    try {
      this.renderer.setGains(command.gains);
      const info = this.renderer.load(
        new Uint8Array(command.bytes),
        command.filepath,
        command.settings
      );
      this.voiceCount = info.voices.length;
      emit({ type: 'loaded', loadId: command.loadId, info });
    } catch (e) {
      this.renderer.unload();
      this.voiceCount = 0;
      const message = e instanceof Error ? e.message : String(e);
      emit({ type: 'loadFailed', loadId: command.loadId, message });
    } finally {
      ring.endWrite();
    }
  }

  private handleRendererEvent = (event: RendererEvent): void => {
    if (event.type === 'ended') {
      this.options.emit({ type: 'ended', loadId: this.loadId });
    } else {
      this.options.emit({ type: 'seeked', seekId: event.seekId, positionMs: event.positionMs });
    }
  };
}
