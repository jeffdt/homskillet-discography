// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Reverb } from '../../audio/render/Reverb';

const RATE = 48000;

function impulseResponse(reverb: Reverb, frames: number): [Float32Array, Float32Array] {
  const send = new Float32Array(frames);
  send[0] = 1;
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  reverb.process(send, left, right, 0, frames);
  return [left, right];
}

function energy(samples: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i] * samples[i];
  return sum;
}

describe('Reverb', () => {
  it('adds a delayed, decaying tail on top of what is already there', () => {
    const reverb = new Reverb(RATE);
    const [left] = impulseResponse(reverb, RATE);
    const firstEcho = left.findIndex((x) => x !== 0);
    // The shortest comb is 1116 samples at 44.1 kHz, about 25 ms.
    expect(firstEcho).toBeGreaterThan(0.02 * RATE);
    const early = energy(left, 0, RATE / 4);
    const late = energy(left, (3 * RATE) / 4, RATE);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeLessThan(early / 10);
  });

  it('makes the two sides differ, so the tail sounds wide', () => {
    const [left, right] = impulseResponse(new Reverb(RATE), RATE / 2);
    let differs = 0;
    for (let i = 0; i < left.length; i++) if (Math.abs(left[i] - right[i]) > 1e-6) differs++;
    expect(differs).toBeGreaterThan(left.length / 4);
  });

  it('adds to the dry signal at the offset instead of replacing it', () => {
    const reverb = new Reverb(RATE);
    const left = new Float32Array(10).fill(0.5);
    const right = new Float32Array(10).fill(0.5);
    reverb.process(new Float32Array(4), left, right, 3, 4);
    expect(Array.from(left)).toEqual(new Array(10).fill(0.5));
  });

  it('goes silent at once when cleared', () => {
    const reverb = new Reverb(RATE);
    impulseResponse(reverb, 2000);
    reverb.clear();
    const out = new Float32Array(4000);
    reverb.process(new Float32Array(4000), out, new Float32Array(4000), 0, 4000);
    expect(out.every((x) => x === 0)).toBe(true);
  });
});
