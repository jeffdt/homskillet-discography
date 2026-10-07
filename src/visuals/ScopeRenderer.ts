import { VOICE_PAIRS } from '../audio/constants';
import { VoiceFrame, VoiceInfo } from '../audio/data/contract';
import { DEFAULT_SCOPE_SPAN, ScopeLayoutId, scopeSpanOf } from '../config/stageSettings';
import {
  FlashFollower,
  GHOST_ALPHA,
  RING_SPEED_RAD_PER_MS,
  TraceBuffer,
  buildTrace,
  createTraceBuffer,
  reactiveEnergy,
  traceCapacity,
  trailFade,
  voiceLevel,
} from './scopeMath';

interface Lane {
  index: number;
  audible: boolean;
}

/** The look of the scopes (spec 4.3); lineWidth is in CSS pixels. */
export interface ScopeEffects {
  trails: number;
  glow: number;
  bloom: number;
  reactivity: number;
  lineWidth: number;
  core: boolean;
  fill: boolean;
}

/** Today's plain scopes. */
export const NO_EFFECTS: ScopeEffects = {
  trails: 0,
  glow: 0,
  bloom: 0,
  reactivity: 0,
  lineWidth: 2,
  core: false,
  fill: false,
};

/** Glow strokes, widest first: width as a multiple of the line, alpha per unit of glow gain. */
export const GLOW_PASSES: readonly { width: number; alpha: number }[] = [
  { width: 8, alpha: 0.05 },
  { width: 4, alpha: 0.12 },
  { width: 2, alpha: 0.25 },
];

/** The one glow stroke drawn on low-power devices. */
export const LOW_POWER_GLOW_PASSES: readonly { width: number; alpha: number }[] = [GLOW_PASSES[1]];

/** The bloom canvas is this many times smaller than the scope canvas on each side. */
export const BLOOM_SCALE = 4;

/** Factories the tests replace (there is no Path2D or canvas in Node). */
export interface ScopeRendererDeps {
  createPath?: () => Path2D;
  createCanvas?: () => HTMLCanvasElement;
}

/**
 * Full-window oscilloscopes, one trace per voice of the loaded track, in four layouts. Each trace is
 * built once per frame and stroked in passes that add light ('lighter'): glow, the line, a white
 * core. Trails fade the transparent canvas instead of wiping it; bloom copies a small version of
 * it to a canvas the stylesheet blurs. Low power (renderScale below 1) skips bloom and draws one
 * glow pass.
 */
