// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { VOICE_PAIRS } from '../audio/constants';
import { VoiceFrame, VoiceInfo } from '../audio/data/contract';
import { BinColorizer, COLOR_SMOOTHING_MS } from '../visuals/BinColorizer';
import { Rgb } from '../visuals/color';

const BINS = 16;
const FALLBACK: Rgb = [195, 195, 195];
const COLORS = [
  '#ff0000',
  '#0000ff',
  '#00ff00',
  '#ffff00',
  '#00ffff',
  '#ff00ff',
  '#808080',
  '#804000',
];

/** A frame with editable spectra and levels that counts spectrum reads per voice. */
function makeFrame(voiceCount: number) {
  const spectra = Array.from({ length: VOICE_PAIRS }, () => new Float32Array(BINS));
  const rms = new Array(VOICE_PAIRS).fill(0.5);
  const reads = new Array(VOICE_PAIRS).fill(0);
  const voices = spectra.map((spectrum, v) => ({
    waveform: new Float32Array(0),
    get rms() {
      return rms[v];
    },
    get spectrum() {
      reads[v]++;
      return spectrum;
    },
  }));
  const frame: VoiceFrame = {
    time: 0,
    sampleRate: 24000,
    voiceCount,
    voices,
    mixSpectrum: new Float32Array(BINS),
  };
  return { frame, spectra, rms, reads };
}

function voice(index: number, audible = true): VoiceInfo {
  return { index, name: `Voice ${index}`, chip: '2A03', muted: !audible, soloed: false, audible };
}

function setup(voiceCount = 2, voices = [voice(0), voice(1)]) {
  const colorizer = new BinColorizer(BINS, FALLBACK);
  colorizer.setChannelColors(COLORS);
  colorizer.setVoices(voices);
  return { colorizer, ...makeFrame(voiceCount) };
}

function rgbAt(colors: Float32Array, bin: number): number[] {
  return Array.from(colors.subarray(bin * 3, bin * 3 + 3));
}

describe('BinColorizer', () => {
  it('starts every bin at the fallback', () => {
    const { colorizer, frame } = setup();
    const colors = colorizer.update(frame, 0);
    expect(colors).toHaveLength(BINS * 3);
    expect(rgbAt(colors, 0)).toEqual([...FALLBACK]);
  });

  it('colors a bin with the only voice that has energy there', () => {
    const { colorizer, frame, spectra } = setup();
    spectra[0][3] = 1;
    spectra[1][7] = 1;
    const colors = colorizer.update(frame, 0);
    expect(rgbAt(colors, 3)).toEqual([255, 0, 0]);
    expect(rgbAt(colors, 7)).toEqual([0, 0, 255]);
    expect(rgbAt(colors, 5)).toEqual([...FALLBACK]);
  });

  it('blends a shared bin by power, so the louder voice dominates', () => {
    const { colorizer, frame, spectra } = setup();
    spectra[0][3] = 1;
    spectra[1][3] = 1;
    let [r, g, b] = rgbAt(colorizer.update(frame, 0), 3);
    expect(r).toBeCloseTo(127.5, 3);
    expect(g).toBe(0);
    expect(b).toBeCloseTo(127.5, 3);
    spectra[1][3] = 0.5; // 1/256 of the weight at AVERAGE_WEIGHT_POWER 8
    [r, g, b] = rgbAt(colorizer.update(frame, 0), 3);
    expect(r).toBeCloseTo((255 * 256) / 257, 3);
    expect(b).toBeCloseTo(255 / 257, 3);
  });

  it("keeps the voices' saturation when their average would turn gray", () => {
    const { colorizer, frame, spectra } = setup();
    colorizer.setChannelColors(['#56b4e9', '#f0e442']);
    spectra[0][3] = 1;
    spectra[1][3] = 1;
    const [r, g, b] = rgbAt(colorizer.update(frame, 0), 3);
    // Plain average (163, 204, 149.5) has chroma 54.5; the voices average 160.5 (147 and 174).
    expect(g).toBeCloseTo(204, 3);
    expect(b).toBeCloseTo(204 - 160.5, 3);
    expect(r).toBeCloseTo(204 - (204 - 163) * (160.5 / 54.5), 3);
  });

  it('leaves an exact gray alone (no hue to restore)', () => {
    const { colorizer, frame, spectra } = setup();
    colorizer.setChannelColors(['#ffff00', '#0000ff']);
    spectra[0][3] = 1;
    spectra[1][3] = 1;
    expect(rgbAt(colorizer.update(frame, 0), 3)).toEqual([127.5, 127.5, 127.5]);
  });

  it('ignores muted and unsoloed voices and never reads their spectra', () => {
    const { colorizer, frame, spectra, reads } = setup(2, [voice(0, false), voice(1)]);
    spectra[0][3] = 1;
    spectra[1][3] = 1;
    expect(rgbAt(colorizer.update(frame, 0), 3)).toEqual([0, 0, 255]);
    expect(reads[0]).toBe(0);
    expect(reads[1]).toBe(1);
  });

  it('skips silent voices and voices past voiceCount', () => {
    const { colorizer, frame, rms, reads } = setup(1, [voice(0), voice(1)]);
    rms[0] = 0;
    colorizer.update(frame, 16);
    expect(reads[0]).toBe(0);
    expect(reads[1]).toBe(0);
  });

  it("keeps a bin's color when no audible voice has energy there", () => {
    const { colorizer, frame, spectra } = setup();
    spectra[0][3] = 1;
    colorizer.update(frame, 0);
    spectra[0][3] = 0;
    expect(rgbAt(colorizer.update(frame, 16), 3)).toEqual([255, 0, 0]);
  });

  it('moves toward a new color with a COLOR_SMOOTHING_MS time constant', () => {
    const { colorizer, frame, spectra } = setup();
    spectra[0][3] = 1;
    colorizer.update(frame, 0);
    spectra[0][3] = 0;
    spectra[1][3] = 1;
    const [r, , b] = rgbAt(colorizer.update(frame, COLOR_SMOOTHING_MS), 3);
    expect(r).toBeCloseTo(255 * Math.exp(-1), 3);
    expect(b).toBeCloseTo(255 * (1 - Math.exp(-1)), 3);
  });

  it('takes new channel colors and uses the fallback for unparsable ones', () => {
    const { colorizer, frame, spectra } = setup();
    spectra[0][3] = 1;
    spectra[1][7] = 1;
    colorizer.setChannelColors(['#00ff00', 'not-a-color']);
    const colors = colorizer.update(frame, 0);
    expect(rgbAt(colors, 3)).toEqual([0, 255, 0]);
    expect(rgbAt(colors, 7)).toEqual([...FALLBACK]);
  });

  it('reset returns every bin to the fallback', () => {
    const { colorizer, frame, spectra } = setup();
    spectra[0][3] = 1;
    colorizer.update(frame, 0);
    colorizer.reset();
    spectra[0][3] = 0;
    expect(rgbAt(colorizer.update(frame, 0), 3)).toEqual([...FALLBACK]);
  });
});
