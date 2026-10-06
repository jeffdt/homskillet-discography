import { TAP_POOL_SIZE, TAP_POST_INTERVAL_FRAMES } from '../constants';
import { RING_INGEST_LIMIT, TapHistory } from './TapHistory';
import { TapRing } from './TapRing';
import { TAP_SNAPSHOT_BYTES, TapSnapshot, writeSnapshotBuffer } from './TapSnapshot';

/** Main-thread access to the newest tap snapshot and the continuous history, whatever the transport. */
export interface TapReader {
  read(): TapSnapshot;
  /** The continuous history, brought up to date with everything the transport has delivered. */
  readHistory(): TapHistory;
  dispose(): void;
}

/**
 * Processor side of the pooled transport. Posts snapshots in a fixed pool of transferable buffers
 * that the main thread sends back, so the audio thread never allocates sample buffers. When no
 * buffer has come back yet, it skips the post and tries again on the next tick.
 */
export class PooledTapSender {
  private readonly free: ArrayBuffer[] = [];
  private framesSincePost = 0;
  droppedPosts = 0;

  constructor(
    private readonly post: (buffer: ArrayBuffer) => void,
    private readonly poolSize = TAP_POOL_SIZE
  ) {
    for (let i = 0; i < poolSize; i++) this.free.push(new ArrayBuffer(TAP_SNAPSHOT_BYTES));
  }

  get availableBuffers(): number {
    return this.free.length;
  }

  /** Takes back a buffer the main thread returned. */
  recycle(buffer: ArrayBuffer): void {
    if (buffer.byteLength === TAP_SNAPSHOT_BYTES && this.free.length < this.poolSize) {
      this.free.push(buffer);
    }
  }

  /** Called once per render call; posts a snapshot when the interval has elapsed. */
  tick(frames: number, ring: TapRing): void {
    this.framesSincePost += frames;
    if (this.framesSincePost < TAP_POST_INTERVAL_FRAMES) return;
    const buffer = this.free.pop();
    if (!buffer) {
      this.droppedPosts++;
      return;
    }
    this.framesSincePost = 0;
    writeSnapshotBuffer(buffer, ring);
    this.post(buffer);
  }
}

/** Main-thread side of the pooled transport: keeps the newest snapshot, feeds the history, returns each buffer. */
export class PooledTapReader implements TapReader {
  private readonly snapshot = new TapSnapshot();
  private readonly history = new TapHistory();

  constructor(private readonly returnBuffer: (buffer: ArrayBuffer) => void) {}

  /** Handles one snapshot message from the processor. */
  receive(buffer: ArrayBuffer): void {
    this.snapshot.copyFrom(buffer);
    this.history.ingestSnapshot(this.snapshot);
    this.returnBuffer(buffer);
  }

  read(): TapSnapshot {
    return this.snapshot;
  }

  readHistory(): TapHistory {
    return this.history;
  }

  dispose(): void {}
}

/**
 * Reads straight from a TapRing: the SharedArrayBuffer ring (crossOriginIsolated worklet) or the
 * in-process ring (ScriptProcessor and stub). Retries a few times if a write was in progress, and
 * feeds the history only from a consistent read.
 */
export class RingTapReader implements TapReader {
  private readonly snapshot = new TapSnapshot();
  private readonly history = new TapHistory();

  /**
   * ingestLimit is how many new samples one read may take: the default keeps a SharedArrayBuffer
   * ring's concurrent writer out of the read; an in-process ring has no concurrent writer and can
   * pass TAP_RING.
   */
  constructor(
    private readonly ring: TapRing,
    private readonly ingestLimit = RING_INGEST_LIMIT
  ) {}

  read(): TapSnapshot {
    for (let attempt = 0; attempt < 4; attempt++) {
      const before = this.ring.sequence;
      if (before % 2 !== 0) continue;
      this.snapshot.fillFromRing(this.ring);
      if (this.ring.sequence === before) {
        this.history.ingestRing(this.snapshot, this.ring, this.ingestLimit);
        break;
      }
    }
    return this.snapshot;
  }

  readHistory(): TapHistory {
    this.read();
    return this.history;
  }

  dispose(): void {}
}
