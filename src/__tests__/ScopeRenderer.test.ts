// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { VoiceFrame, VoiceInfo } from '../audio/data/contract';
import {
  BLOOM_SCALE,
  GLOW_PASSES,
  NO_EFFECTS,
  ScopeEffects,
  ScopeRenderer,
} from '../visuals/ScopeRenderer';
import { GHOST_ALPHA, trailFade } from '../visuals/scopeMath';

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
const CORE = '#fefefe';

interface Op {
  op: string;
  path?: FakePath;
  strokeStyle?: string;
  globalAlpha?: number;
  lineWidth?: number;
  composite?: string;
}

class FakePath {
  points: Array<[number, number]> = [];
  closed = false;
  moveTo(x: number, y: number) {
    this.points.push([x, y]);
  }
  lineTo(x: number, y: number) {
    this.points.push([x, y]);
  }
  closePath() {
    this.closed = true;
  }
}

function fakeCanvas(width: number, height: number, ops: Op[]) {
  const ctx: any = {
    strokeStyle: '',
    fillStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    lineJoin: 'miter',
    lineCap: 'butt',
    globalCompositeOperation: 'source-over',
  };
  const snap = (op: string, path?: FakePath): Op => ({
    op,
    path,
    strokeStyle: ctx.strokeStyle,
    globalAlpha: ctx.globalAlpha,
    lineWidth: ctx.lineWidth,
    composite: ctx.globalCompositeOperation,
  });
  ctx.clearRect = vi.fn(() => ops.push(snap('clear')));
  ctx.fillRect = vi.fn(() => ops.push(snap('fillRect')));
  ctx.stroke = vi.fn((path: FakePath) => ops.push(snap('stroke', path)));
  ctx.fill = vi.fn((path: FakePath) => ops.push(snap('fill', path)));
  ctx.drawImage = vi.fn(() => ops.push(snap('drawImage')));
  const canvas = { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

function frame(fill: (voice: number, i: number) => number = () => 0, rms = 0): VoiceFrame {
  return {
    time: 0,
    sampleRate: 24000,
    voiceCount: 8,
    voices: Array.from({ length: 8 }, (_, v) => ({
      waveform: Float32Array.from({ length: 1024 }, (_, i) => fill(v, i)),
      rms,
      spectrum: new Float32Array(448),
    })),
    mixSpectrum: new Float32Array(448),
  };
}

const voice = (index: number, audible = true): VoiceInfo => ({
  index,
  name: `Voice ${index}`,
  chip: '2A03',
  muted: !audible,
  soloed: false,
  audible,
});

function setup(
  options: { renderScale?: number; bloom?: boolean; width?: number; height?: number } = {}
) {
  const { renderScale = 1, bloom = true, width = 200, height = 300 } = options;
  const ops: Op[] = [];
  const bloomOps: Op[] = [];
  const main = fakeCanvas(width, height, ops);
  const bloomCanvas = bloom ? fakeCanvas(0, 0, bloomOps) : null;
  const half = fakeCanvas(0, 0, bloomOps);
  const renderer = new ScopeRenderer(
    main.canvas,
    bloomCanvas ? bloomCanvas.canvas : null,
    renderScale,
    CORE,
    {
      createPath: () => new FakePath() as unknown as Path2D,
      createCanvas: () => half.canvas,
    }
  );
  renderer.setColors(COLORS);
  return { renderer, ops, bloomOps, main, bloomCanvas, half };
}

const strokes = (ops: Op[]) => ops.filter((o) => o.op === 'stroke');
const effects = (over: Partial<ScopeEffects>): ScopeEffects => ({ ...NO_EFFECTS, ...over });

describe('ScopeRenderer', () => {
  it('clears each frame without trails and draws nothing without voices', () => {
    const { renderer, ops } = setup();
    ops.length = 0; // the constructor's own clear
    renderer.draw(frame(), 16);
    expect(ops.map((o) => o.op)).toEqual(['clear']);
  });

  it('fades instead of clearing when trails are on', () => {
    const { renderer, ops } = setup();
    renderer.setEffects(effects({ trails: 0.8 }));
    ops.length = 0;
    renderer.draw(frame(), 1000 / 60);
    expect(ops[0]).toMatchObject({ op: 'fillRect', composite: 'destination-out' });
    expect(ops[0].globalAlpha).toBeCloseTo(trailFade(0.8, 1000 / 60));
  });

  it('strokes one plain line per audible voice with no effects, scaled by the render scale', () => {
    const { renderer, ops } = setup({ renderScale: 0.5 });
    renderer.setVoices([voice(0), voice(2)]);
    ops.length = 0;
    renderer.draw(frame(), 16);
    expect(strokes(ops)).toHaveLength(2);
    expect(strokes(ops).map((s) => s.strokeStyle)).toEqual([COLORS[0], COLORS[2]]);
    strokes(ops).forEach((s) => {
      expect(s.globalAlpha).toBe(1);
      expect(s.lineWidth).toBe(1);
      expect(s.composite).toBe('lighter');
    });
  });

  it('adds three glow passes widest first, then the line, then the white core', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    renderer.setEffects(effects({ glow: 0.6, core: true, lineWidth: 2 }));
    ops.length = 0;
    renderer.draw(frame(), 16);
    const s = strokes(ops);
    expect(s.map((o) => o.lineWidth)).toEqual([16, 8, 4, 2, 0.8]);
    GLOW_PASSES.forEach((pass, i) => expect(s[i].globalAlpha).toBeCloseTo(pass.alpha * 0.6));
    expect(s[3].globalAlpha).toBe(1);
    expect(s[4]).toMatchObject({ strokeStyle: CORE });
    expect(s[4].globalAlpha).toBeCloseTo(0.55);
    // Every pass strokes the same path, built once.
    expect(new Set(s.map((o) => o.path)).size).toBe(1);
  });

  it('draws a voice you cannot hear as a plain ghost, whatever the effects', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0, false)]);
    renderer.setEffects(effects({ glow: 1, core: true, fill: true, reactivity: 1 }));
    ops.length = 0;
    renderer.draw(
      frame(() => 0, 0.6),
      16
    );
    expect(strokes(ops)).toHaveLength(1);
    expect(strokes(ops)[0]).toMatchObject({ globalAlpha: GHOST_ALPHA, composite: 'source-over' });
    expect(ops.some((o) => o.op === 'fill')).toBe(false);
  });

  it('thickens and brightens loud voices when reactive', () => {
    const quiet = setup();
    quiet.renderer.setVoices([voice(0)]);
    quiet.renderer.setEffects(effects({ reactivity: 1 }));
    quiet.renderer.draw(
      frame(() => 0, 0),
      16
    );
    const loud = setup();
    loud.renderer.setVoices([voice(0)]);
    loud.renderer.setEffects(effects({ reactivity: 1 }));
    loud.renderer.draw(
      frame(() => 0, 0.6),
      16
    );
    expect(strokes(loud.ops)[0].lineWidth).toBeGreaterThan(strokes(quiet.ops)[0].lineWidth!);
  });

  it('fills under the wave only in stacked and overlaid layouts', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    renderer.setEffects(effects({ fill: true }));
    renderer.draw(frame(), 16);
    expect(ops.filter((o) => o.op === 'fill')).toHaveLength(1);
    renderer.setLayout('rings');
    ops.length = 0;
    renderer.draw(frame(), 16);
    expect(ops.filter((o) => o.op === 'fill')).toHaveLength(0);
  });

  it('closes ring paths and turns them only while motion is on', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    renderer.setLayout('rings');
    renderer.draw(frame(), 1000);
    const first = strokes(ops)[0].path!;
    expect(first.closed).toBe(true);
    ops.length = 0;
    renderer.draw(frame(), 1000);
    const second = strokes(ops)[0].path!;
    expect(second.points[0]).not.toEqual(first.points[0]);
    renderer.setMotion(false);
    ops.length = 0;
    renderer.draw(frame(), 1000);
    const still = strokes(ops)[0].path!.points[0];
    ops.length = 0;
    renderer.draw(frame(), 1000);
    expect(strokes(ops)[0].path!.points[0]).toEqual(still);
  });

  it('copies a quarter-size picture for bloom, only when bloom is on', () => {
    const { renderer, bloomOps, bloomCanvas } = setup({ width: 400, height: 200 });
    expect(bloomCanvas!.canvas.width).toBe(400 / BLOOM_SCALE);
    expect(bloomCanvas!.canvas.height).toBe(200 / BLOOM_SCALE);
    renderer.draw(frame(), 16);
    expect(bloomOps.filter((o) => o.op === 'drawImage')).toHaveLength(0);
    renderer.setEffects(effects({ bloom: 0.5 }));
    renderer.draw(frame(), 16);
    expect(bloomOps.filter((o) => o.op === 'drawImage')).toHaveLength(2);
  });

  it('skips bloom and draws one glow pass in low power', () => {
    const { renderer, ops, bloomOps } = setup({ renderScale: 0.5 });
    renderer.setVoices([voice(0)]);
    renderer.setEffects(effects({ glow: 1, bloom: 1, lineWidth: 2 }));
    ops.length = 0;
    renderer.draw(frame(), 16);
    expect(strokes(ops).map((o) => o.lineWidth)).toEqual([4, 1]);
    expect(bloomOps.filter((o) => o.op === 'drawImage')).toHaveLength(0);
  });

  it('wipes the picture on resize, layout change and new voices', () => {
    const { renderer, ops, main, bloomCanvas } = setup();
    renderer.setEffects(effects({ trails: 0.8 }));
    ops.length = 0;
    renderer.setVoices([voice(0)]);
    renderer.setLayout('overlaid');
    (main.canvas as { width: number }).width = 800;
    renderer.resize();
    expect(ops.filter((o) => o.op === 'clear')).toHaveLength(3);
    expect(bloomCanvas!.canvas.width).toBe(800 / BLOOM_SCALE);
  });

  it('works without a bloom canvas or a 2D context', () => {
    const { renderer } = setup({ bloom: false });
    renderer.setEffects(effects({ bloom: 1 }));
    expect(() => renderer.draw(frame(), 16)).not.toThrow();
    const blind = new ScopeRenderer(
      { width: 10, height: 10, getContext: () => null } as unknown as HTMLCanvasElement,
      null,
      1,
      CORE
    );
    expect(() => blind.draw(frame(), 16)).not.toThrow();
  });
});

