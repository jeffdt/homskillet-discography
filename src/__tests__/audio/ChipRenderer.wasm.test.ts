// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import {
  DECLICK_MS,
  END_FADE_MS,
  INTERLEAVED_CHANNELS,
  OUTPUT_SCALE,
  RENDER_CHUNK_FRAMES,
  SEEK_SPEED,
} from '../../audio/constants';
import { ChipRenderer, RendererEvent } from '../../audio/render/ChipRenderer';
import { framesToReach } from '../../audio/render/seekPlan';
import { TapRing } from '../../audio/taps/TapRing';
import { ChipCore, RendererSettings } from '../../audio/types';
import { buildToneThenSilenceNsf } from '../helpers/nsfFixtures';
import { loadRealChipCore, readTrack } from '../helpers/realChipCore';

const RATE = 48000;
const SETTINGS: RendererSettings = { tempo: 1, stereoWidth: 1, subBass: 0, loopForever: false };
const DECLICK_FRAMES = Math.round((DECLICK_MS / 1000) * RATE);

let core: ChipCore;

beforeAll(async () => {
  core = await loadRealChipCore();
});

function makeRenderer(events: RendererEvent[] = [], taps: TapRing | null = null, rate = RATE) {
  return new ChipRenderer(core, rate, (event) => events.push(event), taps);
}

/** Renders exactly `frames` frames and returns the left/right output. */
function capture(renderer: ChipRenderer, frames: number): [Float32Array, Float32Array] {
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  renderer.render(left, right);
  return [left, right];
}

/** Renders quanta until `done` is true; returns how many were rendered, throwing past `limit`. */
function renderUntil(renderer: ChipRenderer, done: () => boolean, limit: number): number {
  const left = new Float32Array(RENDER_CHUNK_FRAMES);
  const right = new Float32Array(RENDER_CHUNK_FRAMES);
  let quanta = 0;
  while (!done()) {
    if (quanta >= limit) throw new Error(`condition not reached within ${limit} quanta`);
    renderer.render(left, right);
    quanta++;
  }
  return quanta;
}

/** Opens a track in GME's ordinary stereo mode (what today's player uses). */
function openStereo(bytes: Uint8Array, depth: number): number {
  const dataPtr = core._malloc(bytes.length);
  core.HEAPU8.set(bytes, dataPtr);
  const emuPtr = core._malloc(4);
  expect(core._gme_open_data(dataPtr, bytes.length, emuPtr, RATE)).toBe(0);
  const emu = core.HEAP32[emuPtr >> 2];
  core._free(dataPtr);
  core._free(emuPtr);
  core._gme_ignore_silence(emu, 0);
  core._gme_set_stereo_depth(emu, depth);
  core._gme_start_track(emu, 0);
  return emu;
}

