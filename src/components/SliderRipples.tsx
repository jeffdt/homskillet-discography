import React, { useEffect, useMemo, useRef } from 'react';
import { PulseMeter } from '../audio/data/PulseMeter';
import { useAudioData } from '../contexts/AudioDataContext';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { RippleField, RippleSettings } from '../visuals/ripples';
import { readCssColor } from '../visuals/spectrogramMath';

interface SliderRipplesProps {
  /** The slider; gets `is-rippling` while a ripple is drawn, which hides the flat fill. */
  host: React.RefObject<HTMLElement>;
  /** The played part of the bar; its width is the playhead's x. */
  fill: React.RefObject<HTMLElement>;
  /** Null turns ripples off. */
  settings: RippleSettings | null;
  /** Playing and not being dragged; false clears every ripple. */
  active: boolean;
}

const RIPPLES_LOOP_ID = 'slider-ripples';
const RIPPLING_CLASS = 'is-rippling';
/** Canvas height when layout reports none (jsdom); matches --charH. */
const FALLBACK_HEIGHT_PX = 19;
/** Matches --railH, so a rippling bar is as thick as the flat one. */
const BAR_THICKNESS_PX = 3;

/**
 * Beat ripples on the progress bar. A FrameLoop consumer feeds the mix's mid-band level to a
 * RippleField and, while any ripple is alive, draws the played part of the bar as a wavy line on
 * a canvas in place of the flat fill. With no ripples alive it draws nothing.
 */
export default function SliderRipples({ host, fill, settings, active }: SliderRipplesProps) {
  const { source } = useAudioData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meter = useMemo(() => new PulseMeter(source.layout), [source.layout]);
  const fieldRef = useRef<RippleField | null>(null);
  if (!fieldRef.current) fieldRef.current = new RippleField();
  const field = fieldRef.current;
  if (settings) field.configure(settings);
  const color = useRef('');
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const enabled = active && settings !== null && !reducedMotion;

  /** Clears the canvas and shows the flat fill again; a no-op unless a ripple was drawn. */
  const stopRippling = () => {
    if (!host.current?.classList.contains(RIPPLING_CLASS)) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    host.current?.classList.remove(RIPPLING_CLASS);
  };

  useFrameLoop(
    RIPPLES_LOOP_ID,
    (frame, dtMs) => {
      const canvas = canvasRef.current;
      const hostElement = host.current;
      if (!canvas || !hostElement) return;
      const playheadX = fill.current?.offsetWidth ?? 0;
      const started = field.step(meter.target(frame.mixSpectrum), playheadX, dtMs);
      if (field.ripples.length === 0) {
        stopRippling();
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (started) color.current = readCssColor('--accent-dark', '#66cb01');
      drawBar(canvas, ctx, hostElement.clientWidth, playheadX, field, color.current);
      hostElement.classList.add(RIPPLING_CLASS);
    },
    { enabled }
  );

  useEffect(() => {
    if (enabled) return;
    field.clear();
    stopRippling();
  }, [enabled, field]);

  return <canvas className="Slider-ripples" ref={canvasRef} aria-hidden="true" />;
}

/** Sizes the canvas to the bar and strokes the played part, displaced by the field. */
function drawBar(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  widthPx: number,
  playheadX: number,
  field: RippleField,
  color: string
): void {
  const dpr = window.devicePixelRatio || 1;
  const heightPx = canvas.clientHeight || FALLBACK_HEIGHT_PX;
  const width = Math.round(widthPx * dpr);
  const height = Math.round(heightPx * dpr);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, widthPx, heightPx);
  const middle = heightPx / 2;
  ctx.beginPath();
  ctx.moveTo(0, middle + field.displacement(0));
  for (let x = 1; x <= playheadX; x++) ctx.lineTo(x, middle + field.displacement(x));
  ctx.lineWidth = BAR_THICKNESS_PX;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = color;
  ctx.stroke();
}
