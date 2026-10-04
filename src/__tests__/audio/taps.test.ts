// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  INTERLEAVED_CHANNELS,
  TAP_POOL_SIZE,
  TAP_POST_INTERVAL_FRAMES,
  TAP_RING,
  TAP_WINDOW,
} from '../../audio/constants';
import { FLAG_PAUSED, FLAG_SEEKING, TAP_RING_BYTES, TapRing } from '../../audio/taps/TapRing';
import { TAP_SNAPSHOT_BYTES, TapSnapshot } from '../../audio/taps/TapSnapshot';
import { PooledTapReader, PooledTapSender, RingTapReader } from '../../audio/taps/transports';

function framesOfVoice0(values: number[]): Int16Array {
  const heap = new Int16Array(values.length * INTERLEAVED_CHANNELS);
  values.forEach((value, f) => {
    heap[f * INTERLEAVED_CHANNELS] = value;
    heap[f * INTERLEAVED_CHANNELS + 1] = value;
  });
  return heap;
}

describe('TapRing', () => {
  it('averages pairs of frames into mono samples scaled to -1..1', () => {
    const ring = new TapRing();
    ring.write(framesOfVoice0([100, 300, -200, -200]), 0, 4);
    const window = new Float32Array(8 * TAP_WINDOW);
    ring.copyWindowInto(window);
    expect(window[TAP_WINDOW - 2]).toBeCloseTo(800 / 131072, 9);
    expect(window[TAP_WINDOW - 1]).toBeCloseTo(-800 / 131072, 9);
  });

  it('keeps decimation state across writes of odd lengths', () => {
    const ring = new TapRing();
    const heap = framesOfVoice0([100, 300, 500]);
    ring.write(heap, 0, 1);
    ring.write(heap, INTERLEAVED_CHANNELS, 2);
    const window = new Float32Array(8 * TAP_WINDOW);
    ring.copyWindowInto(window);
    expect(window[TAP_WINDOW - 1]).toBeCloseTo(800 / 131072, 9);
  });

  it('returns the newest window in order after wrapping', () => {
    const ring = new TapRing();
    const total = TAP_RING + 100;
    const values = Array.from({ length: total * 2 }, (_, f) => Math.floor(f / 2) % 30000);
    ring.write(framesOfVoice0(values), 0, values.length);
    const window = new Float32Array(8 * TAP_WINDOW);
    ring.copyWindowInto(window);
    for (let i = 0; i < TAP_WINDOW; i++) {
      const expected = ((total - TAP_WINDOW + i) % 30000) * (4 / 131072);
      expect(window[i]).toBeCloseTo(expected, 6);
    }
  });

  it('bumps the sequence twice per write bracket', () => {
    const ring = new TapRing();
    const before = ring.sequence;
    ring.beginWrite();
    expect(ring.sequence % 2).toBe(1);
    ring.endWrite();
    expect(ring.sequence).toBe(before + 2);
  });
});

describe('TapSnapshot', () => {
  it('exposes status fields and per-voice views', () => {
    const ring = new TapRing();
    ring.setStatus(1234, 5.5, FLAG_SEEKING | FLAG_PAUSED, 5, 24000, 3);
    const snapshot = new TapSnapshot();
    snapshot.fillFromRing(ring);
    expect(snapshot.positionMs).toBe(1234);
    expect(snapshot.contextTime).toBe(5.5);
    expect(snapshot.seeking).toBe(true);
    expect(snapshot.paused).toBe(true);
    expect(snapshot.voiceCount).toBe(5);
    expect(snapshot.sampleRate).toBe(24000);
    expect(snapshot.loadId).toBe(3);
    expect(snapshot.voices).toHaveLength(8);
    expect(snapshot.voices[7]).toHaveLength(TAP_WINDOW);
  });
});

describe('PooledTapSender', () => {
  it('posts once per interval and drops posts when the pool is empty', () => {
    const posted: ArrayBuffer[] = [];
    const sender = new PooledTapSender((buffer) => posted.push(buffer));
    const ring = new TapRing();
    for (let i = 0; i < TAP_POOL_SIZE + 2; i++) sender.tick(TAP_POST_INTERVAL_FRAMES, ring);
    expect(posted).toHaveLength(TAP_POOL_SIZE);
    expect(sender.droppedPosts).toBe(2);
    expect(sender.availableBuffers).toBe(0);
    sender.recycle(posted[0]);
    sender.tick(0, ring);
    expect(posted).toHaveLength(TAP_POOL_SIZE + 1);
  });

  it('does not post before the interval and ignores foreign buffers', () => {
    const post = vi.fn();
    const sender = new PooledTapSender(post);
    sender.tick(TAP_POST_INTERVAL_FRAMES - 1, new TapRing());
    expect(post).not.toHaveBeenCalled();
    sender.recycle(new ArrayBuffer(16));
    expect(sender.availableBuffers).toBe(TAP_POOL_SIZE);
  });
});

describe('PooledTapReader', () => {
  it('copies each received snapshot and returns the buffer', () => {
    const returned: ArrayBuffer[] = [];
    const reader = new PooledTapReader((buffer) => returned.push(buffer));
    const ring = new TapRing();
    ring.setStatus(42, 1, 0, 8, 24000, 9);
    const buffer = new ArrayBuffer(TAP_SNAPSHOT_BYTES);
    new Float64Array(buffer, 0, 8).set(ring.status);
    reader.receive(buffer);
    expect(reader.read().positionMs).toBe(42);
    expect(reader.read().loadId).toBe(9);
    expect(returned).toEqual([buffer]);
  });
});

describe('RingTapReader', () => {
  it('reads a ring shared through a SharedArrayBuffer', () => {
    const shared = new SharedArrayBuffer(TAP_RING_BYTES);
    const writer = new TapRing(shared);
    const reader = new RingTapReader(new TapRing(shared));
    writer.beginWrite();
    writer.write(framesOfVoice0([1000, 1000]), 0, 2);
    writer.setStatus(77, 2, 0, 8, 24000, 1);
    writer.endWrite();
    const snapshot = reader.read();
    expect(snapshot.positionMs).toBe(77);
    expect(snapshot.voices[0][TAP_WINDOW - 1]).toBeCloseTo(4000 / 131072, 9);
  });
});