describe('ChipRenderer on real chip-core', () => {
  it('reads VRC6 voice names and the extended duration', () => {
    const info = makeRenderer().load(
      readTrack('SuperFORE!/parkour.nsf'),
      '/SuperFORE!/parkour.nsf',
      SETTINGS
    );
    expect(info.voices.map((v) => v.name)).toEqual([
      'Square 1',
      'Square 2',
      'Triangle',
      'Noise',
      'DMC',
      'Saw Wave',
      'Square 3',
      'Square 4',
    ]);
    expect(info.gmeVoiceCount).toBe(8);
    expect(info.durationMs).toBeGreaterThan(0);
  });

  it.each(['MetallicWing/echo.nsf', 'SuperFORE!/parkour.nsf'])(
    'sums %s to within 32 LSB of GME stereo mode (null test)',
    (path) => {
      const bytes = readTrack(path);
      const renderer = makeRenderer();
      renderer.load(bytes, '/' + path, SETTINGS);
      const stereo = openStereo(bytes, 1);
      const buffer = core._malloc(RENDER_CHUNK_FRAMES * 2 * 2);
      const left = new Float32Array(RENDER_CHUNK_FRAMES);
      const right = new Float32Array(RENDER_CHUNK_FRAMES);
      let maxLsb = 0;
      for (let q = 0; q < (10 * RATE) / RENDER_CHUNK_FRAMES; q++) {
        renderer.render(left, right);
        core._gme_play(stereo, RENDER_CHUNK_FRAMES * 2, buffer);
        const heap = core.HEAP16;
        const base = buffer >> 1;
        for (let i = 0; i < RENDER_CHUNK_FRAMES; i++) {
          maxLsb = Math.max(
            maxLsb,
            Math.abs(left[i] - heap[base + 2 * i] * OUTPUT_SCALE) / OUTPUT_SCALE,
            Math.abs(right[i] - heap[base + 2 * i + 1] * OUTPUT_SCALE) / OUTPUT_SCALE
          );
        }
      }
      core._gme_delete(stereo);
      expect(maxLsb).toBeLessThanOrEqual(32);
    }
  );

  it('removes exactly one voice when it is muted', () => {
    const bytes = readTrack('SuperFORE!/parkour.nsf');
    const renderer = makeRenderer();
    renderer.setGains([1, 1, 1, 1, 1, 0, 1, 1]);
    renderer.load(bytes, '/SuperFORE!/parkour.nsf', SETTINGS);
    const reference = makeRenderer();
    reference.load(bytes, '/SuperFORE!/parkour.nsf', SETTINGS);
    const raw = core._malloc(RENDER_CHUNK_FRAMES * INTERLEAVED_CHANNELS * 2);
    const left = new Float32Array(RENDER_CHUNK_FRAMES);
    const right = new Float32Array(RENDER_CHUNK_FRAMES);
    // The reference renderer only drives a second emulator in lockstep; read its pairs directly.
    const rawEmu = (reference as unknown as { emu: number }).emu;
    let maxDiff = 0;
    for (let q = 0; q < (5 * RATE) / RENDER_CHUNK_FRAMES; q++) {
      renderer.render(left, right);
      core._gme_play(rawEmu, RENDER_CHUNK_FRAMES * INTERLEAVED_CHANNELS, raw);
      const heap = core.HEAP16;
      for (let i = 0; i < RENDER_CHUNK_FRAMES; i++) {
        let l = 0;
        for (let v = 0; v < 8; v++) {
          if (v !== 5) l += heap[(raw >> 1) + i * INTERLEAVED_CHANNELS + 2 * v];
        }
        maxDiff = Math.max(maxDiff, Math.abs(left[i] - Math.fround(l * OUTPUT_SCALE)));
      }
    }
    expect(maxDiff).toBe(0);
  });

  it.each([1, 1.5])(
    'lands a 30 s seek at tempo %s exactly where continuous playback would be',
    (tempo) => {
      const bytes = readTrack('SuperFORE!/parkour.nsf');
      const settings = { ...SETTINGS, tempo };
      const events: RendererEvent[] = [];
      const seeker = makeRenderer(events);
      seeker.load(bytes, '/SuperFORE!/parkour.nsf', settings);
      seeker.seek(30000, 1);
      const left = new Float32Array(RENDER_CHUNK_FRAMES);
      const right = new Float32Array(RENDER_CHUNK_FRAMES);
      let guard = 0;
      while (!events.some((e) => e.type === 'seeked')) {
        seeker.render(left, right);
        if (++guard > 50000) throw new Error('seek did not finish');
      }
      expect(seeker.positionMs).toBeGreaterThanOrEqual(30000);
      expect(seeker.positionMs).toBeLessThan(30002);

      const reference = makeRenderer();
      reference.load(bytes, '/SuperFORE!/parkour.nsf', settings);
      let remaining = seeker.emulatedFrames;
      while (remaining > 0) {
        const n = Math.min(RENDER_CHUNK_FRAMES, remaining);
        reference.render(left.subarray(0, n), right.subarray(0, n));
        remaining -= n;
      }

      const [seekLeft] = capture(seeker, RATE);
      const [refLeft] = capture(reference, RATE);
      let maxDiff = 0;
      for (let i = DECLICK_FRAMES; i < RATE; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(seekLeft[i] - refLeft[i]));
      }
      expect(maxDiff).toBe(0);
    },
    30000
  );

  it('does not end the tone fixture on silence; it ends at its duration through the end fade', () => {
    const events: RendererEvent[] = [];
    const renderer = makeRenderer(events);
    const info = renderer.load(buildToneThenSilenceNsf(), '/Fixtures/tone.nsf', SETTINGS);
    capture(renderer, 10 * RATE);
    expect(renderer.positionMs).toBeGreaterThan(9000);
    expect(events).toEqual([]);
    renderer.seek(info.durationMs - 100, 1);
    const fadeQuanta = Math.ceil(((END_FADE_MS / 1000) * RATE) / RENDER_CHUNK_FRAMES);
    renderUntil(renderer, () => events.some((e) => e.type === 'ended'), fadeQuanta + 1500);
    expect(events.map((e) => e.type)).toEqual(['seeked', 'ended']);
  }, 30000);

  it('renders an audible tone from the fixture', () => {
    const renderer = makeRenderer();
    renderer.load(buildToneThenSilenceNsf(), '/Fixtures/tone.nsf', SETTINGS);
    const [left, right] = capture(renderer, RATE);
    // At stereo depth 1 GME pans pulse 1 mostly right (peaks: left 0.067, right 0.267).
    const peak = Math.max(...Array.from(left, Math.abs), ...Array.from(right, Math.abs));
    expect(peak).toBeGreaterThan(0.1);
  });

  it('ends the same fixture in GME stereo mode too (parity with today)', () => {
    const emu = openStereo(buildToneThenSilenceNsf(), 1);
    const buffer = core._malloc(RENDER_CHUNK_FRAMES * 2 * 2);
    let quanta = 0;
    while (!core._gme_track_ended(emu) && quanta++ < (15 * RATE) / RENDER_CHUNK_FRAMES) {
      core._gme_play(emu, RENDER_CHUNK_FRAMES * 2, buffer);
    }
    expect(core._gme_track_ended(emu)).toBe(1);
    expect(core._gme_tell_scaled(emu)).toBeLessThan(10000);
    core._gme_delete(emu);
  });

  it('does not end a track when every voice is muted by gain', () => {
    const events: RendererEvent[] = [];
    const taps = new TapRing();
    const renderer = makeRenderer(events, taps);
    renderer.setGains(new Float32Array(8));
    renderer.load(readTrack('SuperFORE!/parkour.nsf'), '/SuperFORE!/parkour.nsf', SETTINGS);
    let peak = 0;
    for (let s = 0; s < 20; s++) {
      const [left, right] = capture(renderer, RATE);
      for (let i = 0; i < RATE; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    }
    expect(peak).toBe(0);
    expect(events.filter((e) => e.type === 'ended')).toHaveLength(0);
    expect(taps.samples.some((x) => x !== 0)).toBe(true);
  }, 30000);
});

