// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { VoiceFrame, VoiceInfo } from '../audio/data/contract';
import { ScopeRenderer } from '../visuals/ScopeRenderer';
import { GHOST_ALPHA, LANE_FILL, SCOPE_POINT_PX } from '../visuals/scopeMath';

const COLORS = [
  '#000001',
  '#000002',
  '#000003',
  '#000004',
  '#000005',
  '#000006',
  '#000007',
  '#000008',
];

interface Call {
  op: 'begin' | 'move' | 'line' | 'stroke';
  x?: number;
  y?: number;
  strokeStyle?: string;
  globalAlpha?: number;
}

/** A canvas whose 2D context records path calls (there is no canvas in tests). */
function fakeCanvas(width = 200, height = 300) {
  const calls: Call[] = [];
  const ctx: any = {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    lineJoin: 'miter',
    fillRect: vi.fn(),
    beginPath: vi.fn(() => calls.push({ op: 'begin' })),
    moveTo: vi.fn((x: number, y: number) => calls.push({ op: 'move', x, y })),
    lineTo: vi.fn((x: number, y: number) => calls.push({ op: 'line', x, y })),
    stroke: vi.fn(() =>
      calls.push({ op: 'stroke', strokeStyle: ctx.strokeStyle, globalAlpha: ctx.globalAlpha })
    ),
  };
  const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, ctx, calls };
}

/** A frame whose voice waveforms come from fill(voice, sampleIndex). */
function frame(fill: (voice: number, i: number) => number = () => 0): VoiceFrame {
  return {
    time: 0,
    sampleRate: 24000,
    voiceCount: 8,
    voices: Array.from({ length: 8 }, (_, v) => ({
      waveform: Float32Array.from({ length: 1024 }, (_, i) => fill(v, i)),
      rms: 0,
      spectrum: new Float32Array(448),
    })),
    mixSpectrum: new Float32Array(448),
  };
}

function voice(index: number, audible = true): VoiceInfo {
  return { index, name: `Voice ${index}`, chip: '2A03', muted: !audible, soloed: false, audible };
}

function setup(width = 200, height = 300) {
  const fake = fakeCanvas(width, height);
  const renderer = new ScopeRenderer(fake.canvas, '#101010', 2);
  renderer.setColors(COLORS);
  return { ...fake, renderer };
}

const moves = (calls: Call[]) => calls.filter((c) => c.op === 'move');
const strokes = (calls: Call[]) => calls.filter((c) => c.op === 'stroke');

describe('ScopeRenderer', () => {
  it('clears to the background and draws nothing without voices', () => {
    const { renderer, ctx, calls } = setup();
    renderer.draw(frame());
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 200, 300);
    expect(ctx.fillStyle).toBe('#101010');
    expect(strokes(calls)).toHaveLength(0);
  });

  it('draws one lane per voice, each in its own band and channel color', () => {
    const { renderer, calls } = setup();
    renderer.setVoices([voice(0), voice(2), voice(5)]);
    renderer.draw(frame());
    expect(strokes(calls).map((c) => c.strokeStyle)).toEqual([COLORS[0], COLORS[2], COLORS[5]]);
    expect(moves(calls).map((c) => c.y)).toEqual([50, 150, 250]);
  });

  it('ghosts voices you cannot hear and restores full opacity afterwards', () => {
    const { renderer, ctx, calls } = setup();
    renderer.setVoices([voice(0), voice(1, false)]);
    renderer.draw(frame());
    expect(strokes(calls).map((c) => c.globalAlpha)).toEqual([1, GHOST_ALPHA]);
    expect(ctx.globalAlpha).toBe(1);
  });

  it('fills the lane at full scale and clamps beyond it', () => {
    const { renderer, calls } = setup(200, 300);
    renderer.setVoices([voice(0), voice(1)]);
    renderer.draw(frame((v) => (v === 0 ? 1 : -2)));
    const [top, bottom] = moves(calls);
    expect(top.y).toBeCloseTo(75 - (150 * LANE_FILL) / 2, 6);
    expect(bottom.y).toBeCloseTo(225 + (150 * LANE_FILL) / 2, 6);
  });

  it('starts each trace on a rising zero crossing', () => {
    const { renderer, calls } = setup(200, 300);
    renderer.setVoices([voice(0)]);
    renderer.draw(frame((_v, i) => Math.sin((2 * Math.PI * (i + 0.3)) / 64)));
    const first = moves(calls)[0];
    const amplitude = (300 * LANE_FILL) / 2;
    expect(first.x).toBe(0);
    expect(first.y).toBeLessThanOrEqual(150);
    expect(150 - first.y!).toBeLessThan(0.1 * amplitude);
  });

  it('shows the chosen span of samples and ignores spans the zoom does not offer', () => {
    const { renderer, calls } = setup(200, 300);
    const amplitude = (300 * LANE_FILL) / 2;
    renderer.setVoices([voice(0)]);
    const ramp = frame((_v, i) => i / 1024);
    renderer.draw(ramp);
    expect(moves(calls)[0].y).toBeCloseTo(150 - 0.5 * amplitude, 6);
    renderer.setSpan(256);
    renderer.draw(ramp);
    expect(moves(calls)[1].y).toBeCloseTo(150 - 0.75 * amplitude, 6);
    renderer.setSpan(999);
    renderer.draw(ramp);
    expect(moves(calls)[2].y).toBeCloseTo(150 - 0.5 * amplitude, 6);
  });

  it('puts a point every SCOPE_POINT_PX pixels across the full width', () => {
    const { renderer, calls } = setup(200, 300);
    renderer.setVoices([voice(0)]);
    renderer.draw(frame());
    const lines = calls.filter((c) => c.op === 'line');
    expect(lines).toHaveLength(200 / SCOPE_POINT_PX);
    expect(lines[lines.length - 1].x).toBeCloseTo(200, 6);
  });
});
