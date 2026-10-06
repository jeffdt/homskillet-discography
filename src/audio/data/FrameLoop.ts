import {
  AudioDataSource,
  FrameDraw,
  FrameLoopController,
  FrameLoopOptions,
  FrameLoopStats,
  VoiceFrame,
} from './contract';
import { FPS_TOLERANCE_MS, MAX_FRAME_DT_MS, STATS_EVERY_FRAMES } from './constants';

/** Where frames come from: requestAnimationFrame and page visibility in the browser, by hand in tests. */
export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
  isHidden(): boolean;
  /** Calls listener whenever visibility changes; returns the unsubscribe function. */
  onVisibilityChange(listener: () => void): () => void;
}

/** requestAnimationFrame plus document visibility; a 16 ms timer where rAF is missing. */
export function browserScheduler(): FrameScheduler {
  const hasRaf = typeof requestAnimationFrame === 'function';
  return {
    request: (callback) =>
      hasRaf
        ? requestAnimationFrame(callback)
        : (setTimeout(() => callback(performance.now()), 16) as unknown as number),
    cancel: (handle) => (hasRaf ? cancelAnimationFrame(handle) : clearTimeout(handle)),
    isHidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
    onVisibilityChange: (listener) => {
      if (typeof document === 'undefined') return () => {};
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener);
    },
  };
}

/** What createFrameLoop needs. */
export interface FrameLoopDeps {
  source: AudioDataSource;
  scheduler?: FrameScheduler;
  /** Clock for stats timing (performance.now by default). */
  now?: () => number;
  /** Receives timing stats every statsEvery frames; timing is skipped entirely without it. */
  onStats?: (stats: FrameLoopStats) => void;
  statsEvery?: number;
}

interface Consumer {
  readonly id: string;
  readonly draw: FrameDraw;
  readonly maxFps: number | null;
  readonly runWhilePaused: boolean;
  lastDrawMs: number | null;
  failed: boolean;
}

function lowerCap(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile75(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))];
}

/** Creates the app's one FrameLoop (spec 5.4). */
export function createFrameLoop(deps: FrameLoopDeps): FrameLoopController {
  return new SharedFrameLoop(deps);
}

class SharedFrameLoop implements FrameLoopController {
  private readonly consumers: Consumer[] = [];
  private readonly scheduler: FrameScheduler;
  private readonly now: () => number;
  private playing = false;
  private maxFps: number | null = null;
  private handle: number | null = null;
  private stopWatchingVisibility: (() => void) | null = null;
  private disposed = false;
  private statFrames: number[] = [];
  private readonly statConsumers = new Map<string, number[]>();

  constructor(private readonly deps: FrameLoopDeps) {
    this.scheduler = deps.scheduler ?? browserScheduler();
    this.now = deps.now ?? (() => performance.now());
  }

  add(id: string, draw: FrameDraw, opts: FrameLoopOptions = {}): () => void {
    if (this.disposed) return () => {};
    this.remove(this.consumers.find((consumer) => consumer.id === id));
    const consumer: Consumer = {
      id,
      draw,
      maxFps: opts.maxFps && opts.maxFps > 0 ? opts.maxFps : null,
      runWhilePaused: !!opts.runWhilePaused,
      lastDrawMs: null,
      failed: false,
    };
    this.consumers.push(consumer);
    this.update();
    return () => this.remove(consumer);
  }

  setPlaying(playing: boolean): void {
    if (this.playing === playing) return;
    this.playing = playing;
    this.update();
  }

  setMaxFps(maxFps: number | null): void {
    this.maxFps = maxFps && maxFps > 0 ? maxFps : null;
  }

  isRunning(): boolean {
    return this.handle !== null;
  }

  dispose(): void {
    this.disposed = true;
    this.consumers.length = 0;
    this.update();
  }

  private remove(consumer: Consumer | undefined): void {
    if (!consumer) return;
    const index = this.consumers.indexOf(consumer);
    if (index < 0) return;
    this.consumers.splice(index, 1);
    this.update();
  }

  private eligible(consumer: Consumer): boolean {
    return this.playing || consumer.runWhilePaused;
  }

  /** Starts or stops frames and the visibility watch to match the consumers and state. */
  private update(): void {
    for (const consumer of this.consumers) {
      if (!this.eligible(consumer)) consumer.lastDrawMs = null;
    }
    if (this.consumers.length > 0 && !this.stopWatchingVisibility) {
      this.stopWatchingVisibility = this.scheduler.onVisibilityChange(() => this.update());
    } else if (this.consumers.length === 0 && this.stopWatchingVisibility) {
      this.stopWatchingVisibility();
      this.stopWatchingVisibility = null;
    }
    const shouldRun =
      !this.disposed &&
      !this.scheduler.isHidden() &&
      this.consumers.some((consumer) => this.eligible(consumer));
    if (shouldRun && this.handle === null) {
      this.handle = this.scheduler.request(this.tick);
    } else if (!shouldRun && this.handle !== null) {
      this.scheduler.cancel(this.handle);
      this.handle = null;
      for (const consumer of this.consumers) consumer.lastDrawMs = null;
    }
  }

  private tick = (timeMs: number): void => {
    this.handle = null;
    const timing = !!this.deps.onStats;
    const started = timing ? this.now() : 0;
    let frame: VoiceFrame | null = null;
    for (const consumer of this.consumers.slice()) {
      if (!this.eligible(consumer) || this.consumers.indexOf(consumer) < 0) continue;
      const cap = lowerCap(consumer.maxFps, this.maxFps);
      const last = consumer.lastDrawMs;
      if (last !== null && cap !== null && timeMs - last < 1000 / cap - FPS_TOLERANCE_MS) continue;
      const dtMs = last === null ? 0 : Math.min(Math.max(timeMs - last, 0), MAX_FRAME_DT_MS);
      consumer.lastDrawMs = timeMs;
      if (!frame) frame = this.deps.source.readFrame();
      const drawStarted = timing ? this.now() : 0;
      try {
        consumer.draw(frame, dtMs);
      } catch (e) {
        if (!consumer.failed) {
          consumer.failed = true;
          console.error(`FrameLoop consumer "${consumer.id}" threw:`, e);
        }
      }
      if (timing) this.recordConsumer(consumer.id, this.now() - drawStarted);
    }
    if (timing && frame) this.recordFrame(this.now() - started);
    this.update();
  };

  private recordConsumer(id: string, ms: number): void {
    let list = this.statConsumers.get(id);
    if (!list) {
      list = [];
      this.statConsumers.set(id, list);
    }
    list.push(ms);
  }

  private recordFrame(ms: number): void {
    this.statFrames.push(ms);
    if (this.statFrames.length < (this.deps.statsEvery ?? STATS_EVERY_FRAMES)) return;
    const consumers: FrameLoopStats['consumers'] = {};
    this.statConsumers.forEach((list, id) => {
      consumers[id] = { meanMs: mean(list), p75Ms: percentile75(list) };
    });
    this.deps.onStats!({
      frames: this.statFrames.length,
      meanMs: mean(this.statFrames),
      p75Ms: percentile75(this.statFrames),
      maxMs: Math.max(...this.statFrames),
      consumers,
    });
    this.statFrames = [];
    this.statConsumers.clear();
  }
}