describe('ScopeRenderer resize and low power', () => {
  it('rebuilds traces at the new width and wipes old trails after a resize', () => {
    const { renderer, ops, main } = setup({ width: 200 });
    renderer.setVoices([voice(0)]);
    renderer.setEffects(effects({ trails: 0.8 }));
    renderer.draw(frame(), 16);
    const narrow = strokes(ops).pop()!.path!.points;
    ops.length = 0;
    (main.canvas as { width: number }).width = 800;
    renderer.resize();
    expect(ops.map((o) => o.op)).toEqual(['clear']);
    renderer.draw(frame(), 16);
    const wide = strokes(ops).pop()!.path!.points;
    expect(wide.length).toBeGreaterThan(narrow.length);
    expect(Math.max(...wide.map((p) => p[0]))).toBeGreaterThan(200);
  });

  it('wipes trails and the bloom copy when a new track loads', () => {
    const { renderer, ops, bloomOps } = setup();
    renderer.setEffects(effects({ trails: 0.8, bloom: 1 }));
    ops.length = 0;
    bloomOps.length = 0;
    renderer.setVoices([voice(0), voice(1)]);
    expect(ops.filter((o) => o.op === 'clear')).toHaveLength(1);
    expect(bloomOps.filter((o) => o.op === 'clear')).toHaveLength(1);
  });

  it('never copies bloom in low power, however much is asked for', () => {
    const { renderer, bloomOps } = setup({ renderScale: 0.5 });
    renderer.setVoices([voice(0)]);
    renderer.setEffects(effects({ bloom: 1, trails: 0.5 }));
    for (let i = 0; i < 3; i++) renderer.draw(frame(), 16);
    expect(bloomOps.filter((o) => o.op === 'drawImage')).toHaveLength(0);
  });

  it('keeps rings still with reduced motion from the first frame', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    renderer.setLayout('rings');
    renderer.setMotion(false);
    renderer.draw(frame(), 1000);
    const first = strokes(ops)[0].path!.points[0];
    ops.length = 0;
    renderer.draw(frame(), 5000);
    expect(strokes(ops)[0].path!.points[0]).toEqual(first);
  });
});

