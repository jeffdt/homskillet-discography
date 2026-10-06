import React, { useCallback, useEffect, useRef } from 'react';
import Spectrogram from '../Spectrogram';
import { visualizerPaletteColors } from '../config/visualizerPalettes';
import { CQT_BINS, CanvasBox, computeStageLayout } from '../shell/stageLayout';
import { AudioGraph } from '../types/playback';
import { UserSettings } from './UserProvider';

interface StageProps {
  audioGraph: AudioGraph | null;
  paused: boolean;
  settings: UserSettings;
  /** Backing-store scale: 1 normally, 0.5 in low-power mode. */
  renderScale: number;
}

/** Applies a computed layout box to a canvas's backing store and CSS box. */
function applyBox(canvas: HTMLCanvasElement, box: CanvasBox): void {
  canvas.width = box.pixelWidth;
  canvas.height = box.pixelHeight;
  canvas.style.left = `${box.left}px`;
  canvas.style.width = `${box.width}px`;
  canvas.style.height = `${box.height}px`;
}

/** Full-window spectrogram and analyzer behind all other UI. */
export default function Stage({ audioGraph, paused, settings, renderScale }: StageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const specRef = useRef<HTMLCanvasElement>(null);
  const freqRef = useRef<HTMLCanvasElement>(null);
  const spectrogramRef = useRef<any>(null);

  const applyLayout = useCallback(() => {
    const container = containerRef.current;
    const spec = specRef.current;
    const freq = freqRef.current;
    if (!container || !spec || !freq) return;
    const layout = computeStageLayout(container.clientWidth, container.clientHeight, renderScale);
    applyBox(spec, layout.spectrogram);
    applyBox(freq, layout.analyzer);
    if (spectrogramRef.current) spectrogramRef.current.setHorizontal(true);
  }, [renderScale]);

  useEffect(() => {
    if (!audioGraph || spectrogramRef.current || !freqRef.current || !specRef.current) return;
    // Spectrogram derives its CQT bin count from the analyzer width at construction time.
    freqRef.current.width = CQT_BINS;
    const spectrogram = new Spectrogram(
      audioGraph.chipCore,
      audioGraph.audioCtx,
      audioGraph.sourceNode,
      freqRef.current,
      specRef.current,
      null
    );
    spectrogram.setWeighting(1);
    spectrogram.setSpeed(2);
    spectrogramRef.current = spectrogram;
    applyLayout();
  }, [audioGraph, applyLayout]);

  useEffect(() => {
    const hasRaf = typeof requestAnimationFrame === 'function';
    let frame = 0;
    const onResize = () => {
      if (!hasRaf) {
        applyLayout();
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(applyLayout);
    };
    applyLayout();
    window.addEventListener('resize', onResize);
    return () => {
      if (hasRaf) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [applyLayout]);

  useEffect(() => {
    const s = spectrogramRef.current;
    if (s) s.setColorPalette(visualizerPaletteColors(settings.visualizerTheme));
  }, [audioGraph, settings.visualizerTheme]);

  useEffect(() => {
    const s = spectrogramRef.current;
    if (s) s.setPeakDecayRate(settings.peakDecayRate ?? 0.98);
  }, [audioGraph, settings.peakDecayRate]);

  useEffect(() => {
    const s = spectrogramRef.current;
    if (s) s.setPeakQuantization(settings.peakQuantization ?? 4);
  }, [audioGraph, settings.peakQuantization]);

  useEffect(() => {
    const s = spectrogramRef.current;
    if (s) s.setPaused(paused);
  }, [audioGraph, paused]);

  useEffect(
    () => () => {
      if (spectrogramRef.current) spectrogramRef.current.setPaused(true);
    },
    []
  );

  return (
    <div ref={containerRef} className="Stage" aria-hidden="true">
      <canvas ref={specRef} className="Stage-spectrogram" />
      <canvas ref={freqRef} className="Stage-analyzer" />
    </div>
  );
}
