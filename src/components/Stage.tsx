import React, { useCallback, useEffect, useRef } from 'react';
import { useAudioData } from '../contexts/AudioDataContext';
import { useChannelColors } from '../hooks/useChannelColors';
import { useFrameLoop } from '../hooks/useFrameLoop';
import { useVoices } from '../hooks/useVoices';
import { CanvasBox, computeStageLayout } from '../shell/stageLayout';
import { BinColorizer } from '../visuals/BinColorizer';
import { SPECTROGRAM_SCROLL_PX_PER_S, readCssRgb } from '../visuals/spectrogramMath';
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

/** Full-window channel-colored spectrogram and analyzer behind all other UI, drawn by one FrameLoop consumer. */
export default function Stage({ settings, renderScale }: StageProps) {
  const { source } = useAudioData();
  const voices = useVoices();
  const channelColors = useChannelColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const specRef = useRef<HTMLCanvasElement>(null);
  const freqRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SpectrogramRenderer | null>(null);
  const colorizerRef = useRef<BinColorizer | null>(null);

  useEffect(() => {
    if (!freqRef.current || !specRef.current) return;
    const layout = source.getSpectrumLayout();
    rendererRef.current = new SpectrogramRenderer(
      { analyzer: freqRef.current, spectrogram: specRef.current },
      layout,
      {
        background: readCssRgb('--neutral0', '#101010'),
        highlight: readCssRgb('--neutral4', '#fefefe'),
      }
    );
    colorizerRef.current = new BinColorizer(layout.bins, readCssRgb('--neutral3', '#c3c3c3'));
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
    if (colorizerRef.current) colorizerRef.current.setChannelColors(channelColors);
  }, [source, channelColors]);

  useEffect(() => {
    if (colorizerRef.current) colorizerRef.current.setVoices(voices);
  }, [source, voices]);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.setPeakDecayRate(settings.peakDecayRate ?? 0.98);
  }, [source, settings.peakDecayRate]);

  useEffect(() => {
    if (rendererRef.current)
      rendererRef.current.setPeakQuantization(settings.peakQuantization ?? 4);
  }, [source, settings.peakQuantization]);

  useFrameLoop('stage-spectrogram', (frame, dtMs) => {
    const renderer = rendererRef.current;
    const colorizer = colorizerRef.current;
    if (!renderer || !colorizer) return;
    // The speed is in CSS pixels; the canvas backing store is renderScale times that.
    renderer.draw(
      frame.mixSpectrum,
      colorizer.update(frame, dtMs),
      dtMs,
      SPECTROGRAM_SCROLL_PX_PER_S * renderScale
    );
  });

  return (
    <div ref={containerRef} className="Stage" aria-hidden="true">
      <canvas ref={specRef} className="Stage-spectrogram" />
      <canvas ref={freqRef} className="Stage-analyzer" />
    </div>
  );
}