describe('ChipRenderer seek probes on real chip-core', () => {
  const PARKOUR = 'SuperFORE!/parkour.nsf';
  const SEEK_TARGET_MS = 20000;

  describe.each([48000, 44100])('at %i Hz', (rate) => {
    it.each([0.95, 0.9, 0.75, 0.3, 1.05, 1.1])(
      'finishes a seek at non-dyadic tempo %s within the planned quanta',
      (tempo) => {
        const events: RendererEvent[] = [];
        const renderer = makeRenderer(events, null, rate);
        renderer.load(readTrack(PARKOUR), '/' + PARKOUR, { ...SETTINGS, tempo });
        const plannedFrames = framesToReach(0, SEEK_TARGET_MS, tempo, rate);
        const bound = Math.ceil(plannedFrames / (RENDER_CHUNK_FRAMES * SEEK_SPEED)) + 2;
        renderer.seek(SEEK_TARGET_MS, 7);
        renderUntil(renderer, () => events.some((e) => e.type === 'seeked'), bound);
        expect(events.find((e) => e.type === 'seeked')).toMatchObject({ seekId: 7 });
        const emulatedSongMs = (renderer.emulatedFrames / rate) * 1000 * tempo;
        expect(Math.abs(emulatedSongMs - SEEK_TARGET_MS)).toBeLessThan(2);
      },
      30000
    );

    const seekAtTempo = (tempo: number) => {
      const events: RendererEvent[] = [];
      const renderer = makeRenderer(events, null, rate);
      renderer.load(readTrack(PARKOUR), '/' + PARKOUR, { ...SETTINGS, tempo });
      renderer.seek(SEEK_TARGET_MS, 7);
      renderUntil(renderer, () => events.some((e) => e.type === 'seeked'), 5000);
      return { events, renderer };
    };
    const NON_DYADIC_TEMPOS = [0.95, 0.9, 0.3, 1.05, 1.1];

    it('finishes a seek at non-dyadic tempos', () => {
      for (const tempo of NON_DYADIC_TEMPOS) {
        const { events } = seekAtTempo(tempo);
        expect(events.find((e) => e.type === 'seeked')).toMatchObject({ seekId: 7 });
      }
    }, 30000);

    it('reports a positionMs within 5 ms of the target at non-dyadic tempos', () => {
      for (const tempo of NON_DYADIC_TEMPOS) {
        const { renderer } = seekAtTempo(tempo);
        expect(Math.abs(renderer.positionMs - SEEK_TARGET_MS)).toBeLessThan(5);
      }
    }, 30000);
  });

  // GME's integer tell_scaled drifts about 0.5% at non-dyadic tempos; positionMs must not.
  it.each([0.95, 0.9, 1.1])(
    'tracks song position without drift during 30 s of playback at tempo %s',
    (tempo) => {
      const renderer = makeRenderer();
      renderer.load(readTrack(PARKOUR), '/' + PARKOUR, { ...SETTINGS, tempo });
      const quanta = Math.round((30 * RATE) / RENDER_CHUNK_FRAMES);
      renderUntil(renderer, () => renderer.emulatedFrames >= quanta * RENDER_CHUNK_FRAMES, quanta);
      const expectedMs = (renderer.emulatedFrames / RATE) * 1000 * tempo;
      expect(Math.abs(renderer.positionMs - expectedMs)).toBeLessThan(1);
    },
    30000
  );

  it('accumulates song position piecewise across a tempo change', () => {
    const renderer = makeRenderer();
    renderer.load(readTrack(PARKOUR), '/' + PARKOUR, { ...SETTINGS, tempo: 0.95 });
    const quanta = Math.round((10 * RATE) / RENDER_CHUNK_FRAMES);
    capture(renderer, quanta * RENDER_CHUNK_FRAMES);
    renderer.setTempo(1.1);
    capture(renderer, quanta * RENDER_CHUNK_FRAMES);
    const segmentMs = ((quanta * RENDER_CHUNK_FRAMES) / RATE) * 1000;
    expect(Math.abs(renderer.positionMs - segmentMs * (0.95 + 1.1))).toBeLessThan(1);
  }, 30000);

  it('handles a fractional seek target', () => {
    const events: RendererEvent[] = [];
    const renderer = makeRenderer(events);
    renderer.load(readTrack(PARKOUR), '/' + PARKOUR, SETTINGS);
    renderer.seek(30000.5, 1);
    const bound =
      Math.ceil(framesToReach(0, 30000.5, 1, RATE) / (RENDER_CHUNK_FRAMES * SEEK_SPEED)) + 2;
    renderUntil(renderer, () => events.some((e) => e.type === 'seeked'), bound);
    expect(renderer.positionMs).toBeGreaterThanOrEqual(30000);
    expect(renderer.positionMs).toBeLessThan(30003);
  }, 30000);

  it('answers a seek into the fixture silent section with seeked and keeps playing', () => {
    const events: RendererEvent[] = [];
    const renderer = makeRenderer(events);
    renderer.load(buildToneThenSilenceNsf(), '/Fixtures/tone.nsf', SETTINGS);
    capture(renderer, RATE / 2);
    renderer.seek(8000, 3);
    renderUntil(renderer, () => events.some((e) => e.type === 'seeked'), 2000);
    capture(renderer, RATE);
    expect(events).toEqual([{ type: 'seeked', seekId: 3, positionMs: expect.any(Number) }]);
  });

  it('answers a seek past the track duration with seeked, then ends through the end fade', () => {
    const events: RendererEvent[] = [];
    const renderer = makeRenderer(events);
    const info = renderer.load(buildToneThenSilenceNsf(), '/Fixtures/tone.nsf', SETTINGS);
    renderer.seek(info.durationMs + 5000, 4);
    const fadeQuanta = Math.ceil(((END_FADE_MS / 1000) * RATE) / RENDER_CHUNK_FRAMES);
    renderUntil(renderer, () => events.some((e) => e.type === 'ended'), fadeQuanta + 3000);
    expect(events.map((e) => e.type)).toEqual(['seeked', 'ended']);
    expect(events[0]).toMatchObject({ seekId: 4 });
  }, 30000);

  it('finishes a seek issued in the last quanta of the end fade', () => {
    const events: RendererEvent[] = [];
    const renderer = makeRenderer(events);
    const info = renderer.load(readTrack(PARKOUR), '/' + PARKOUR, SETTINGS);
    renderer.seek(info.durationMs - 100, 1);
    renderUntil(renderer, () => events.some((e) => e.type === 'seeked'), 5000);
    events.length = 0;
    const fadeQuanta = Math.ceil(((END_FADE_MS / 1000) * RATE) / RENDER_CHUNK_FRAMES);
    const fadeStarted = () => (renderer as unknown as { endFadeStarted: boolean }).endFadeStarted;
    renderUntil(renderer, fadeStarted, 1000);
    let rendered = 0;
    renderUntil(renderer, () => rendered++ >= fadeQuanta - 3, fadeQuanta);
    expect(events.filter((e) => e.type === 'ended')).toHaveLength(0);
    renderer.seek(1000, 2);
    renderUntil(renderer, () => events.some((e) => e.type === 'seeked'), 500);
    expect(events.find((e) => e.type === 'seeked')).toMatchObject({ seekId: 2 });
  }, 30000);
});