const swing = (path: FakePath) => Math.max(...path.points.map(([, y]) => Math.abs(y - 150)));
const quietSine = (amplitude: number) => (_v: number, i: number) =>
  amplitude * Math.sin((2 * Math.PI * i) / 64);

describe('ScopeRenderer auto gain', () => {
  it('scales a quiet voice up so its peak reaches 0.9 of the lane', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    ops.length = 0;
    renderer.draw(frame(quietSine(0.1)), 16);
    expect(swing(strokes(ops)[0].path!)).toBeCloseTo(0.9 * 120, 0);
  });

  it('keeps a voice at the silence threshold flat', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    ops.length = 0;
    renderer.draw(frame(quietSine(0.0015)), 16);
    expect(swing(strokes(ops)[0].path!)).toBeLessThan(0.04 * 120);
  });

  it('drops the gain at once when the voice gets loud, so it never clips', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    renderer.draw(frame(quietSine(0.02)), 16);
    ops.length = 0;
    renderer.draw(frame(quietSine(0.3)), 16);
    expect(swing(strokes(ops)[0].path!)).toBeCloseTo(0.9 * 120, 0);
  });

  it('starts fresh for a new voice list', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    renderer.draw(frame(quietSine(0.3)), 16);
    renderer.setVoices([voice(0)]);
    ops.length = 0;
    renderer.draw(frame(quietSine(0.05)), 16);
    expect(swing(strokes(ops)[0].path!)).toBeCloseTo(0.9 * 120, 0);
  });

  it('measures the gain over the triggered window it draws, so a decaying hit does not clip', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    ops.length = 0;
    // A loud wave that stops just before the newest window, which then holds a quiet negative hum:
    // the trigger lands on the last loud rising crossing, so the drawn window still holds loud samples.
    renderer.draw(
      frame((_v, i) => (i < 512 ? 0.3 * Math.sin((2 * Math.PI * i) / 64) : -0.001)),
      16
    );
    const peak = swing(strokes(ops)[0].path!);
    expect(peak).toBeLessThanOrEqual(0.9 * 120 + 0.5);
    expect(peak).toBeGreaterThan(0.85 * 120);
  });

  it('uses the fixed gain when auto gain is off', () => {
    const { renderer, ops } = setup();
    renderer.setVoices([voice(0)]);
    renderer.setAutoGain(false);
    ops.length = 0;
    renderer.draw(frame(quietSine(0.1)), 16);
    expect(swing(strokes(ops)[0].path!)).toBeCloseTo(0.35 * 120, 0);
  });
});
