// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import ChipCoreStub from '../../../chip-core-stub';
import { SpectrumLayout } from '../../../audio/data/contract';
import { FftSpectrumAnalyzer } from '../../../audio/data/spectra';
import { TapAudioDataSource } from '../../../audio/data/TapAudioDataSource';
import { ChipEngine } from '../../../audio/engine/ChipEngine';
import { InProcessLink } from '../../../audio/engine/links';
import { ProcessorCore } from '../../../audio/processor/ProcessorCore';
import { TapRing } from '../../../audio/taps/TapRing';
import { RingTapReader } from '../../../audio/taps/transports';
import { ChipCore } from '../../../audio/types';
import { loadTrack, makeTestEngine } from '../../helpers/engineHarness';
import { nsfHeader } from '../../helpers/nsfHeader';
import { ramp, sineValues, writeTaps } from '../../helpers/taps';

const APU = ['Square 1', 'Square 2', 'Triangle', 'Noise', 'DMC'];
const VRC6 = [...APU, 'Saw Wave', 'Square 3', 'Square 4'];
const SEMITONE = Math.pow(2, 1 / 12);

/** A source whose clock advances 16 ms per readFrame, like a 60 fps loop. */
function steppedSource(): TapAudioDataSource {
  let now = 0;
  return new TapAudioDataSource(() => (now += 16));
}

/** Writes values (per voice) in 512-sample chunks and reads a frame after each, like a running loop. */
function feed(ring: TapRing, source: TapAudioDataSource, values: number[][]): void {
  for (let start = 0; start < values[0].length; start += 512) {
    writeTaps(
      ring,
      values.map((voice) => voice.slice(start, start + 512))
    );
    source.readFrame();
  }
}

function binNearest(layout: SpectrumLayout, hz: number): number {
  let best = 0;
  for (let b = 1; b < layout.bins; b++) {
    if (Math.abs(layout.frequencies[b] - hz) < Math.abs(layout.frequencies[best] - hz)) best = b;
  }
  return best;
}

function peakBin(values: Float32Array): number {
  let best = 0;
  for (let b = 1; b < values.length; b++) if (values[b] > values[best]) best = b;
  return best;
}

