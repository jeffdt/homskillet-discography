import React, { useCallback, useEffect, useRef } from 'react';
import { visualizerPaletteColors } from '../config/visualizerPalettes';
import { useAudioData } from '../contexts/AudioDataContext';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { CanvasBox, computeStageLayout } from '../shell/stageLayout';
import { SPECTROGRAM_SCROLL_PX_PER_S, readCssColor } from '../visuals/spectrogramMath';
import { SpectrogramRenderer } from '../visuals/SpectrogramRenderer';
import { UserSettings } from './UserProvider';

interface StageProps {
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

/** Full-window spectrogram and analyzer behind all other UI, drawn by one FrameLoop consumer. */
export default function Stage({ settings, renderScale }: StageProps) {
  const { source } = useAudioData();
  const containerRef = useRef<HTMLDivElement>(null);
  const specRef = useRef<HTMLCanvasElement>(null);
  const freqRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SpectrogramRenderer | null>(null);

  useEffect(() => {
    if (!freqRef.current || !specRef.current) return;
    rendererRef.current = new SpectrogramRenderer(
      { analyzer: freqRef.current, spectrogram: specRef.current },
      source.getSpectrumLayout(),
      readCssColor('--neutral0', '#101010')
    );
  }, [source]);

  const applyLayout = useCallback(() => {
    const container = containerRef.current;
    const spec = specRef.current;
    const freq = freqRef.current;
    if (!container || !spec || !freq) return;
    const layout = computeStageLayout(container.clientWidth, container.clientHeight, renderScale);
    applyBox(spec, layout.spectrogram);
    applyBox(freq, layout.analyzer);
    if (rendererRef.current) rendererRef.current.resize();
  }, [renderScale]);

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
    if (rendererRef.current)
      rendererRef.current.setColorPalette(visualizerPaletteColors(settings.visualizerTheme));
  }, [source, settings.visualizerTheme]);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.setPeakDecayRate(settings.peakDecayRate ?? 0.98);
  }, [source, settings.peakDecayRate]);

  useEffect(() => {
    if (rendererRef.current)
      rendererRef.current.setPeakQuantization(settings.peakQuantization ?? 4);
  }, [source, settings.peakQuantization]);

  useFrameLoop('stage-spectrogram', (frame, dtMs) => {
    // The speed is in CSS pixels; the canvas backing store is renderScale times that.
    if (rendererRef.current)
      rendererRef.current.draw(frame.mixSpectrum, dtMs, SPECTROGRAM_SCROLL_PX_PER_S * renderScale);
  });

  return (
    <div ref={containerRef} className="Stage" aria-hidden="true">
      <canvas ref={specRef} className="Stage-spectrogram" />
      <canvas ref={freqRef} className="Stage-analyzer" />
    </div>
  );
}
