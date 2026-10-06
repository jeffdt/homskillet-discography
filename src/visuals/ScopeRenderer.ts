import { VoiceFrame, VoiceInfo } from '../audio/data/contract';
import { DEFAULT_SCOPE_SPAN, scopeSpanOf } from '../config/stageSettings';
import { GHOST_ALPHA, LANE_FILL, SCOPE_POINT_PX, findTrigger, laneBox } from './scopeMath';

interface Lane {
  index: number;
  audible: boolean;
}

/** Full-window oscilloscopes: one lane per voice of the loaded track, in its channel color. */
export class ScopeRenderer {
  private readonly ctx: CanvasRenderingContext2D | null;
  private colors: readonly string[] = [];
  private lanes: Lane[] = [];
  private span = DEFAULT_SCOPE_SPAN;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly background: string,
    private readonly lineWidth: number
  ) {
    this.ctx = canvas.getContext('2d');
  }

  /** Channel colors indexed by voice (from useChannelColors). */
  setColors(colors: readonly string[]): void {
    this.colors = colors;
  }

  /** The voices to draw, top to bottom; inaudible ones are drawn as ghosts. */
  setVoices(voices: readonly VoiceInfo[]): void {
    this.lanes = voices.map((voice) => ({ index: voice.index, audible: voice.audible }));
  }

  /** Samples per trace; values the zoom does not offer fall back to the default. */
  setSpan(span: number): void {
    this.span = scopeSpanOf(span);
  }

  /** Clears the canvas and strokes every lane from the frame's waveforms. */
  draw(frame: VoiceFrame): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width, height } = this.canvas;
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, width, height);
    const count = this.lanes.length;
    if (!count || !width) return;
    const points = Math.max(2, Math.floor(width / SCOPE_POINT_PX) + 1);
    const xStep = width / (points - 1);
    const sampleStep = this.span / (points - 1);
    ctx.lineWidth = this.lineWidth;
    ctx.lineJoin = 'round';
    for (let lane = 0; lane < count; lane++) {
      const { index, audible } = this.lanes[lane];
      const voice = frame.voices[index];
      const color = this.colors[index];
      if (!voice || !color) continue;
      const box = laneBox(lane, count, height);
      const mid = box.top + box.height / 2;
      const amplitude = (box.height * LANE_FILL) / 2;
      const waveform = voice.waveform;
      const last = waveform.length - 1;
      const start = findTrigger(waveform, this.span);
      ctx.globalAlpha = audible ? 1 : GHOST_ALPHA;
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let p = 0; p < points; p++) {
        const sample = waveform[Math.min(last, start + Math.floor(p * sampleStep))] || 0;
        const clamped = sample > 1 ? 1 : sample < -1 ? -1 : sample;
        const x = p * xStep;
        const y = mid - clamped * amplitude;
        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
