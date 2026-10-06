// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { MAX_FRAME_DT_MS } from '../../../audio/data/constants';
import { createFrameLoop } from '../../../audio/data/FrameLoop';
import { ManualScheduler, StaticAudioDataSource } from '../../helpers/frameHarness';

const FRAME = 1000 / 60;

function setup(playing = true) {
  const scheduler = new ManualScheduler();
  const source = new StaticAudioDataSource();
  const loop = createFrameLoop({ source, scheduler });
  loop.setPlaying(playing);
  return { scheduler, source, loop };
}

/** Runs `frames` frames `interval` ms apart starting at startMs. */
function run(scheduler: ManualScheduler, frames: number, startMs = 0, interval = FRAME): void {
  for (let i = 0; i < frames; i++) scheduler.tick(startMs + i * interval);
}

describe('FrameLoop scheduling', () => {
  it('schedules frames only while a consumer is registered', () => {
    const { scheduler, loop } = setup();
    expect(scheduler.scheduled).toBe(0);
    const remove = loop.add('a', () => {});
    expect(loop.isRunning()).toBe(true);
    remove();
    expect(loop.isRunning()).toBe(false);
    expect(scheduler.scheduled).toBe(0);
  });

  it('reads the source once per frame and hands every consumer the same frame', () => {
    const { scheduler, source, loop } = setup();
    const a = vi.fn();
    const b = vi.fn();
    loop.add('a', a);
    loop.add('b', b);
    run(scheduler, 3);
    expect(source.reads).toBe(3);
    expect(a.mock.calls[2][0]).toBe(source.frame);
    expect(b.mock.calls[2][0]).toBe(source.frame);
  });

  it('draws in the order consumers were added', () => {
    const { scheduler, loop } = setup();
    const order: string[] = [];
    loop.add('first', () => order.push('first'));
    loop.add('second', () => order.push('second'));
    run(scheduler, 1);
    expect(order).toEqual(['first', 'second']);
  });

  it('stops while paused except for consumers that run while paused', () => {
    const { scheduler, loop } = setup(false);
    const normal = vi.fn();
    loop.add('normal', normal);
    expect(loop.isRunning()).toBe(false);
    const idle = vi.fn();
    loop.add('idle', idle, { runWhilePaused: true });
    run(scheduler, 2);
    expect(normal).not.toHaveBeenCalled();
    expect(idle).toHaveBeenCalledTimes(2);
  });

  it('stops while the tab is hidden and resumes at dt 0', () => {
    const { scheduler, loop } = setup();
    const draw = vi.fn();
    loop.add('a', draw);
    scheduler.tick(0);
    scheduler.setHidden(true);
    expect(loop.isRunning()).toBe(false);
    scheduler.setHidden(false);
    expect(loop.isRunning()).toBe(true);
    scheduler.tick(60000);
    expect(draw.mock.calls[1][1]).toBe(0);
  });

  it('stops for good on dispose', () => {
    const { loop } = setup();
    loop.add('a', vi.fn());
    loop.dispose();
    expect(loop.isRunning()).toBe(false);
    loop.add('b', vi.fn());
    expect(loop.isRunning()).toBe(false);
  });
});

describe('FrameLoop timing', () => {
  it('passes 0 on a consumer first draw and the elapsed time after', () => {
    const { scheduler, loop } = setup();
    const draw = vi.fn();
    loop.add('a', draw);
    run(scheduler, 3);
    expect(draw.mock.calls[0][1]).toBe(0);
    expect(draw.mock.calls[1][1]).toBeCloseTo(FRAME, 9);
    expect(draw.mock.calls[2][1]).toBeCloseTo(FRAME, 9);
  });

  it('clamps a long gap to MAX_FRAME_DT_MS', () => {
    const { scheduler, loop } = setup();
    const draw = vi.fn();
    loop.add('a', draw);
    scheduler.tick(0);
    scheduler.tick(5000);
    expect(draw.mock.calls[1][1]).toBe(MAX_FRAME_DT_MS);
  });

  it('restarts a resumed consumer at dt 0', () => {
    const { scheduler, loop } = setup();
    const draw = vi.fn();
    loop.add('a', draw);
    run(scheduler, 2);
    loop.setPlaying(false);
    expect(loop.isRunning()).toBe(false);
    loop.setPlaying(true);
    scheduler.tick(10000);
    expect(draw.mock.calls[2][1]).toBe(0);
  });

  it('limits a consumer to its maxFps and reports the real elapsed time', () => {
    const { scheduler, loop } = setup();
    const draw = vi.fn();
    loop.add('a', draw, { maxFps: 30 });
    run(scheduler, 6);
    expect(draw).toHaveBeenCalledTimes(3);
    expect(draw.mock.calls[1][1]).toBeCloseTo(2 * FRAME, 9);
  });

  it('caps a 120 Hz display at 30 fps too', () => {
    const { scheduler, loop } = setup();
    const draw = vi.fn();
    loop.add('a', draw, { maxFps: 30 });
    run(scheduler, 12, 0, 1000 / 120);
    expect(draw).toHaveBeenCalledTimes(3);
  });

  it('applies the global cap to every consumer and the lower of two caps', () => {
    const { scheduler, loop } = setup();
    loop.setMaxFps(30);
    const a = vi.fn();
    const b = vi.fn();
    loop.add('a', a);
    loop.add('b', b, { maxFps: 15 });
    run(scheduler, 12);
    expect(a).toHaveBeenCalledTimes(6);
    expect(b).toHaveBeenCalledTimes(3);
    loop.setMaxFps(null);
    a.mockClear();
    run(scheduler, 6, 12 * FRAME);
    expect(a).toHaveBeenCalledTimes(6);
  });

  it('does not read the source on a frame where every consumer is throttled', () => {
    const { scheduler, source, loop } = setup();
    loop.add('a', () => {}, { maxFps: 30 });
    run(scheduler, 2);
    expect(source.reads).toBe(1);
  });
});

describe('FrameLoop consumers', () => {
  it('replaces a consumer added again under the same id', () => {
    const { scheduler, loop } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const removeFirst = loop.add('a', first);
    loop.add('a', second);
    removeFirst();
    run(scheduler, 1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps drawing other consumers when one throws, and logs it once', () => {
    const { scheduler, loop } = setup();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    loop.add('bad', () => {
      throw new Error('boom');
    });
    const good = vi.fn();
    loop.add('good', good);
    run(scheduler, 3);
    expect(good).toHaveBeenCalledTimes(3);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('lets a consumer remove itself while drawing', () => {
    const { scheduler, loop } = setup();
    const box: { remove?: () => void } = {};
    const draw = vi.fn(() => box.remove!());
    box.remove = loop.add('a', draw);
    const other = vi.fn();
    loop.add('b', other);
    run(scheduler, 2);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(other).toHaveBeenCalledTimes(2);
  });

  it('reports timing stats every statsEvery frames', () => {
    const scheduler = new ManualScheduler();
    const onStats = vi.fn();
    let clock = 0;
    const loop = createFrameLoop({
      source: new StaticAudioDataSource(),
      scheduler,
      onStats,
      statsEvery: 4,
      now: () => (clock += 1),
    });
    loop.setPlaying(true);
    loop.add('a', () => {});
    run(scheduler, 4);
    expect(onStats).toHaveBeenCalledTimes(1);
    const stats = onStats.mock.calls[0][0];
    expect(stats.frames).toBe(4);
    expect(Object.keys(stats.consumers)).toEqual(['a']);
    expect(stats.meanMs).toBeGreaterThan(0);
    expect(stats.p75Ms).toBeGreaterThan(0);
  });
});
