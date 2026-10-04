import { MAX_POSITION_EXTRAPOLATION_S, VOICE_PAIRS } from '../constants';
import { LoadSupersededError } from '../errors';
import { ProcessorEvent } from '../protocol';
import { computeVoiceGains } from '../render/voiceGains';
import { TapSnapshot } from '../taps/TapSnapshot';
import { TapReader } from '../taps/transports';
import { ChipCore, EngineKind, RendererSettings, TrackInfo, VoiceMix } from '../types';
import { AudioEngine, AudioEngineEvents } from './AudioEngine';
import { ProcessorLink } from './links';

/** Everything a ChipEngine is assembled from (see createAudioEngine). */
export interface ChipEngineParts {
  kind: EngineKind;
  context: AudioContext;
  outputNode: AudioNode;
  volumeNode: GainNode;
  mainThreadCore: ChipCore;
  link: ProcessorLink;
  taps: TapReader;
  debug?: boolean;
}

type PendingLoad = {
  loadId: number;
  resolve: (info: TrackInfo) => void;
  reject: (error: Error) => void;
};

type Listener = (...args: any[]) => void;

const padTo = (values: readonly boolean[]) =>
  Array.from({ length: VOICE_PAIRS }, (_, i) => !!values[i]);

/** Main-thread AudioEngine over a ProcessorLink and a TapReader, for every engine kind. */
export class ChipEngine implements AudioEngine {
  readonly kind: EngineKind;
  readonly context: AudioContext;
  readonly outputNode: AudioNode;
  readonly mainThreadCore: ChipCore;
  private readonly volumeNode: GainNode;
  private readonly link: ProcessorLink;
  private readonly taps: TapReader;
  private readonly debug: boolean;
  private readonly listeners = new Map<keyof AudioEngineEvents, Set<Listener>>();
  private loadId = 0;
  private pendingLoad: PendingLoad | null = null;
  private loaded = false;
  private paused = false;
  private tempo = 1;
  private seekId = 0;
  private pendingSeek: { seekId: number; positionMs: number; startedAt: number } | null = null;
  private mix: VoiceMix = { muted: padTo([]), soloed: padTo([]) };

  constructor(parts: ChipEngineParts) {
    this.kind = parts.kind;
    this.context = parts.context;
    this.outputNode = parts.outputNode;
    this.mainThreadCore = parts.mainThreadCore;
    this.volumeNode = parts.volumeNode;
    this.link = parts.link;
    this.taps = parts.taps;
    this.debug = !!parts.debug;
    this.link.setListener(this.handleEvent);
  }

  load(data: Uint8Array, filepath: string, settings: RendererSettings): Promise<TrackInfo> {
    this.supersedePendingLoad();
    const loadId = ++this.loadId;
    this.loaded = false;
    this.paused = false;
    this.pendingSeek = null;
    this.tempo = settings.tempo;
    const bytes = data.slice().buffer;
    return new Promise((resolve, reject) => {
      this.pendingLoad = { loadId, resolve, reject };
      this.link.send(
        { type: 'load', loadId, bytes, filepath, settings: { ...settings }, gains: this.gains() },
        [bytes]
      );
    });
  }

  stop(): void {
    this.supersedePendingLoad();
    this.loadId++;
    this.loaded = false;
    this.pendingSeek = null;
    this.link.send({ type: 'unload' });
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.link.send({ type: 'pause', paused });
  }

  seek(positionMs: number): void {
    if (!this.loaded) return;
    const seekId = ++this.seekId;
    const target = Math.max(0, positionMs);
    this.pendingSeek = { seekId, positionMs: target, startedAt: performance.now() };
    this.link.send({ type: 'seek', seekId, positionMs: target });
  }

  isSeeking(): boolean {
    return this.pendingSeek !== null;
  }

  getPositionMs(): number {
    if (!this.loaded) return 0;
    if (this.pendingSeek) return this.pendingSeek.positionMs;
    const snapshot = this.taps.read();
    if (snapshot.loadId !== this.loadId) return 0;
    let position = snapshot.positionMs;
    if (!this.paused && !snapshot.paused && !snapshot.seeking) {
      const elapsed = Math.min(
        Math.max(this.context.currentTime - snapshot.contextTime, 0),
        MAX_POSITION_EXTRAPOLATION_S
      );
      position += elapsed * 1000 * this.tempo;
    }
    return position;
  }

  setTempo(tempo: number): void {
    this.tempo = tempo;
    this.link.send({ type: 'tempo', tempo });
  }

  setStereoWidth(stereoWidth: number): void {
    this.link.send({ type: 'stereoWidth', stereoWidth });
  }

  setSubBass(amount: number): void {
    this.link.send({ type: 'subBass', subBass: amount });
  }

  setLoopForever(loopForever: boolean): void {
    this.link.send({ type: 'loopForever', loopForever });
  }

  getVoiceMix(): VoiceMix {
    return { muted: [...this.mix.muted], soloed: [...this.mix.soloed] };
  }

  setVoiceMix(mix: VoiceMix): void {
    this.mix = { muted: padTo(mix.muted), soloed: padTo(mix.soloed) };
    this.link.send({ type: 'gains', gains: this.gains() });
  }

  setVolume(volume: number): void {
    this.volumeNode.gain.value = this.kind === 'stub' ? 0 : volume;
  }

  readTaps(): TapSnapshot {
    return this.taps.read();
  }

  on<K extends keyof AudioEngineEvents>(event: K, callback: AudioEngineEvents[K]): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback as Listener);
    return () => set!.delete(callback as Listener);
  }

  dispose(): void {
    this.supersedePendingLoad();
    this.link.dispose();
    this.taps.dispose();
    this.outputNode.disconnect();
    this.volumeNode.disconnect();
    void this.context.close();
  }

  private gains(): number[] {
    return Array.from(computeVoiceGains(this.mix.muted, this.mix.soloed));
  }

  private emit(event: keyof AudioEngineEvents, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }

  private supersedePendingLoad(): void {
    if (!this.pendingLoad) return;
    this.pendingLoad.reject(new LoadSupersededError());
    this.pendingLoad = null;
  }

  private handleEvent = (event: ProcessorEvent): void => {
    switch (event.type) {
      case 'loaded':
        if (this.pendingLoad?.loadId === event.loadId) {
          const pending = this.pendingLoad;
          this.pendingLoad = null;
          this.loaded = true;
          pending.resolve(event.info);
        }
        break;
      case 'loadFailed':
        if (this.pendingLoad?.loadId === event.loadId) {
          const pending = this.pendingLoad;
          this.pendingLoad = null;
          pending.reject(new Error(event.message));
        }
        break;
      case 'ended':
        if (event.loadId === this.loadId && this.loaded) {
          this.loaded = false;
          this.emit('ended');
        }
        break;
      case 'seeked':
        if (this.pendingSeek && event.seekId === this.pendingSeek.seekId) {
          if (this.debug) {
            console.log(
              '[engine] seek to %d ms took %d ms',
              this.pendingSeek.positionMs,
              Math.round(performance.now() - this.pendingSeek.startedAt)
            );
          }
          this.pendingSeek = null;
          this.emit('seeked', event.positionMs);
        }
        break;
      case 'error':
        console.error('[engine] processor error:', event.message);
        this.emit('error', event.message);
        break;
      default:
        break;
    }
  };
}
