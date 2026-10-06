// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import ChipCoreStub from '../../chip-core-stub';
import {
  END_FADE_MS,
  INTERLEAVED_CHANNELS,
  RENDER_CHUNK_FRAMES,
  SEEK_SPEED,
} from '../../audio/constants';
import { ChipRenderer, RendererEvent } from '../../audio/render/ChipRenderer';
import { TapRing } from '../../audio/taps/TapRing';
import { ChipCore, RendererSettings } from '../../audio/types';

const RATE = 48000;
const SETTINGS: RendererSettings = { tempo: 1, stereoWidth: 1, subBass: 0, loopForever: false };

async function setup(settings: Partial<RendererSettings> = {}) {
  const core = (await ChipCoreStub()) as ChipCore;
  const events: RendererEvent[] = [];
  const taps = new TapRing();
  const renderer = new ChipRenderer(core, RATE, (event) => events.push(event), taps);
  const info = renderer.load(new Uint8Array(16), '/Album/track.nsf', { ...SETTINGS, ...settings });
  return { core, events, renderer, taps, info };
}

const left = new Float32Array(RENDER_CHUNK_FRAMES);
const right = new Float32Array(RENDER_CHUNK_FRAMES);

function renderQuanta(renderer: ChipRenderer, count: number): number {
  let peak = 0;
  for (let q = 0; q < count; q++) {
    renderer.render(left, right);
    for (let i = 0; i < left.length; i++)
      peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  return peak;
}

function renderUntil(renderer: ChipRenderer, done: () => boolean, maxQuanta = 200000): number {
  let quanta = 0;
  while (!done()) {
    renderer.render(left, right);
    if (++quanta > maxQuanta) throw new Error('condition never met');
  }
  return quanta;
}

const seeked = (events: RendererEvent[]) => events.filter((e) => e.type === 'seeked');
const ended = (events: RendererEvent[]) => events.filter((e) => e.type === 'ended');
const quantaFor = (ms: number) => Math.ceil(((ms / 1000) * RATE) / RENDER_CHUNK_FRAMES);

describe('ChipRenderer (stub core)', () => {
  it('loads a track and reports its info', async () => {
    const { info, renderer } = await setup();
    expect(info.voices).toHaveLength(5);
    expect(info.durationMs).toBe(180000);
    expect(renderer.loaded).toBe(true);
    expect(renderer.positionMs).toBe(0);
  });

  it('renders audio and advances the position', async () => {
    const { renderer } = await setup();
    expect(renderQuanta(renderer, quantaFor(1000))).toBeGreaterThan(0);
    expect(renderer.positionMs).toBeGreaterThanOrEqual(999);
  });

  it('renders buffers longer than one chunk (ScriptProcessor sizes)', async () => {
    const { renderer } = await setup();
    const big = new Float32Array(2048);
    renderer.render(big, new Float32Array(2048));
    expect(big.some((x) => x !== 0)).toBe(true);
    expect(renderer.positionMs).toBe(42);
  });

  it('silences all voices with gains but keeps writing taps', async () => {
    const { renderer, taps } = await setup();
    renderer.setGains(new Float32Array(8));
    renderQuanta(renderer, 1);
    expect(renderQuanta(renderer, 20)).toBe(0);
    expect(taps.samples.some((x) => x !== 0)).toBe(true);
  });

  it('fades out on pause, then stops emulating', async () => {
    const { core, renderer } = await setup();
    renderQuanta(renderer, 4);
    renderer.setPaused(true);
    renderQuanta(renderer, 2);
    expect(left[RENDER_CHUNK_FRAMES - 1]).toBe(0);
    const play = vi.spyOn(core, '_gme_play');
    const position = renderer.positionMs;
    expect(renderQuanta(renderer, 10)).toBe(0);
    expect(play).not.toHaveBeenCalled();
    expect(renderer.positionMs).toBe(position);
    renderer.setPaused(false);
    expect(renderQuanta(renderer, 4)).toBeGreaterThan(0);
  });

  it('seeks forward across many quanta within the per-quantum budget, never via gme_seek_scaled', async () => {
    const { core, events, renderer } = await setup();
    const play = vi.spyOn(core, '_gme_play');
    const seekScaled = vi.spyOn(core, '_gme_seek_scaled');
    renderer.seek(60000, 7);
    expect(renderer.isSeeking).toBe(true);
    expect(renderer.positionMs).toBe(60000);
    let quanta = 0;
    while (seeked(events).length === 0) {
      play.mockClear();
      renderer.render(left, right);
      quanta++;
      const emulated = play.mock.calls.reduce(
        (sum, call) => sum + call[1] / INTERLEAVED_CHANNELS,
        0
      );
      expect(emulated).toBeLessThanOrEqual(RENDER_CHUNK_FRAMES * SEEK_SPEED);
    }
    expect(quanta).toBeGreaterThan(100);
    expect(seekScaled).not.toHaveBeenCalled();
    expect(seeked(events)).toEqual([{ type: 'seeked', seekId: 7, positionMs: 60000 }]);
    expect(renderer.isSeeking).toBe(false);
    expect(renderQuanta(renderer, 4)).toBeGreaterThan(0);
  });

  it('seeks backward by restarting the track once', async () => {
    const { core, events, renderer } = await setup();
    renderQuanta(renderer, quantaFor(1000));
    const restart = vi.spyOn(core, '_gme_start_track');
    renderer.seek(200, 3);
    renderUntil(renderer, () => seeked(events).length > 0);
    expect(restart).toHaveBeenCalledTimes(1);
    expect(seeked(events)).toEqual([{ type: 'seeked', seekId: 3, positionMs: 200 }]);
  });

  it('retargets a seek that is still running and reports only the newest one', async () => {
    const { events, renderer } = await setup();
    renderer.seek(60000, 1);
    renderQuanta(renderer, 3);
    renderer.seek(30000, 2);
    renderUntil(renderer, () => seeked(events).length > 0);
    expect(seeked(events)).toEqual([{ type: 'seeked', seekId: 2, positionMs: 30000 }]);
  });

  it('seeks while paused without making sound and stays paused', async () => {
    const { events, renderer } = await setup();
    renderer.setPaused(true);
    renderQuanta(renderer, 2);
    renderer.seek(5000, 4);
    let peak = 0;
    while (seeked(events).length === 0) peak = Math.max(peak, renderQuanta(renderer, 1));
    expect(peak).toBe(0);
    expect(renderQuanta(renderer, 4)).toBe(0);
    renderer.setPaused(false);
    expect(renderQuanta(renderer, 4)).toBeGreaterThan(0);
  });

  it('fades out over END_FADE_MS at the duration, then ends once', async () => {
    const { events, renderer } = await setup();
    renderer.seek(178000, 1);
    renderUntil(renderer, () => seeked(events).length > 0);
    renderUntil(renderer, () => ended(events).length > 0, quantaFor(10000));
    expect(ended(events)).toHaveLength(1);
    expect(renderer.positionMs).toBeGreaterThan(180000 + END_FADE_MS - 100);
    expect(renderer.positionMs).toBeLessThan(180000 + END_FADE_MS + 100);
    expect(renderQuanta(renderer, 10)).toBe(0);
    expect(ended(events)).toHaveLength(1);
  });

  it('never fades when looping forever', async () => {
    const { events, renderer } = await setup({ loopForever: true });
    renderer.seek(179000, 1);
    renderUntil(renderer, () => seeked(events).length > 0);
    renderQuanta(renderer, quantaFor(6000));
    expect(ended(events)).toHaveLength(0);
  });

  it('cancels a running end fade when looping is switched on', async () => {
    const { events, renderer } = await setup();
    renderer.seek(179000, 1);
    renderUntil(renderer, () => seeked(events).length > 0);
    renderQuanta(renderer, quantaFor(2000));
    renderer.setLoopForever(true);
    renderQuanta(renderer, quantaFor(6000));
    expect(ended(events)).toHaveLength(0);
    expect(renderQuanta(renderer, 4)).toBeGreaterThan(0);
  });

  it('cancels the end fade when seeking back before the duration', async () => {
    const { events, renderer } = await setup();
    renderer.seek(179500, 1);
    renderUntil(renderer, () => seeked(events).length > 0);
    renderQuanta(renderer, quantaFor(1500));
    renderer.seek(1000, 2);
    renderUntil(renderer, () => seeked(events).length > 1);
    renderQuanta(renderer, quantaFor(5000));
    expect(ended(events)).toHaveLength(0);
  });

  it('finishes a seek past the end of the track and reports the end', async () => {
    const { events, renderer } = await setup({ loopForever: true });
    renderer.seek(250000, 5);
    renderUntil(renderer, () => ended(events).length > 0);
    expect(seeked(events)).toHaveLength(1);
    expect(ended(events)).toHaveLength(1);
    expect(renderer.isSeeking).toBe(false);
  });

  it('answers a seek after the track ended immediately', async () => {
    const { events, renderer } = await setup({ loopForever: true });
    renderer.seek(250000, 1);
    renderUntil(renderer, () => ended(events).length > 0);
    renderer.seek(1000, 2);
    expect(seeked(events).map((e) => (e as { seekId: number }).seekId)).toEqual([1, 2]);
    expect(renderer.isSeeking).toBe(false);
  });

  it('outputs silence and ignores seeks with nothing loaded', async () => {
    const core = (await ChipCoreStub()) as ChipCore;
    const events: RendererEvent[] = [];
    const renderer = new ChipRenderer(core, RATE, (event) => events.push(event));
    renderer.seek(1000, 9);
    expect(events).toEqual([{ type: 'seeked', seekId: 9, positionMs: 0 }]);
    expect(renderQuanta(renderer, 2)).toBe(0);
  });

  it('answers a seek when the track ends during the declick fade-out', async () => {
    const { events, renderer } = await setup();
    renderer.seek(179500, 1);
    renderUntil(renderer, () => seeked(events).length > 0);
    renderUntil(renderer, () => renderer.positionMs >= 180000 + END_FADE_MS - 3);
    renderer.seek(1000, 2);
    renderUntil(renderer, () => ended(events).length > 0 || !renderer.isSeeking);
    renderQuanta(renderer, 4);
    expect(seeked(events).map((e) => (e as { seekId: number }).seekId)).toEqual([1, 2]);
    expect(renderer.isSeeking).toBe(false);
  });

  it('adds SubBass on top of the mix only when enabled', async () => {
    const plain = await setup();
    const boosted = await setup({ subBass: 2 });
    const a = new Float32Array(4800);
    const b = new Float32Array(4800);
    plain.renderer.render(a, new Float32Array(4800));
    boosted.renderer.render(b, new Float32Array(4800));
    expect(a.some((x, i) => Math.abs(x - b[i]) > 1e-6)).toBe(true);
  });

  it('starts each loaded track with a fresh SubBass filter', async () => {
    const fresh = await setup({ subBass: 2 });
    const reused = await setup({ subBass: 2 });
    renderQuanta(reused.renderer, 50);
    reused.renderer.load(new Uint8Array(16), '/Album/track.nsf', { ...SETTINGS, subBass: 2 });
    const expected = new Float32Array(RENDER_CHUNK_FRAMES);
    const actual = new Float32Array(RENDER_CHUNK_FRAMES);
    fresh.renderer.render(expected, new Float32Array(RENDER_CHUNK_FRAMES));
    reused.renderer.render(actual, new Float32Array(RENDER_CHUNK_FRAMES));
    expect(Array.from(actual)).toEqual(Array.from(expected));
  });
});
