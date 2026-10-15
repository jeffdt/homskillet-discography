// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { END_FADE_MS } from '../../audio/constants';
import { Encoder, WavEncoder } from '../../audio/export/encoders';
import { exportSettings } from '../../audio/export/exportPlan';
import { ExportJob, renderExport } from '../../audio/export/renderExport';
import { ChipCore } from '../../audio/types';
import { loadRealChipCore, readTrack } from '../helpers/realChipCore';
import { voiceInfo } from '../helpers/voices';

const TRACK = 'Bazaar/groove.nsf';
let core: ChipCore;
let bytes: Uint8Array;

beforeAll(async () => {
  core = await loadRealChipCore();
  bytes = readTrack(TRACK);
});

/** Collects raw float output instead of encoding it. */
class CaptureEncoder implements Encoder {
  readonly mimeType = 'test';
  left: number[] = [];
  right: number[] = [];
  start() {
    return [];
  }
  encode(left: Float32Array, right: Float32Array) {
    for (let i = 0; i < left.length; i++) {
      this.left.push(left[i]);
      this.right.push(right[i]);
    }
    return [];
  }
  finish() {
    return [];
  }
}

function job(lengthMs: number, tempo = 1, mutedAll = false): ExportJob {
  const voices = Array.from({ length: 8 }, (_, i) =>
    voiceInfo(i, `V${i}`, mutedAll ? { muted: true, audible: false } : {})
  );
  const { settings, levels } = exportSettings({ tempo, subbass: 0, stereoWidth: 1, voices });
  return { bytes, path: '/' + TRACK, lengthMs, settings, levels };
}

function peak(samples: number[], from: number, to: number): number {
  let max = 0;
  for (let i = from; i < to; i++) max = Math.max(max, Math.abs(samples[i]));
  return max;
}

describe('renderExport', () => {
  it('writes a WAV of exactly the requested length', () => {
    const parts = renderExport(core, job(5000), new WavEncoder(240000));
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    expect(size).toBe(44 + 240000 * 4);
  });

  it.each([0.5, 1, 2])('fades out over the last 4 s at speed %d', (tempo) => {
    const capture = new CaptureEncoder();
    renderExport(core, job(10000, tempo), capture);
    expect(capture.left.length).toBe(480000);
    const fadeStart = 480000 - (END_FADE_MS / 1000) * 48000;
    expect(peak(capture.left, fadeStart - 48000, fadeStart)).toBeGreaterThan(0.01);
    expect(peak(capture.left, 479000, 480000)).toBeLessThan(0.01);
  });

  it('is silent when every voice is muted', () => {
    const capture = new CaptureEncoder();
    renderExport(core, job(5000, 1, true), capture);
    expect(peak(capture.left, 0, capture.left.length)).toBe(0);
    expect(peak(capture.right, 0, capture.right.length)).toBe(0);
  });

  it('reports progress up to 1', () => {
    const fractions: number[] = [];
    renderExport(core, job(5000), new CaptureEncoder(), (fraction) => fractions.push(fraction));
    expect(fractions.length).toBeGreaterThan(10);
    expect(fractions[fractions.length - 1]).toBe(1);
    expect(fractions).toEqual([...fractions].sort((a, b) => a - b));
  });
});