describe('TapAudioDataSource voices', () => {
  it('reports no voices and a silent frame before it is attached', () => {
    const source = new TapAudioDataSource();
    const frame = source.readFrame();
    expect(source.getVoices()).toEqual([]);
    expect(frame.voiceCount).toBe(0);
    expect(frame.sampleRate).toBe(0);
    expect(frame.voices).toHaveLength(8);
    expect(Math.max(...frame.mixSpectrum)).toBe(0);
  });

  it('publishes voices with their chips on load and none after stop', async () => {
    const { engine, link } = makeTestEngine();
    const source = new TapAudioDataSource();
    source.attach(engine);
    const changed = vi.fn();
    source.onVoicesChanged(changed);
    await loadTrack(engine, link, nsfHeader(0x01), VRC6);
    expect(source.getVoices().map((v) => v.chip)).toEqual([
      ...new Array(5).fill('2A03'),
      'VRC6',
      'VRC6',
      'VRC6',
    ]);
    expect(source.getVoices()[5]).toEqual({
      index: 5,
      name: 'Saw Wave',
      chip: 'VRC6',
      muted: false,
      soloed: false,
      audible: true,
    });
    engine.stop();
    expect(source.getVoices()).toEqual([]);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('marks muted and soloed voices', async () => {
    const { engine, link } = makeTestEngine();
    const source = new TapAudioDataSource();
    source.attach(engine);
    await loadTrack(engine, link, nsfHeader(0), APU);
    engine.setVoiceMix({ muted: [true], soloed: [false, false, true] });
    const voices = source.getVoices();
    expect(voices[0]).toMatchObject({ muted: true, soloed: false, audible: false });
    expect(voices[1]).toMatchObject({ muted: false, soloed: false, audible: false });
    expect(voices[2]).toMatchObject({ muted: false, soloed: true, audible: true });
  });

  it('catches up with a track loaded before attach', async () => {
    const { engine, link } = makeTestEngine();
    await loadTrack(engine, link, nsfHeader(0), APU);
    const source = new TapAudioDataSource();
    source.attach(engine);
    expect(source.getVoices()).toHaveLength(5);
  });
});

describe('TapAudioDataSource frames', () => {
  it('keeps a muted voice in its waveform and level but drops it from the mix spectrum', () => {
    const { engine, ring } = makeTestEngine();
    const source = steppedSource();
    source.attach(engine);
    const values = [sineValues(440, 4096), sineValues(2000, 4096)];
    feed(ring, source, values);
    const bin2000 = binNearest(source.getSpectrumLayout(), 2000);
    const before = source.readFrame().mixSpectrum[bin2000];
    engine.setVoiceMix({ muted: [false, true], soloed: [] });
    feed(ring, source, values);
    const frame = source.readFrame();
    expect(frame.mixSpectrum[bin2000]).toBeLessThan(before * 0.2);
    expect(frame.voices[1].rms).toBeGreaterThan(0.1);
    expect(Math.max(...frame.voices[1].waveform)).toBeGreaterThan(0.2);
  });

  it('lines the window up with what is audible now', () => {
    const { engine, ring, context } = makeTestEngine();
    const source = new TapAudioDataSource(() => 0);
    source.attach(engine);
    writeTaps(ring, [ramp(0, 2000)], { contextTime: 1 });
    context.currentTime = 0.99; // the newest sample is heard 10 ms (240 samples) from now
    const frame = source.readFrame();
    const waveform = frame.voices[0].waveform;
    expect(Math.round(waveform[waveform.length - 1] * 32768)).toBe(1759);
    expect(frame.time).toBeCloseTo(0.99, 6);
    expect(frame.sampleRate).toBe(24000);
  });

  it('computes each spectrum only when read, once per frame', () => {
    const analyze = vi.spyOn(FftSpectrumAnalyzer.prototype, 'analyze');
    const { engine, ring } = makeTestEngine();
    const source = steppedSource();
    source.attach(engine);
    feed(ring, source, [sineValues(440, 4096)]);
    analyze.mockClear();
    const frame = source.readFrame();
    expect(analyze).not.toHaveBeenCalled();
    const mix = frame.mixSpectrum;
    expect(frame.mixSpectrum).toBe(mix);
    expect(analyze).toHaveBeenCalledTimes(1);
    const voice = frame.voices[0].spectrum;
    expect(frame.voices[0].spectrum).toBe(voice);
    expect(analyze).toHaveBeenCalledTimes(2);
    expect(source.readFrame().mixSpectrum).toHaveLength(448);
    expect(analyze).toHaveBeenCalledTimes(3);
    analyze.mockRestore();
  });

  it('finds a voice pitch in its own spectrum and leaves unused voices silent', () => {
    const { engine, ring } = makeTestEngine();
    const source = steppedSource();
    source.attach(engine);
    feed(ring, source, [sineValues(440, 4096)]);
    const frame = source.readFrame();
    const peakHz = source.getSpectrumLayout().frequencies[peakBin(frame.voices[0].spectrum)];
    expect(peakHz / 440).toBeLessThan(SEMITONE);
    expect(440 / peakHz).toBeLessThan(SEMITONE);
    expect(frame.voiceCount).toBe(1);
    expect(Math.max(...frame.voices[3].spectrum)).toBe(0);
    expect(Math.max(...frame.voices[3].waveform)).toBe(0);
  });

  it('goes silent after detach', () => {
    const { engine, ring } = makeTestEngine();
    const source = steppedSource();
    source.attach(engine);
    feed(ring, source, [sineValues(440, 1024)]);
    source.detach();
    const frame = source.readFrame();
    expect(frame.voiceCount).toBe(0);
    expect(Math.max(...frame.voices[0].waveform)).toBe(0);
    expect(source.getVoices()).toEqual([]);
  });

  it('works end to end on the stub core', async () => {
    const core = (await ChipCoreStub()) as ChipCore;
    const link = new InProcessLink();
    const ring = new TapRing();
    const processor = new ProcessorCore({
      core,
      sampleRate: 48000,
      emit: link.emit,
      ring,
      sender: null,
    });
    link.attach(processor);
    const context = { currentTime: 0, close: vi.fn(() => Promise.resolve()) };
    const engine = new ChipEngine({
      kind: 'stub',
      context: context as unknown as AudioContext,
      outputNode: { disconnect: vi.fn() } as unknown as AudioNode,
      volumeNode: { gain: { value: 1 }, disconnect: vi.fn() } as unknown as GainNode,
      spectrumCore: core,
      link,
      taps: new RingTapReader(ring),
    });
    const source = steppedSource();
    source.attach(engine);
    await engine.load(new Uint8Array(16), '/Album/track.nsf', {
      tempo: 1,
      stereoWidth: 1,
      subBass: 0,
      loopForever: false,
    });
    const left = new Float32Array(128);
    const right = new Float32Array(128);
    for (let q = 0; q < 375; q++) {
      processor.process(left, right, (q * 128) / 48000);
      if (q % 6 === 5) source.readFrame();
    }
    context.currentTime = (375 * 128) / 48000;
    const frame = source.readFrame();
    expect(source.getVoices().map((v) => v.chip)).toEqual(new Array(5).fill('2A03'));
    expect(frame.voiceCount).toBe(5);
    expect(frame.sampleRate).toBe(24000);
    expect(frame.voices[0].waveform.some((x) => x !== 0)).toBe(true);
    expect(Math.max(...frame.mixSpectrum)).toBeGreaterThan(0);
  });
});
