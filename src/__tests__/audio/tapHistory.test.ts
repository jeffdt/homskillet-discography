// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { TAP_POST_INTERVAL_FRAMES, TAP_RING } from '../../audio/constants';
import { TapHistory } from '../../audio/taps/TapHistory';
import { TapRing } from '../../audio/taps/TapRing';
import { TapSnapshot } from '../../audio/taps/TapSnapshot';
import { PooledTapReader, PooledTapSender, RingTapReader } from '../../audio/taps/transports';
import { ramp, silence, writeTaps } from '../helpers/taps';

/** The newest `count` samples of a voice, as the int16 values that produced them. */
function newest(history: TapHistory, voice: number, count: number): number[] {
  const out = new Float32Array(count);
  history.copyRange(voice, history.writeIndex, out);
  return Array.from(out, (x) => Math.round(x * 32768));
}

describe('TapRing status', () => {
  it('records the ring write index in the status', () => {
    const ring = new TapRing();
    writeTaps(ring, [ramp(0, 10)]);
    const snapshot = new TapSnapshot();
    snapshot.fillFromRing(ring);
    expect(snapshot.tapWriteIndex).toBe(10);
  });
});

describe('TapHistory from a ring', () => {
  it('appends only the samples that are new since the last read', () => {
    const ring = new TapRing();
    const reader = new RingTapReader(ring);
    writeTaps(ring, [ramp(0, 10)]);
    reader.readHistory();
    writeTaps(ring, [ramp(10, 6)]);
    const history = reader.readHistory();
    expect(history.writeIndex).toBe(16);
    expect(newest(history, 0, 16)).toEqual(ramp(0, 16));
  });

  it('keeps more history than one ring holds', () => {
    const ring = new TapRing();
    const reader = new RingTapReader(ring);
    for (let start = 0; start < 12000; start += 1000) {
      writeTaps(ring, [ramp(start, 1000)]);
      reader.readHistory();
    }
    expect(newest(reader.readHistory(), 0, 12000)).toEqual(ramp(0, 12000));
  });

  it('reads samples it never saw as silence', () => {
    const ring = new TapRing();
    const reader = new RingTapReader(ring);
    writeTaps(ring, [ramp(1, 100)]);
    reader.readHistory();
    // 3500 new samples is more than RING_INGEST_LIMIT (3072): the oldest 428 are never read.
    writeTaps(ring, [ramp(1000, 3500)]);
    const values = newest(reader.readHistory(), 0, 3600);
    expect(values.slice(0, 100)).toEqual(ramp(1, 100));
    expect(values.slice(100, 528)).toEqual(silence(428));
    expect(values.slice(528)).toEqual(ramp(1428, 3072));
  });

  it('reads a whole ring written in one burst without a hole when in process', () => {
    const ring = new TapRing();
    const reader = new RingTapReader(ring, TAP_RING);
    writeTaps(ring, [ramp(1, 100)]);
    reader.readHistory();
    writeTaps(ring, [ramp(1000, TAP_RING)]);
    const values = newest(reader.readHistory(), 0, TAP_RING + 100);
    expect(values.slice(0, 100)).toEqual(ramp(1, 100));
    expect(values.slice(100)).toEqual(ramp(1000, TAP_RING));
  });

  it('clears when a new track loads', () => {
    const ring = new TapRing();
    const reader = new RingTapReader(ring);
    writeTaps(ring, [ramp(500, 100)], { loadId: 1 });
    reader.readHistory();
    ring.clear();
    writeTaps(ring, [ramp(7, 10)], { loadId: 2 });
    const values = newest(reader.readHistory(), 0, 200);
    expect(values.slice(0, 190)).toEqual(silence(190));
    expect(values.slice(190)).toEqual(ramp(7, 10));
  });

  it('keeps the newest sample time while no samples arrive', () => {
    const ring = new TapRing();
    const reader = new RingTapReader(ring);
    writeTaps(ring, [ramp(0, 64)], { contextTime: 1 });
    expect(reader.readHistory().newestContextTime).toBe(1);
    writeTaps(ring, [[]], { contextTime: 2 }); // a paused quantum: status only
    expect(reader.readHistory().newestContextTime).toBe(1);
  });

  it('mixes voices by gain', () => {
    const ring = new TapRing();
    const reader = new RingTapReader(ring);
    writeTaps(ring, [new Array(8).fill(1000), new Array(8).fill(3000)]);
    const history = reader.readHistory();
    const out = new Float32Array(8);
    history.mixRange(history.writeIndex, [1, 0, 1, 1, 1, 1, 1, 1], 0.5, out);
    expect(out[7]).toBeCloseTo((1000 / 32768) * 0.5, 6);
    history.mixRange(history.writeIndex, [1, 1, 1, 1, 1, 1, 1, 1], 0.5, out);
    expect(out[7]).toBeCloseTo((4000 / 32768) * 0.5, 6);
  });
});

describe('TapHistory from pooled snapshots', () => {
  /** A sender and reader wired like the worklet link; deliver(post) false drops that post. */
  function pooled(deliver: (post: number) => boolean = () => true) {
    const ring = new TapRing();
    let posts = 0;
    const box: { sender?: PooledTapSender } = {};
    const reader = new PooledTapReader((buffer) => box.sender!.recycle(buffer));
    const sender = new PooledTapSender((buffer) => {
      if (deliver(posts++)) reader.receive(buffer);
      else sender.recycle(buffer);
    });
    box.sender = sender;
    /** Renders `samples` tap samples of a ramp in 128-frame quanta, ticking the sender like ProcessorCore. */
    const play = (start: number, samples: number) => {
      for (let i = 0; i < samples; i += 64) {
        writeTaps(ring, [ramp(start + i, 64)]);
        sender.tick(128, ring);
      }
    };
    return { reader, play };
  }

  it('reassembles a continuous history from overlapping windows', () => {
    const { reader, play } = pooled();
    play(0, 4480);
    const history = reader.readHistory();
    const samplesPerPost = TAP_POST_INTERVAL_FRAMES / 2;
    const posted = Math.floor((4480 * 2) / TAP_POST_INTERVAL_FRAMES) * samplesPerPost;
    expect(history.writeIndex).toBe(posted);
    expect(newest(history, 0, posted)).toEqual(ramp(0, posted));
  });

  it('reads dropped posts as silence', () => {
    // Posts land every 384 samples; posts 1, 2 and 3 are dropped, so 1536 new samples arrive at
    // once with post 4 and only the newest TAP_WINDOW (1024) of them are in its window.
    const { reader, play } = pooled((post) => post === 0 || post >= 4);
    play(0, 1920);
    const values = newest(reader.readHistory(), 0, 1920);
    expect(values.slice(0, 384)).toEqual(ramp(0, 384));
    expect(values.slice(384, 896)).toEqual(silence(512));
    expect(values.slice(896)).toEqual(ramp(896, 1024));
  });
});