export class ScopeRenderer {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly bloomCtx: CanvasRenderingContext2D | null;
  private readonly half: HTMLCanvasElement | null;
  private readonly halfCtx: CanvasRenderingContext2D | null;
  private readonly createPath: () => Path2D;
  private readonly lowPower: boolean;
  private readonly flash = new FlashFollower(VOICE_PAIRS);
  private trace: TraceBuffer = createTraceBuffer(0);
  private colors: readonly string[] = [];
  private lanes: Lane[] = [];
  private span = DEFAULT_SCOPE_SPAN;
  private layout: ScopeLayoutId = 'stacked';
  private effects: ScopeEffects = NO_EFFECTS;
  private motion = true;
  private angle = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly bloomCanvas: HTMLCanvasElement | null,
    readonly renderScale: number,
    private readonly coreColor: string,
    deps: ScopeRendererDeps = {}
  ) {
    this.ctx = canvas.getContext('2d');
    this.createPath = deps.createPath ?? (() => new Path2D());
    this.lowPower = renderScale < 1;
    this.bloomCtx = bloomCanvas ? bloomCanvas.getContext('2d') : null;
    this.half = bloomCanvas
      ? (deps.createCanvas ?? (() => document.createElement('canvas')))()
      : null;
    this.halfCtx = this.half ? this.half.getContext('2d') : null;
    this.resize();
  }

  /** Trace colors indexed by voice: the channel colors, or the accent eight times for Unified. */
  setColors(colors: readonly string[]): void {
    this.colors = colors;
  }

  /** The voices to draw, in lane order; inaudible ones are drawn as ghosts. Wipes the picture. */
  setVoices(voices: readonly VoiceInfo[]): void {
    this.lanes = voices.map((voice) => ({ index: voice.index, audible: voice.audible }));
    this.flash.reset();
    this.clear();
  }

  /** Samples per trace; values the zoom does not offer fall back to the default. */
  setSpan(span: number): void {
    this.span = scopeSpanOf(span);
  }

  /** Where traces go. Wipes the picture when it changes. */
  setLayout(layout: ScopeLayoutId): void {
    if (layout === this.layout) return;
    this.layout = layout;
    this.clear();
  }

  /** Trails, glow, bloom, reactivity, width, core and fill. */
  setEffects(effects: ScopeEffects): void {
    this.effects = effects;
    if (!(effects.bloom > 0) && this.bloomCanvas && this.bloomCtx)
      this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
  }

  /** False stops the rings turning (prefers-reduced-motion). */
  setMotion(enabled: boolean): void {
    this.motion = enabled;
  }

  /** Call after the scope canvas changes size: sizes the trace and bloom buffers and wipes. */
  resize(): void {
    this.trace = createTraceBuffer(traceCapacity(this.canvas.width));
    if (this.bloomCanvas && this.half) {
      this.bloomCanvas.width = Math.max(1, Math.ceil(this.canvas.width / BLOOM_SCALE));
      this.bloomCanvas.height = Math.max(1, Math.ceil(this.canvas.height / BLOOM_SCALE));
      this.half.width = Math.max(1, Math.ceil(this.canvas.width / 2));
      this.half.height = Math.max(1, Math.ceil(this.canvas.height / 2));
    }
    this.clear();
  }

  /** Wipes the scope picture and the bloom copy. */
  clear(): void {
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.bloomCtx && this.bloomCanvas)
      this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
  }

  /** Fades or clears, draws every lane from the frame's waveforms, then refreshes the bloom copy. */
  draw(frame: VoiceFrame, dtMs: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width, height } = this.canvas;
    if (this.motion) this.angle = (this.angle + dtMs * RING_SPEED_RAD_PER_MS) % (2 * Math.PI);
    this.fade(ctx, width, height, dtMs);
    const count = this.lanes.length;
    if (count && width) {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let lane = 0; lane < count; lane++) this.drawLane(ctx, frame, lane, count, dtMs);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.copyBloom();
  }

  private fade(ctx: CanvasRenderingContext2D, width: number, height: number, dtMs: number): void {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (!(this.effects.trails > 0)) {
      ctx.clearRect(0, 0, width, height);
      return;
    }
    // Under destination-out only the fill's alpha matters: it erases that share of every pixel.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = trailFade(this.effects.trails, dtMs);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  }

  private drawLane(
    ctx: CanvasRenderingContext2D,
    frame: VoiceFrame,
    lane: number,
    count: number,
    dtMs: number
  ): void {
    const { index, audible } = this.lanes[lane];
    const voice = frame.voices[index];
    const color = this.colors[index];
    if (!voice || !color) return;
    const { width, height } = this.canvas;
    buildTrace(
      {
        layout: this.layout,
        waveform: voice.waveform,
        span: this.span,
        lane,
        lanes: count,
        width,
        height,
        angle: this.angle,
      },
      this.trace
    );
    const path = this.toPath();
    const fx = this.effects;
    const lineWidth = Math.max(1, fx.lineWidth * this.renderScale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (!audible) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = GHOST_ALPHA;
      ctx.lineWidth = lineWidth;
      ctx.stroke(path);
      return;
    }
    const flash = this.flash.update(index, voice.rms, dtMs);
    const energy = reactiveEnergy(fx.reactivity, voiceLevel(voice.rms), flash);
    const base = Math.max(1, lineWidth * (1 + 0.9 * energy));
    ctx.globalCompositeOperation = 'lighter';
    if (fx.fill && !Number.isNaN(this.trace.baseline)) {
      ctx.globalAlpha = Math.min(1, 0.14 + 0.1 * energy);
      ctx.fill(this.toFillPath());
    }
    const gain = fx.glow * (1 - 0.5 * fx.reactivity + energy);
    if (gain > 0) {
      for (const pass of this.lowPower ? LOW_POWER_GLOW_PASSES : GLOW_PASSES) {
        ctx.globalAlpha = Math.min(1, pass.alpha * gain);
        ctx.lineWidth = base * pass.width;
        ctx.stroke(path);
      }
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = base;
    ctx.stroke(path);
    if (fx.core) {
      ctx.strokeStyle = this.coreColor;
      ctx.globalAlpha = 0.55 + 0.35 * Math.min(1, energy);
      ctx.lineWidth = Math.max(0.75, 0.4 * base);
      ctx.stroke(path);
    }
  }

  private toPath(): Path2D {
    const path = this.createPath();
    const { xs, ys, count, closed } = this.trace;
    for (let k = 0; k < count; k++) {
      if (k === 0) path.moveTo(xs[k], ys[k]);
      else path.lineTo(xs[k], ys[k]);
    }
    if (closed) path.closePath();
    return path;
  }

  private toFillPath(): Path2D {
    const path = this.toPath();
    const { xs, count, baseline } = this.trace;
    path.lineTo(xs[count - 1], baseline);
    path.lineTo(xs[0], baseline);
    path.closePath();
    return path;
  }

  private copyBloom(): void {
    const { bloomCanvas, bloomCtx, half, halfCtx } = this;
    if (!bloomCanvas || !bloomCtx || !half || !halfCtx) return;
    if (this.lowPower || !(this.effects.bloom > 0)) return;
    // Two halving steps, so thin lines survive the shrink instead of aliasing away.
    halfCtx.globalCompositeOperation = 'copy';
    halfCtx.drawImage(this.canvas, 0, 0, half.width, half.height);
    bloomCtx.globalCompositeOperation = 'copy';
    bloomCtx.drawImage(half, 0, 0, bloomCanvas.width, bloomCanvas.height);
  }
}
